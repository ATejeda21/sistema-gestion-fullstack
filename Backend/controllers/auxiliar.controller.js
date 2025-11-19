import { getConnection } from "../db.js";
import sql from "mssql";

/**
 * Auxiliar: Enviar solicitud (Aprobada) a 3 proveedores
 * POST /api/procesos/solicitudes/:id/enviar-a-proveedores
 * body: { auxiliarId, proveedores: [id1,id2,id3] }
 * Efecto:
 *  - Verifica solicitud en estado 'Aprobada'
 *  - Inserta vínculos (solicitud_proveedores) si no existen
 *  - Cambia estado de la solicitud a 'EnviadaAProveedores'
 */
export const enviarSolicitudAProveedores = async (req, res) => {
  const { id } = req.params; // solicitudId
  const { auxiliarId, proveedores = [] } = req.body || {};
  if (!auxiliarId || !Array.isArray(proveedores) || proveedores.length !== 3) {
    return res.status(400).json({ ok:false, error:"auxiliarId y proveedores[3] requeridos" });
  }
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  try {
    await tx.begin();

    // 1) validar solicitud
    const cur = await tx.request().input("id", sql.Int, id)
      .query(`SELECT TOP 1 estado FROM dbo.solicitudes_compra WHERE id=@id`);
    if (cur.recordset.length === 0) {
      throw new Error("Solicitud no encontrada");
    }
    const estado = (cur.recordset[0].estado || "").toLowerCase();
    if (estado !== "aprobada") {
      return res.status(409).json({ ok:false, error:`Estado inválido (${cur.recordset[0].estado}), debe ser 'Aprobada'` });
    }

    // 2) crear vínculos solicitud_proveedores (idempotente)
    for (const pid of proveedores) {
      await tx.request()
        .input("solicitudId", sql.Int, id)
        .input("proveedorId", sql.Int, pid)
        .query(`
          IF NOT EXISTS (
            SELECT 1 FROM dbo.solicitud_proveedores
            WHERE solicitudId=@solicitudId AND proveedorId=@proveedorId
          )
          INSERT INTO dbo.solicitud_proveedores (solicitudId, proveedorId, fechaEnvio)
          VALUES (@solicitudId, @proveedorId, GETDATE());
        `);
    }

    // 3) actualizar estado de solicitud
    await tx.request().input("id", sql.Int, id)
      .query(`UPDATE dbo.solicitudes_compra SET estado = N'EnviadaAProveedores' WHERE id=@id`);

    await tx.commit();
    return res.json({ ok:true, message:"Solicitud enviada a 3 proveedores" });
  } catch (err) {
    try { await tx.rollback(); } catch {}
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/**
 * Auxiliar: Registrar cotización (una por proveedor)
 * POST /api/procesos/cotizaciones
 * body: { solicitudId, proveedorId, precio, tiempoEntrega?, condiciones? }
 * Regla: Solo 1 cotización por (solicitudId, proveedorId).
 * Requiere que exista vínculo en solicitud_proveedores.
 */
export const registrarCotizacion = async (req, res) => {
  const { solicitudId, proveedorId, precio, tiempoEntrega=null, condiciones=null } = req.body || {};
  if (!solicitudId || !proveedorId || precio === undefined) {
    return res.status(400).json({ ok:false, error:"solicitudId, proveedorId y precio son requeridos" });
  }
  try {
    const pool = await getConnection();

    // 1) verificar que la solicitud fue enviada a ese proveedor
    const vinc = await pool.request()
      .input("solicitudId", sql.Int, solicitudId)
      .input("proveedorId", sql.Int, proveedorId)
      .query(`
        SELECT 1 FROM dbo.solicitud_proveedores
        WHERE solicitudId=@solicitudId AND proveedorId=@proveedorId
      `);
    if (vinc.recordset.length === 0) {
      return res.status(409).json({ ok:false, error:"La solicitud no fue enviada a este proveedor" });
    }

    // 2) evitar duplicado de cotización por proveedor
    const dup = await pool.request()
      .input("solicitudId", sql.Int, solicitudId)
      .input("proveedorId", sql.Int, proveedorId)
      .query(`
        SELECT 1 FROM dbo.cotizaciones
        WHERE solicitudId=@solicitudId AND proveedorId=@proveedorId
      `);
    if (dup.recordset.length > 0) {
      return res.status(409).json({ ok:false, error:"Este proveedor ya registró cotización para la solicitud" });
    }

    // 3) insertar cotización
    const ins = await pool.request()
      .input("solicitudId", sql.Int, solicitudId)
      .input("proveedorId", sql.Int, proveedorId)
      .input("precio", sql.Decimal(18,2), precio)
      .input("tiempoEntrega", sql.NVarChar(50), tiempoEntrega)
      .input("condiciones", sql.NVarChar(500), condiciones)
      .query(`
        INSERT INTO dbo.cotizaciones (solicitudId, proveedorId, precio, tiempoEntrega, condiciones, estado, fecha)
        OUTPUT INSERTED.id
        VALUES (@solicitudId, @proveedorId, @precio, @tiempoEntrega, @condiciones, N'Recibida', GETDATE())
      `);

    return res.json({ ok:true, id: ins.recordset[0].id, message:"Cotización registrada" });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/**
 * (Utilidad) Listar cotizaciones por solicitud
 * GET /api/procesos/cotizaciones?solicitudId=#
 */
export const listarCotizaciones = async (req, res) => {
  const { solicitudId } = req.query || {};
  try {
    const pool = await getConnection();
    const r = await pool.request()
      .input("solicitudId", sql.Int, Number(solicitudId || 0))
      .query(`
        SELECT c.*, p.nombre AS proveedorNombre
        FROM dbo.cotizaciones c
        LEFT JOIN dbo.proveedores p ON p.id = c.proveedorId
        WHERE (@solicitudId = 0 OR c.solicitudId = @solicitudId)
        ORDER BY c.fecha DESC, c.id DESC
      `);
    return res.json(r.recordset);
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};
