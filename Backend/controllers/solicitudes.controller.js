import { getConnection } from "../db.js";
import sql from "mssql";

/**
 * Empleado crea Solicitud
 * body: { empleadoId, productoId, cantidad, motivo? }
 * estado inicial: 'Creada'
 */
export const crearSolicitud = async (req, res) => {
  const { empleadoId, productoId, cantidad, motivo = null } = req.body || {};
  if (!empleadoId || !productoId || !cantidad) {
    return res.status(400).json({ ok:false, error: "empleadoId, productoId y cantidad son requeridos" });
  }
  try {
    const pool = await getConnection();
    const r = await pool.request()
      .input("empleadoId", sql.Int, Number(empleadoId))
      .input("productoId", sql.Int, Number(productoId))
      .input("cantidad", sql.Int, Number(cantidad))
      .input("motivo", sql.NVarChar(500), motivo)
      .query(`
        INSERT INTO dbo.solicitudes_compra (empleadoId, productoId, cantidad, motivo, estado, fecha)
        OUTPUT INSERTED.id
        VALUES (@empleadoId, @productoId, @cantidad, @motivo, N'Creada', GETDATE())
      `);
    return res.json({ ok:true, id: r.recordset[0].id });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/**
 * Listar Solicitudes con filtros simples: ?estado=...&empleadoId=...
 * Devuelve también nombres (empleadoNombre, productoNombre)
 */
export const listarSolicitudes = async (req, res) => {
  const { estado, empleadoId } = req.query || {};
  try {
    const pool = await getConnection();
    const rs = await pool.request()
      .input("estado",     sql.NVarChar(50), estado ?? null)
      .input("empleadoId", sql.Int, empleadoId ? Number(empleadoId) : null)
      .query(`
        SELECT s.*,
               p.nombre AS productoNombre,
               e.nombre AS empleadoNombre
        FROM dbo.solicitudes_compra s
        LEFT JOIN dbo.productos  p ON p.id = s.productoId
        LEFT JOIN dbo.empleados  e ON e.id = s.empleadoId
        WHERE (@estado     IS NULL OR s.estado     = @estado)
          AND (@empleadoId IS NULL OR s.empleadoId = @empleadoId)
        ORDER BY s.fecha DESC, s.id DESC;
      `);
    return res.json(rs.recordset);
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/**
 * Jefe modifica solicitud (p.ej. ajusta cantidad/motivo)
 * body: { cantidad?, motivo? }
 * Solo modificable si NO está en estados finales de flujo.
 */
export const modificarSolicitud = async (req, res) => {
  const { id } = req.params;
  const { cantidad = null, motivo = null } = req.body || {};
  try {
    const pool = await getConnection();

    // Validar estado actual
    const current = await pool.request()
      .input("id", sql.Int, Number(id))
      .query("SELECT TOP 1 estado FROM dbo.solicitudes_compra WHERE id=@id");
    if (current.recordset.length === 0) {
      return res.status(404).json({ ok:false, error:"Solicitud no encontrada" });
    }
    const est = (current.recordset[0].estado || "").toLowerCase();
    if (["aprobada","rechazada","enviadaproveedores","cotizada","seleccionada"].includes(est)) {
      return res.status(409).json({ ok:false, error:"No se puede modificar en el estado actual" });
    }

    const r = await pool.request()
      .input("id", sql.Int, Number(id))
      .input("cantidad", sql.Int, cantidad !== null ? Number(cantidad) : null)
      .input("motivo", sql.NVarChar(500), motivo)
      .query(`
        UPDATE dbo.solicitudes_compra
           SET cantidad = COALESCE(@cantidad, cantidad),
               motivo   = COALESCE(@motivo,   motivo),
               estado   = CASE WHEN estado = N'Creada' THEN N'Revisada' ELSE estado END
         WHERE id=@id
      `);
    if (r.rowsAffected[0] === 0) {
      return res.status(404).json({ ok:false, error:"Solicitud no encontrada" });
    }
    return res.json({ ok:true, message:"Solicitud modificada" });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/**
 * Jefe aprueba solicitud
 * body: { jefeId, jefeComentarios? }
 */
export const aprobarSolicitud = async (req, res) => {
  const { id } = req.params;
  const { jefeId, jefeComentarios = null } = req.body || {};
  if (!jefeId) return res.status(400).json({ ok:false, error:"jefeId requerido" });

  try {
    const pool = await getConnection();
    const cur = await pool.request()
      .input("id", sql.Int, Number(id))
      .query("SELECT TOP 1 estado FROM dbo.solicitudes_compra WHERE id=@id");

    if (cur.recordset.length === 0) {
      return res.status(404).json({ ok:false, error:"Solicitud no encontrada" });
    }

    await pool.request()
      .input("id", sql.Int, Number(id))
      .input("jefeIdAprobador", sql.Int, Number(jefeId))
      .input("jefeComentarios", sql.NVarChar(500), jefeComentarios)
      .query(`
        UPDATE dbo.solicitudes_compra
           SET estado = N'Aprobada',
               jefeIdAprobador = @jefeIdAprobador,
               jefeComentarios = @jefeComentarios,
               fechaJefe = GETDATE()
         WHERE id=@id
      `);
    return res.json({ ok:true, message:"Solicitud aprobada" });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/**
 * Jefe rechaza solicitud
 * body: { jefeId, jefeComentarios? }
 */
export const rechazarSolicitud = async (req, res) => {
  const { id } = req.params;
  const { jefeId, jefeComentarios = null } = req.body || {};
  if (!jefeId) return res.status(400).json({ ok:false, error:"jefeId requerido" });

  try {
    const pool = await getConnection();
    const r = await pool.request()
      .input("id", sql.Int, Number(id))
      .input("jefeIdAprobador", sql.Int, Number(jefeId))
      .input("jefeComentarios", sql.NVarChar(500), jefeComentarios)
      .query(`
        UPDATE dbo.solicitudes_compra
           SET estado = N'Rechazada',
               jefeIdAprobador = @jefeIdAprobador,
               jefeComentarios = @jefeComentarios,
               fechaJefe = GETDATE()
         WHERE id=@id
      `);
    if (r.rowsAffected[0] === 0) {
      return res.status(404).json({ ok:false, error:"Solicitud no encontrada" });
    }
    return res.json({ ok:true, message:"Solicitud rechazada" });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};
