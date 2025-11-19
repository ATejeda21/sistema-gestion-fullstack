import { getConnection } from "../db.js";
import sql from "mssql";

export const getProductos = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM productos");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProductoById = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM productos WHERE id = @id");
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createProducto = async (req, res) => {
  try {
    const { sku, nombre, unidad, precioUnitario, impuesto, activo } = req.body;
    
    if (!sku || !nombre || !unidad || precioUnitario === undefined || impuesto === undefined) {
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("sku", sql.NVarChar(50), sku)
      .input("nombre", sql.NVarChar(200), nombre)
      .input("unidad", sql.NVarChar(50), unidad)
      .input("precioUnitario", sql.Decimal(10, 2), precioUnitario)
      .input("impuesto", sql.Decimal(5, 2), impuesto)
      .input("activo", sql.NVarChar(10), activo || "Sí")
      .query(`
        INSERT INTO productos (sku, nombre, unidad, precioUnitario, impuesto, activo)
        OUTPUT INSERTED.*
        VALUES (@sku, @nombre, @unidad, @precioUnitario, @impuesto, @activo)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProducto = async (req, res) => {
  try {
    const { sku, nombre, unidad, precioUnitario, impuesto, activo } = req.body;
    
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("sku", sql.NVarChar(50), sku)
      .input("nombre", sql.NVarChar(200), nombre)
      .input("unidad", sql.NVarChar(50), unidad)
      .input("precioUnitario", sql.Decimal(10, 2), precioUnitario)
      .input("impuesto", sql.Decimal(5, 2), impuesto)
      .input("activo", sql.NVarChar(10), activo)
      .query(`
        UPDATE productos
        SET sku = @sku, nombre = @nombre, unidad = @unidad,
            precioUnitario = @precioUnitario, impuesto = @impuesto, activo = @activo
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteProducto = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM productos WHERE id = @id");
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};