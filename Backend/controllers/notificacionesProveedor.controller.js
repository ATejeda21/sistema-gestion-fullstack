import { getConnection } from "../db.js";
import sql from "mssql";

/**
 * POST /api/procesos/notificaciones-proveedor/:ordenId
 * Rol: Jefe
 * Body: { jefeId, resultado: "Bien"|"Mal", observaciones? }
 * Usa tu tabla existente: notificaciones_proveedor (id_proveedor, id_orden, tipo, mensaje, fecha_envio)
 */
export const notificarProveedor = async (req, res) => {
  const { ordenId } = req.params;
  const { jefeId, resultado, observaciones = null } = req.body || {};
  const valores = ["Bien", "Mal"];

  if (!jefeId || !resultado || !valores.includes(resultado)) {
    return res.status(400).json({ ok:false, error:`jefeId y resultado (${valores.join("/")}) son requeridos` });
  }

  try {
    const pool = await getConnection();

    // 1) Validar OC y obtener proveedor
    const q = await pool.request()
      .input("ordenId", sql.Int, Number(ordenId))
      .query(`
        SELECT TOP 1 oc.id, oc.estado, oc.proveedorId
        FROM dbo.ordenes_compra oc
        WHERE oc.id = @ordenId
      `);

    if (q.recordset.length === 0) {
      return res.status(404).json({ ok:false, error:"OC no encontrada" });
    }

    const oc = q.recordset[0];
    if ((oc.estado || "").toLowerCase() !== "entregado") {
      return res.status(409).json({ ok:false, error:"La OC aún no está 'Entregado'" });
    }

    // 2) Insertar notificación en tu tabla actual
    const ins = await pool.request()
      .input("id_proveedor", sql.Int, Number(oc.proveedorId))
      .input("id_orden", sql.Int, Number(ordenId))
      .input("tipo", sql.NVarChar(100), resultado)          // 'Bien' | 'Mal'
      .input("mensaje", sql.NVarChar, observaciones)        // nullable
      .input("fecha_envio", sql.Date, new Date())           // GETDATE() equivalente
      .query(`
        INSERT INTO dbo.notificaciones_proveedor (id_proveedor, id_orden, tipo, mensaje, fecha_envio)
        OUTPUT INSERTED.id
        VALUES (@id_proveedor, @id_orden, @tipo, @mensaje, @fecha_envio)
      `);

    return res.json({ ok:true, message:"Notificación al proveedor registrada", notificacionId: ins.recordset[0].id });
  } catch (error) {
    return res.status(500).json({ ok:false, error: error.message });
  }
};

/**
 * GET /api/procesos/notificaciones-proveedor?ordenId=
 * Roles: Empleado/Jefe/Auxiliar/Gerencia
 * Devuelve notificaciones con nombres: proveedor, producto, empleado y jefe
 */
export const listarNotificacionesProveedor = async (req, res) => {
  const { ordenId } = req.query || {};
  try {
    const pool = await getConnection();
    const rs = await pool.request()
      .input("ordenId", sql.Int, ordenId ? Number(ordenId) : null)
      .query(`
        SELECT np.*,
               oc.estado     AS estadoOC,
               prv.nombre    AS proveedorNombre,
               s.id          AS solicitudId,
               prod.nombre   AS productoNombre,
               emp.nombre    AS empleadoNombre,
               j.nombre      AS jefeNombre
        FROM dbo.notificaciones_proveedor np
        LEFT JOIN dbo.ordenes_compra        oc   ON oc.id  = np.id_orden
        LEFT JOIN dbo.proveedores           prv  ON prv.id = np.id_proveedor
        LEFT JOIN dbo.cotizaciones          c    ON c.id   = oc.cotizacionId
        LEFT JOIN dbo.solicitudes_compra    s    ON s.id   = c.solicitudId
        LEFT JOIN dbo.productos             prod ON prod.id = s.productoId
        LEFT JOIN dbo.empleados             emp  ON emp.id = s.empleadoId
        LEFT JOIN dbo.empleados             j    ON j.id   = oc.jefeIdConformidad  -- si lo tienes
        WHERE (@ordenId IS NULL OR np.id_orden = @ordenId)
        ORDER BY np.fecha_envio DESC, np.id DESC
      `);

    return res.json(rs.recordset);
  } catch (error) {
    return res.status(500).json({ ok:false, error: error.message });
  }
};

/**
 * GET /api/procesos/notificaciones-proveedor/:id
 * Devuelve una notificación con nombres
 */
export const obtenerNotificacionProveedor = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getConnection();
    const rs = await pool.request()
      .input("id", sql.Int, Number(id))
      .query(`
        SELECT TOP 1 np.*,
               oc.estado     AS estadoOC,
               prv.nombre    AS proveedorNombre,
               s.id          AS solicitudId,
               prod.nombre   AS productoNombre,
               emp.nombre    AS empleadoNombre
        FROM dbo.notificaciones_proveedor np
        LEFT JOIN dbo.ordenes_compra        oc   ON oc.id  = np.id_orden
        LEFT JOIN dbo.proveedores           prv  ON prv.id = np.id_proveedor
        LEFT JOIN dbo.cotizaciones          c    ON c.id   = oc.cotizacionId
        LEFT JOIN dbo.solicitudes_compra    s    ON s.id   = c.solicitudId
        LEFT JOIN dbo.productos             prod ON prod.id = s.productoId
        LEFT JOIN dbo.empleados             emp  ON emp.id = s.empleadoId
        WHERE np.id = @id
      `);

    if (rs.recordset.length === 0) {
      return res.status(404).json({ ok:false, error: "Notificación no encontrada" });
    }
    return res.json(rs.recordset[0]);
  } catch (error) {
    return res.status(500).json({ ok:false, error: error.message });
  }
};
