import { getConnection } from "../db.js";
import sql from "mssql";

/**
 * GET /cotizaciones
 * Filtros opcionales: ?solicitudId=&estado=&proveedorId=
 * Devuelve nombres enriquecidos: proveedorNombre, empleadoNombre, productoNombre
 */
export const getCotizaciones = async (req, res) => {
  const { solicitudId, estado, proveedorId } = req.query || {};
  try {
    const pool = await getConnection();
    const rs = await pool.request()
      .input("solicitudId", sql.Int, solicitudId ? Number(solicitudId) : null)
      .input("estado",      sql.NVarChar(50), estado ?? null)
      .input("proveedorId", sql.Int, proveedorId ? Number(proveedorId) : null)
      .query(`
        SELECT c.*,
               prv.nombre   AS proveedorNombre,
               s.id         AS solicitudId,
               emp.nombre   AS empleadoNombre,
               prod.nombre  AS productoNombre
        FROM dbo.cotizaciones c
        LEFT JOIN dbo.proveedores       prv ON prv.id = c.proveedorId     OR prv.id = c.id_proveedor     -- compatibilidad
        LEFT JOIN dbo.solicitudes_compra s  ON s.id  = c.solicitudId
        LEFT JOIN dbo.empleados         emp ON emp.id = s.empleadoId       OR emp.id = c.id_empleado     -- compatibilidad
        LEFT JOIN dbo.productos         prod ON prod.id = s.productoId
        WHERE (@solicitudId IS NULL OR c.solicitudId = @solicitudId)
          AND (@estado      IS NULL OR c.estado       = @estado)
          AND (@proveedorId IS NULL OR c.proveedorId  = @proveedorId OR c.id_proveedor = @proveedorId)
        ORDER BY c.fecha DESC, c.id DESC;
      `);

    return res.json(rs.recordset);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * GET /cotizaciones/:id
 * Devuelve una cotización con nombres enriquecidos
 */
export const getCotizacionById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const rs = await pool.request()
      .input("id", sql.Int, Number(id))
      .query(`
        SELECT TOP 1 c.*,
               prv.nombre   AS proveedorNombre,
               s.id         AS solicitudId,
               emp.nombre   AS empleadoNombre,
               prod.nombre  AS productoNombre
        FROM dbo.cotizaciones c
        LEFT JOIN dbo.proveedores       prv ON prv.id = c.proveedorId     OR prv.id = c.id_proveedor
        LEFT JOIN dbo.solicitudes_compra s  ON s.id  = c.solicitudId
        LEFT JOIN dbo.empleados         emp ON emp.id = s.empleadoId       OR emp.id = c.id_empleado
        LEFT JOIN dbo.productos         prod ON prod.id = s.productoId
        WHERE c.id = @id;
      `);

    if (rs.recordset.length === 0) {
      return res.status(404).json({ error: "Cotización no encontrada" });
    }
    return res.json(rs.recordset[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * POST /cotizaciones
 * CRUD admin (se mantiene tal cual lo tenías)
 * body: { fecha, id_proveedor, id_empleado, total_estimado, observaciones?, estado? }
 */
export const createCotizacion = async (req, res) => {
  try {
    const { fecha, id_proveedor, id_empleado, total_estimado, observaciones, estado } = req.body;

    if (!fecha || !id_proveedor || !id_empleado || total_estimado == null) {
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("fecha",          sql.Date, fecha)
      .input("id_proveedor",   sql.Int, Number(id_proveedor))
      .input("id_empleado",    sql.Int, Number(id_empleado))
      .input("total_estimado", sql.Decimal(18, 2), Number(total_estimado))
      .input("observaciones",  sql.NVarChar(2000), observaciones || null)
      .input("estado",         sql.NVarChar(50), estado || "Pendiente")
      .query(`
        INSERT INTO dbo.cotizaciones (fecha, id_proveedor, id_empleado, total_estimado, observaciones, estado)
        OUTPUT INSERTED.*
        VALUES (@fecha, @id_proveedor, @id_empleado, @total_estimado, @observaciones, @estado);
      `);

    return res.status(201).json(result.recordset[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /cotizaciones/:id
 * CRUD admin (se mantiene)
 */
export const updateCotizacion = async (req, res) => {
  const { id } = req.params;
  const { fecha, id_proveedor, id_empleado, total_estimado, observaciones, estado } = req.body;

  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id",             sql.Int, Number(id))
      .input("fecha",          sql.Date, fecha)
      .input("id_proveedor",   sql.Int, id_proveedor != null ? Number(id_proveedor) : null)
      .input("id_empleado",    sql.Int, id_empleado  != null ? Number(id_empleado)  : null)
      .input("total_estimado", sql.Decimal(18, 2), total_estimado != null ? Number(total_estimado) : null)
      .input("observaciones",  sql.NVarChar(2000), observaciones ?? null)
      .input("estado",         sql.NVarChar(50), estado ?? null)
      .query(`
        UPDATE dbo.cotizaciones
           SET fecha          = COALESCE(@fecha, fecha),
               id_proveedor   = COALESCE(@id_proveedor, id_proveedor),
               id_empleado    = COALESCE(@id_empleado, id_empleado),
               total_estimado = COALESCE(@total_estimado, total_estimado),
               observaciones  = COALESCE(@observaciones, observaciones),
               estado         = COALESCE(@estado, estado)
        OUTPUT INSERTED.*
         WHERE id = @id;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Cotización no encontrada" });
    }
    return res.json(result.recordset[0]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /cotizaciones/:id
 * CRUD admin (se mantiene)
 */
export const deleteCotizacion = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, Number(id))
      .query("DELETE FROM dbo.cotizaciones WHERE id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Cotización no encontrada" });
    }
    return res.json({ message: "Cotización eliminada correctamente" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
export const listarCotizaciones = async (req, res) => {
  const { solicitudId } = req.query || {};
  try {
    const pool = await getConnection();
    const r = await pool.request()
      .input('solicitudId', sql.Int, solicitudId ? Number(solicitudId) : null)
      .query(`
        SELECT c.*,
               prv.nombre  AS proveedorNombre,
               s.empleadoId,
               emp.nombre  AS empleadoNombre,
               s.productoId,
               prod.nombre AS productoNombre
        FROM dbo.cotizaciones c
        LEFT JOIN dbo.proveedores prv ON prv.id = c.proveedorId OR prv.id = c.id_proveedor   -- compatibilidad
        LEFT JOIN dbo.solicitudes_compra s ON s.id = c.solicitudId
        LEFT JOIN dbo.empleados  emp ON emp.id = s.empleadoId  OR emp.id = c.id_empleado     -- compatibilidad
        LEFT JOIN dbo.productos  prod ON prod.id = s.productoId
        WHERE (@solicitudId IS NULL OR c.solicitudId=@solicitudId)
        ORDER BY c.solicitudId DESC, c.id DESC;
      `);
    res.json(r.recordset);
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
};

/** GET /api/procesos/cotizaciones/pendientes  (Gerencia) */
export const listarPendientesGerencia = async (_req, res) => {
  try {
    const pool = await getConnection();
    const r = await pool.request().query(`
      SELECT c.*,
             prv.nombre  AS proveedorNombre,
             s.id        AS solicitudId,
             emp.nombre  AS empleadoNombre,
             prod.nombre AS productoNombre
      FROM dbo.cotizaciones c
      INNER JOIN dbo.solicitudes_compra s ON s.id = c.solicitudId
      LEFT  JOIN dbo.proveedores prv ON prv.id = c.proveedorId OR prv.id = c.id_proveedor
      LEFT  JOIN dbo.empleados  emp ON emp.id = s.empleadoId  OR emp.id = c.id_empleado
      LEFT  JOIN dbo.productos  prod ON prod.id = s.productoId
      WHERE c.estado = N'Recibida'
        AND NOT EXISTS (
          SELECT 1 FROM dbo.cotizaciones x
          WHERE x.solicitudId = c.solicitudId AND x.estado = N'Aprobada'
        )
      ORDER BY c.solicitudId DESC, c.precio ASC;
    `);
    res.json(r.recordset);
  } catch (err) {
    res.status(500).json({ ok:false, error: err.message });
  }
};

/** POST /api/procesos/cotizaciones/:id/aprobar-final  { gerenteId, motivoRechazoOtros? } */
export const aprobarCotizacionFinal = async (req, res) => {
  const { id } = req.params;
  const { gerenteId, motivoRechazoOtros = 'No seleccionada' } = req.body || {};
  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  try {
    await tx.begin();

    const qc = await tx.request().input('id', sql.Int, Number(id)).query(`
      SELECT TOP 1 id, solicitudId, estado
      FROM dbo.cotizaciones WHERE id=@id
    `);
    if (qc.recordset.length === 0) throw new Error('Cotización no encontrada');
    const cot = qc.recordset[0];

    if ((cot.estado || '').toLowerCase() === 'aprobada') {
      await tx.rollback();
      return res.status(409).json({ ok:false, error:'Ya estaba aprobada' });
    }

    // Aprueba la elegida
    await tx.request().input('id', sql.Int, cot.id).query(`
      UPDATE dbo.cotizaciones
      SET estado = N'Aprobada', fecha = GETDATE()
      WHERE id=@id;
    `);

    // Rechaza el resto con motivo
    await tx.request()
      .input('solicitudId', sql.Int, cot.solicitudId)
      .input('id', sql.Int, cot.id)
      .input('motivo', sql.NVarChar(500), motivoRechazoOtros)
      .query(`
        UPDATE dbo.cotizaciones
        SET estado = N'Rechazada',
            rechazoMotivo = @motivo
        WHERE solicitudId = @solicitudId
          AND id <> @id
          AND estado <> N'Rechazada';
      `);

    await tx.commit();
    res.json({
      ok: true,
      message: 'Cotización aprobada por Gerencia. Otras cotizaciones rechazadas.',
      solicitudId: cot.solicitudId,
      cotizacionAprobadaId: cot.id
    });
  } catch (err) {
    try { await tx.rollback(); } catch {}
    res.status(500).json({ ok:false, error: err.message });
  }
};