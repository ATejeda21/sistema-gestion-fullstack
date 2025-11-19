import { getConnection } from "../db.js";
import sql from "mssql";

/**
 * Gerencia aprueba una cotización FINAL:
 * - Cambia esa cotización a 'Aprobada'
 * - Cambia todas las OTRAS cotizaciones de la misma solicitud a 'Rechazada'
 * - Opcional: marca la solicitud como 'Seleccionada'
 * 
 * POST /api/procesos/cotizaciones/:id/aprobar-final
 * body: { gerenteId? }  // opcional, por si luego quieres auditar
 */
export const aprobarCotizacionFinal = async (req, res) => {
  const { id } = req.params;
  const { gerenteId = null } = req.body || {};

  const pool = await getConnection();
  const tx = new sql.Transaction(pool);
  try {
    await tx.begin();

    // 1) Obtener la cotización y su solicitud
    const q = await tx.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT TOP 1 id, solicitudId, estado
        FROM dbo.cotizaciones
        WHERE id = @id
      `);
    if (q.recordset.length === 0) {
      throw new Error("Cotización no encontrada");
    }
    const { solicitudId } = q.recordset[0];

    // 2) Aprobar la seleccionada
    await tx.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE dbo.cotizaciones
           SET estado = N'Aprobada',
               fecha = GETDATE()
         WHERE id = @id
      `);

    // 3) Rechazar las demás de la misma solicitud
    const rej = await tx.request()
      .input("solicitudId", sql.Int, solicitudId)
      .input("id", sql.Int, id)
      .query(`
        UPDATE dbo.cotizaciones
           SET estado = N'Rechazada'
         WHERE solicitudId = @solicitudId
           AND id <> @id
           AND estado <> N'Aprobada'
      `);

    // 4) Opcional: marcar la solicitud como 'Seleccionada'
    await tx.request()
      .input("solicitudId", sql.Int, solicitudId)
      .query(`
        UPDATE dbo.solicitudes_compra
           SET estado = N'Seleccionada'
         WHERE id = @solicitudId
      `);

    await tx.commit();
    return res.json({
      ok: true,
      message: "Cotización aprobada por Gerencia. Otras cotizaciones rechazadas.",
      solicitudId,
      cotizacionAprobadaId: Number(id),
      cotizacionesRechazadas: rej.rowsAffected?.[0] ?? 0
    });
  } catch (err) {
    try { await tx.rollback(); } catch {}
    return res.status(500).json({ ok:false, error: err.message });
  }
};
