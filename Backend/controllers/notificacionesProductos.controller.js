import { getConnection } from "../db.js";
import sql from "mssql";

export const getNotificacionesProductos = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM notificaciones_productos");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNotificacionProductoById = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM notificaciones_productos WHERE id = @id");
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createNotificacionProducto = async (req, res) => {
  try {
    const { id_producto, tipo, cantidad_afectada, fecha, observaciones } = req.body;
    
    if (!id_producto || !tipo || !cantidad_afectada || !fecha) {
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id_producto", sql.Int, id_producto)
      .input("tipo", sql.NVarChar(100), tipo)
      .input("cantidad_afectada", sql.Int, cantidad_afectada)
      .input("fecha", sql.Date, fecha)
      .input("observaciones", sql.NVarChar, observaciones || null)
      .query(`
        INSERT INTO notificaciones_productos (id_producto, tipo, cantidad_afectada, fecha, observaciones)
        OUTPUT INSERTED.*
        VALUES (@id_producto, @tipo, @cantidad_afectada, @fecha, @observaciones)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateNotificacionProducto = async (req, res) => {
  try {
    const { id_producto, tipo, cantidad_afectada, fecha, observaciones } = req.body;
    
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("id_producto", sql.Int, id_producto)
      .input("tipo", sql.NVarChar(100), tipo)
      .input("cantidad_afectada", sql.Int, cantidad_afectada)
      .input("fecha", sql.Date, fecha)
      .input("observaciones", sql.NVarChar, observaciones)
      .query(`
        UPDATE notificaciones_productos
        SET id_producto = @id_producto, tipo = @tipo, cantidad_afectada = @cantidad_afectada,
            fecha = @fecha, observaciones = @observaciones
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteNotificacionProducto = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM notificaciones_productos WHERE id = @id");
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }
    res.json({ message: "Notificación eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};