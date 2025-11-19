import { getConnection } from "../db.js";
import sql from "mssql";

/**
 * Aprueba una cotización y genera automáticamente una Orden de Compra (OC)
 * Copia el detalle de la cotización hacia la orden y cambia estados.
 * Body opcional: { usuarioAprobadorId }
 */
export const aprobarCotizacion = async (req, res) => {
  const { id } = req.params;
  const { usuarioAprobadorId = null } = req.body || {};
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  try {
    await tx.begin();

    // 1) Validar existencia y estado
    const qCot = await tx.request()
      .input("id", sql.Int, id)
      .query(`SELECT TOP 1 * FROM cotizaciones WHERE id=@id`);
    if (qCot.recordset.length === 0) {
      throw new Error("Cotización no encontrada");
    }
    const cot = qCot.recordset[0];
    if (cot.estado && cot.estado.toLowerCase() === "aprobada") {
      return res.status(409).json({ ok:false, message:"La cotización ya está aprobada" });
    }

    // 2) Cambiar estado a aprobada
    await tx.request()
      .input("id", sql.Int, id)
      .input("usuarioAprobadorId", sql.Int, usuarioAprobadorId)
      .query(`UPDATE cotizaciones SET estado='Aprobada', usuarioAprobadorId=@usuarioAprobadorId, fechaAprobacion=GETDATE() WHERE id=@id`);

    // 3) Crear Orden de Compra
    const ocInsert = await tx.request()
      .input("proveedorId", sql.Int, cot.proveedorId)
      .input("total", sql.Decimal(18,2), cot.total || 0)
      .query(`
        INSERT INTO ordenes_compra (proveedorId, fecha, total, estado)
        OUTPUT INSERTED.id
        VALUES (@proveedorId, GETDATE(), @total, 'Enviada')
      `);
    const ordenId = ocInsert.recordset[0].id;

    // 4) Copiar detalle (si existe tabla cotizacion_detalle y orden_detalle)
    try {
      const det = await tx.request()
        .input("cotizacionId", sql.Int, id)
        .query(`SELECT * FROM cotizacion_detalle WHERE cotizacionId=@cotizacionId`);
      for (const r of det.recordset) {
        await tx.request()
          .input("ordenId", sql.Int, ordenId)
          .input("productoId", sql.Int, r.productoId)
          .input("cantidad", sql.Int, r.cantidad)
          .input("precioUnitario", sql.Decimal(18,2), r.precioUnitario)
          .query(`
            INSERT INTO orden_detalle (ordenId, productoId, cantidad, precioUnitario)
            VALUES (@ordenId, @productoId, @cantidad, @precioUnitario)
          `);
      }
    } catch (e) {
      // Si no existen tablas de detalle, ignorar (flujo mínimo)
    }

    await tx.commit();
    res.json({ ok:true, message:"Cotización aprobada y OC generada", ordenId });
  } catch (err) {
    try { await tx.rollback(); } catch {}
    res.status(500).json({ ok:false, error: err.message });
  }
};

/**
 * Registra una recepción para una orden de compra y actualiza inventario.
 * Body: { items: [{ productoId, cantidadRecibida }], observaciones? }
 */
export const registrarRecepcion = async (req, res) => {
  const { id } = req.params; // ordenId
  const { items = [], observaciones = null } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok:false, message:"Debe enviar items para registrar la recepción" });
  }

  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  try {
    await tx.begin();

    // 1) Validar OC
    const q = await tx.request().input("id", sql.Int, id)
      .query("SELECT TOP 1 * FROM ordenes_compra WHERE id=@id");
    if (q.recordset.length === 0) throw new Error("Orden de compra no encontrada");

    // 2) Insertar encabezado de recepción
    const rcv = await tx.request()
      .input("ordenId", sql.Int, id)
      .input("observaciones", sql.NVarChar(500), observaciones)
      .query(`
        INSERT INTO recepciones (ordenId, fecha, observaciones)
        OUTPUT INSERTED.id
        VALUES (@ordenId, GETDATE(), @observaciones)
      `);
    const recepcionId = rcv.recordset[0].id;

    // 3) Por cada item, actualizar inventario y movimientos
    for (const it of items) {
      const { productoId, cantidadRecibida } = it;
      if (!productoId || !cantidadRecibida) continue;

      // a) detalle recepción
      await tx.request()
        .input("recepcionId", sql.Int, recepcionId)
        .input("productoId", sql.Int, productoId)
        .input("cantidad", sql.Int, cantidadRecibida)
        .query(`
          INSERT INTO recepcion_detalle (recepcionId, productoId, cantidad)
          VALUES (@recepcionId, @productoId, @cantidad)
        `);

      // b) inventario (si existe fila, sumamos; si no, creamos)
      const inv = await tx.request().input("productoId", sql.Int, productoId)
        .query("SELECT TOP 1 * FROM inventario WHERE productoId=@productoId");
      if (inv.recordset.length === 0) {
        await tx.request()
          .input("productoId", sql.Int, productoId)
          .input("cantidadActual", sql.Int, cantidadRecibida)
          .query(`INSERT INTO inventario (productoId, cantidadActual) VALUES (@productoId, @cantidadActual)`);
      } else {
        await tx.request()
          .input("productoId", sql.Int, productoId)
          .input("cant", sql.Int, cantidadRecibida)
          .query(`UPDATE inventario SET cantidadActual = cantidadActual + @cant WHERE productoId=@productoId`);
      }

      // c) movimiento inventario
      try {
        await tx.request()
          .input("productoId", sql.Int, productoId)
          .input("tipo", sql.NVarChar(50), "Entrada por compra")
          .input("cantidad", sql.Int, cantidadRecibida)
          .input("referencia", sql.NVarChar(100), `OC:${id};RCV:${recepcionId}`)
          .query(`
            INSERT INTO movimientos_inventario (productoId, tipo, cantidad, fecha, referencia)
            VALUES (@productoId, @tipo, @cantidad, GETDATE(), @referencia)
          `);
      } catch {}
    }

    // 4) Cerrar OC opcionalmente
    try {
      await tx.request().input("id", sql.Int, id)
        .query(`UPDATE ordenes_compra SET estado='Completada' WHERE id=@id`);
    } catch {}

    await tx.commit();
    res.json({ ok:true, message:"Recepción registrada y inventario actualizado", recepcionId });
  } catch (err) {
    try { await tx.rollback(); } catch {}
    res.status(500).json({ ok:false, error: err.message });
  }
};

/**
 * Revisa niveles mínimos y dispara solicitudes de compra básicas.
 * Si no existen tablas 'solicitudes_compra', el endpoint responde sin error.
 */
export const revisarReorden = async (req, res) => {
  const pool = await getConnection();
  try {
    const low = await pool.request().query(`
      SELECT i.productoId, i.cantidadActual, i.cantidadMinima
      FROM inventario i
      WHERE i.cantidadMinima IS NOT NULL AND i.cantidadActual <= i.cantidadMinima
    `);
    if (low.recordset.length === 0) {
      return res.json({ ok:true, message:"No hay productos bajo mínimo", items: [] });
    }

    const created = [];
    for (const r of low.recordset) {
      try {
        await pool.request()
          .input("productoId", sql.Int, r.productoId)
          .input("cantidadSugerida", sql.Int, Math.max(1, (r.cantidadMinima || 1) * 2))
          .query(`
            IF NOT EXISTS(SELECT 1 FROM solicitudes_compra WHERE productoId=@productoId AND estado='Pendiente')
            BEGIN
              INSERT INTO solicitudes_compra (productoId, cantidadSugerida, fecha, estado)
              VALUES (@productoId, @cantidadSugerida, GETDATE(), 'Pendiente')
            END
          `);
        created.push(r.productoId);
      } catch {}
    }
    res.json({ ok:true, message:"Revisión completada", items: created });
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
};
