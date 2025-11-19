import { getConnection } from "../db.js";
import sql from "mssql";

/**
 * Crea una Orden de Compra desde una cotización APROBADA.
 * - Evita duplicados por misma cotización.
 * - Inserta tracking inicial: NoDespachado.
 */
export const crearOCDesdeCotizacion = async (req, res) => {
  const { id } = req.params; // cotizacionId
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    // 1) Obtener cotización
    const qc = await tx.request()
      .input("id", sql.Int, Number(id))
      .query(`
        SELECT TOP 1 id, solicitudId, proveedorId, precio, estado
        FROM dbo.cotizaciones
        WHERE id = @id
      `);

    if (qc.recordset.length === 0) {
      await tx.rollback();
      return res.status(404).json({ ok:false, error:"Cotización no encontrada" });
    }

    const cot = qc.recordset[0];
    if ((cot.estado || "").toLowerCase() !== "aprobada") {
      await tx.rollback();
      return res.status(409).json({ ok:false, error:"La cotización no está en estado 'Aprobada'" });
    }

    // 2) Evitar duplicado
    const existing = await tx.request()
      .input("id", sql.Int, Number(id))
      .query(`SELECT id FROM dbo.ordenes_compra WHERE cotizacionId=@id`);

    if (existing.recordset.length > 0) {
      await tx.rollback();
      return res.status(409).json({ ok:false, error:"Ya existe una Orden de Compra para esta cotización", ordenId: existing.recordset[0].id });
    }

    // 3) Crear OC
    const ocIns = await tx.request()
      .input("cotizacionId", sql.Int, cot.id)
      .input("proveedorId", sql.Int, cot.proveedorId)
      .input("total", sql.Decimal(18,2), cot.precio ?? 0)
      .query(`
        INSERT INTO dbo.ordenes_compra (cotizacionId, proveedorId, total, estado, fecha)
        OUTPUT INSERTED.id
        VALUES (@cotizacionId, @proveedorId, @total, N'Emitida', GETDATE())
      `);

    const ordenId = ocIns.recordset[0].id;

    // 4) Tracking inicial
    await tx.request()
      .input("ordenId", sql.Int, ordenId)
      .input("estado", sql.NVarChar(50), "NoDespachado")
      .input("observaciones", sql.NVarChar(500), null)
      .query(`
        INSERT INTO dbo.oc_tracking (ordenId, estado, fecha, observaciones)
        VALUES (@ordenId, @estado, GETDATE(), @observaciones)
      `);

    await tx.commit();
    return res.json({ ok:true, message:"Orden de Compra creada", ordenId });
  } catch (err) {
    try { await tx.rollback(); } catch {}
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/**
 * Tracking de entrega (Auxiliar)
 * Body: { estado: 'NoDespachado' | 'EnRuta' | 'Entregado', observaciones? }
 * - Inserta registro en oc_tracking
 * - Si estado='Entregado' actualiza ordenes_compra.estado='Entregado'
 */
export const actualizarEstadoOrden = async (req, res) => {
  const { ordenId } = req.params;
  const { estado, observaciones = null } = req.body || {};
  const validos = ["NoDespachado","EnRuta","Entregado"];

  if (!estado || !validos.includes(estado)) {
    return res.status(400).json({ ok:false, error:`estado requerido: ${validos.join("/")}` });
  }

  try {
    const pool = await getConnection();

    // validar OC
    const qo = await pool.request()
      .input("ordenId", sql.Int, Number(ordenId))
      .query(`SELECT TOP 1 id FROM dbo.ordenes_compra WHERE id=@ordenId`);
    if (qo.recordset.length === 0) {
      return res.status(404).json({ ok:false, error:"Orden no encontrada" });
    }

    // insertar tracking
    await pool.request()
      .input("ordenId", sql.Int, Number(ordenId))
      .input("estado", sql.NVarChar(50), estado)
      .input("observaciones", sql.NVarChar(500), observaciones)
      .query(`
        INSERT INTO dbo.oc_tracking (ordenId, estado, fecha, observaciones)
        VALUES (@ordenId, @estado, GETDATE(), @observaciones)
      `);

    // si es Entregado, actualizar OC
    if (estado === "Entregado") {
      await pool.request()
        .input("ordenId", sql.Int, Number(ordenId))
        .query(`UPDATE dbo.ordenes_compra SET estado = N'Entregado' WHERE id=@ordenId`);
    }

    return res.json({ ok:true, message:`Tracking agregado: ${estado}` });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/** Obtener detalle de OC + tracking (enriquecido con nombres) */
export const obtenerOC = async (req, res) => {
  const { ordenId } = req.params;
  try {
    const pool = await getConnection();

    const head = await pool.request()
      .input("ordenId", sql.Int, Number(ordenId))
      .query(`
        SELECT oc.*,
               c.solicitudId, c.precio,
               prv.nombre  AS proveedorNombre,
               s.empleadoId, emp.nombre AS empleadoNombre,
               s.productoId, prod.nombre AS productoNombre
        FROM dbo.ordenes_compra oc
        LEFT JOIN dbo.cotizaciones      c   ON c.id = oc.cotizacionId
        LEFT JOIN dbo.proveedores       prv ON prv.id = oc.proveedorId
        LEFT JOIN dbo.solicitudes_compra s  ON s.id = c.solicitudId
        LEFT JOIN dbo.empleados         emp ON emp.id = s.empleadoId
        LEFT JOIN dbo.productos         prod ON prod.id = s.productoId
        WHERE oc.id=@ordenId
      `);

    if (head.recordset.length === 0) {
      return res.status(404).json({ ok:false, error:"OC no encontrada" });
    }

    const track = await pool.request()
      .input("ordenId", sql.Int, Number(ordenId))
      .query(`
        SELECT * FROM dbo.oc_tracking
        WHERE ordenId=@ordenId
        ORDER BY fecha, id
      `);

    return res.json({ ...head.recordset[0], tracking: track.recordset });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/** Paso 5: Conformidad del Jefe */
export const conformidadJefe = async (req, res) => {
  const { ordenId } = req.params;
  const { jefeId, conforme, observaciones = null } = req.body || {};

  if (!jefeId || typeof conforme !== "boolean") {
    return res.status(400).json({ ok:false, error:"jefeId y conforme (true/false) son requeridos" });
  }

  try {
    const pool = await getConnection();

    // La OC debe estar 'Entregado'
    const oc = await pool.request()
      .input("ordenId", sql.Int, Number(ordenId))
      .query(`SELECT TOP 1 id, estado FROM dbo.ordenes_compra WHERE id=@ordenId`);

    if (oc.recordset.length === 0) {
      return res.status(404).json({ ok:false, error:"OC no encontrada" });
    }
    if ((oc.recordset[0].estado || "").toLowerCase() !== "entregado") {
      return res.status(409).json({ ok:false, error:"La OC aún no está Entregado" });
    }

    // Guardar conformidad
    await pool.request()
      .input("ordenId", sql.Int, Number(ordenId))
      .input("conforme", sql.NVarChar(10), conforme ? "SI" : "NO")
      .input("jefeId", sql.Int, Number(jefeId))
      .input("obs", sql.NVarChar(500), observaciones)
      .query(`
        UPDATE dbo.ordenes_compra
           SET conformidadJefe = @conforme,
               jefeIdConformidad = @jefeId,
               observacionesJefe = @obs
         WHERE id=@ordenId
      `);

    return res.json({ ok:true, message:`Conformidad registrada (${conforme ? "SI":"NO"})` });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/**
 * Paso 5: Notificación del Empleado
 * - Requiere OC 'Entregado' y conformidad del Jefe = 'SI'
 * - Si conforme: crea recepción + detalle + actualiza inventario + guarda movimiento
 */
export const notificarProductoEmpleado = async (req, res) => {
  const { ordenId } = req.params;
  const { empleadoId, conforme, observaciones = null } = req.body || {};

  if (!empleadoId || typeof conforme !== "boolean") {
    return res.status(400).json({ ok:false, error:"empleadoId y conforme (true/false) son requeridos" });
  }

  const pool = await getConnection();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    // 1) Obtener contexto de la OC
    const q = await tx.request()
      .input("ordenId", sql.Int, Number(ordenId))
      .query(`
        SELECT oc.id AS ordenId, oc.estado AS estadoOC,
               c.id AS cotizacionId, c.solicitudId, c.proveedorId, c.precio,
               s.productoId, s.cantidad
        FROM dbo.ordenes_compra oc
        LEFT JOIN dbo.cotizaciones      c ON c.id = oc.cotizacionId
        LEFT JOIN dbo.solicitudes_compra s ON s.id = c.solicitudId
        WHERE oc.id = @ordenId
      `);

    if (q.recordset.length === 0) {
      await tx.rollback();
      return res.status(404).json({ ok:false, error:"OC no encontrada" });
    }

    const row = q.recordset[0];

    // 2) Validar estados
    if ((row.estadoOC || "").toLowerCase() !== "entregado") {
      await tx.rollback();
      return res.status(409).json({ ok:false, error:"La OC aún no está Entregado" });
    }

    const conf = await tx.request()
      .input("ordenId", sql.Int, Number(ordenId))
      .query(`SELECT conformidadJefe FROM dbo.ordenes_compra WHERE id=@ordenId`);

    const confVal = (conf.recordset[0]?.conformidadJefe || "").toUpperCase();
    if (confVal !== "SI") {
      await tx.rollback();
      return res.status(409).json({ ok:false, error:"Falta conformidad del Jefe (SI)" });
    }

    // 3) Registrar notificación del empleado en OC
    await tx.request()
      .input("ordenId", sql.Int, Number(ordenId))
      .input("empleadoId", sql.Int, Number(empleadoId))
      .input("empleadoObs", sql.NVarChar(500), observaciones)
      .input("empleadoConf", sql.NVarChar(10), conforme ? "SI" : "NO")
      .query(`
        UPDATE dbo.ordenes_compra
           SET notificadoEmpleado = @empleadoConf,
               empleadoIdNotifica = @empleadoId,
               observacionesEmpleado = @empleadoObs
         WHERE id=@ordenId
      `);

    // 4) Si NO conforme → terminar sin inventario
    if (!conforme) {
      await tx.commit();
      return res.json({ ok:true, message:"Notificación no conforme registrada (sin entrada a inventario)" });
    }

    // 5) Recepción + detalle
    const recep = await tx.request()
      .input("ordenId", sql.Int, Number(ordenId))
      .input("obs", sql.NVarChar(500), observaciones)
      .query(`
        INSERT INTO dbo.recepciones (ordenId, fecha, observaciones)
        OUTPUT INSERTED.id
        VALUES (@ordenId, GETDATE(), @obs)
      `);
    const recepcionId = recep.recordset[0].id;

    await tx.request()
      .input("recepcionId", sql.Int, recepcionId)
      .input("productoId", sql.Int, row.productoId)
      .input("cantidad", sql.Int, row.cantidad)
      .query(`
        INSERT INTO dbo.recepcion_detalle (recepcionId, productoId, cantidad)
        VALUES (@recepcionId, @productoId, @cantidad)
      `);

    // 6) Inventario (usa cantidadActual)
    const inv = await tx.request()
      .input("productoId", sql.Int, row.productoId)
      .query(`SELECT TOP 1 productoId FROM dbo.inventario WHERE productoId=@productoId`);

    if (inv.recordset.length === 0) {
      await tx.request()
        .input("productoId", sql.Int, row.productoId)
        .input("cantidadActual", sql.Int, row.cantidad)
        .query(`
          INSERT INTO dbo.inventario (productoId, cantidadActual)
          VALUES (@productoId, @cantidadActual)
        `);
    } else {
      await tx.request()
        .input("productoId", sql.Int, row.productoId)
        .input("cant", sql.Int, row.cantidad)
        .query(`
          UPDATE dbo.inventario
             SET cantidadActual = cantidadActual + @cant
           WHERE productoId = @productoId
        `);
    }

    // 7) Movimiento de inventario
    await tx.request()
      .input("productoId", sql.Int, row.productoId)
      .input("tipo", sql.NVarChar(50), "Entrada por compra")
      .input("cantidad", sql.Int, row.cantidad)
      .input("ref", sql.NVarChar(100), `OC:${ordenId}`)
      .query(`
        INSERT INTO dbo.movimientos_inventario (productoId, tipo, cantidad, fecha, referencia)
        VALUES (@productoId, @tipo, @cantidad, GETDATE(), @ref)
      `);

    await tx.commit();
    return res.json({ ok:true, message:"Recepción registrada e inventario actualizado", recepcionId });
  } catch (err) {
    try { await tx.rollback(); } catch {}
    return res.status(500).json({ ok:false, error: err.message });
  }
};
