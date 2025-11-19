import { getConnection } from "../db.js";
import sql from "mssql";

export const getInventario = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM inventario");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getInventarioById = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM inventario WHERE id = @id");
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Registro de inventario no encontrado" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createInventario = async (req, res) => {
  try {
    const { id_producto, stock_actual, stock_minimo, ultima_actualizacion, ubicacion } = req.body;
    
    if (!id_producto || stock_actual === undefined || stock_minimo === undefined || !ultima_actualizacion || !ubicacion) {
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id_producto", sql.Int, id_producto)
      .input("stock_actual", sql.Int, stock_actual)
      .input("stock_minimo", sql.Int, stock_minimo)
      .input("ultima_actualizacion", sql.Date, ultima_actualizacion)
      .input("ubicacion", sql.NVarChar(200), ubicacion)
      .query(`
        INSERT INTO inventario (id_producto, stock_actual, stock_minimo, ultima_actualizacion, ubicacion)
        OUTPUT INSERTED.*
        VALUES (@id_producto, @stock_actual, @stock_minimo, @ultima_actualizacion, @ubicacion)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateInventario = async (req, res) => {
  try {
    const { id_producto, stock_actual, stock_minimo, ultima_actualizacion, ubicacion } = req.body;
    
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("id_producto", sql.Int, id_producto)
      .input("stock_actual", sql.Int, stock_actual)
      .input("stock_minimo", sql.Int, stock_minimo)
      .input("ultima_actualizacion", sql.Date, ultima_actualizacion)
      .input("ubicacion", sql.NVarChar(200), ubicacion)
      .query(`
        UPDATE inventario
        SET id_producto = @id_producto, stock_actual = @stock_actual,
            stock_minimo = @stock_minimo, ultima_actualizacion = @ultima_actualizacion,
            ubicacion = @ubicacion
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Registro de inventario no encontrado" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteInventario = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM inventario WHERE id = @id");
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Registro de inventario no encontrado" });
    }
    res.json({ message: "Registro de inventario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};