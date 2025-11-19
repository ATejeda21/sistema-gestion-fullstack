import { getConnection } from "../db.js";
import sql from "mssql";

export const getAprobaciones = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM aprobaciones");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAprobacionById = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM aprobaciones WHERE id = @id");
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Aprobación no encontrada" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createAprobacion = async (req, res) => {
  try {
    const { id_cotizacion, id_empleado, fecha_aprobacion, estado, comentario } = req.body;
    
    if (!id_cotizacion || !id_empleado || !fecha_aprobacion) {
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id_cotizacion", sql.Int, id_cotizacion)
      .input("id_empleado", sql.Int, id_empleado)
      .input("fecha_aprobacion", sql.Date, fecha_aprobacion)
      .input("estado", sql.NVarChar(50), estado || "Pendiente")
      .input("comentario", sql.NVarChar, comentario || null)
      .query(`
        INSERT INTO aprobaciones (id_cotizacion, id_empleado, fecha_aprobacion, estado, comentario)
        OUTPUT INSERTED.*
        VALUES (@id_cotizacion, @id_empleado, @fecha_aprobacion, @estado, @comentario)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAprobacion = async (req, res) => {
  try {
    const { id_cotizacion, id_empleado, fecha_aprobacion, estado, comentario } = req.body;
    
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("id_cotizacion", sql.Int, id_cotizacion)
      .input("id_empleado", sql.Int, id_empleado)
      .input("fecha_aprobacion", sql.Date, fecha_aprobacion)
      .input("estado", sql.NVarChar(50), estado)
      .input("comentario", sql.NVarChar, comentario)
      .query(`
        UPDATE aprobaciones
        SET id_cotizacion = @id_cotizacion, id_empleado = @id_empleado,
            fecha_aprobacion = @fecha_aprobacion, estado = @estado, comentario = @comentario
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Aprobación no encontrada" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAprobacion = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM aprobaciones WHERE id = @id");
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Aprobación no encontrada" });
    }
    res.json({ message: "Aprobación eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};