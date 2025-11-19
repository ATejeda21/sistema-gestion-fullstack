import { getConnection } from "../db.js";
import sql from "mssql";

export const getProveedores = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM proveedores");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProveedorById = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM proveedores WHERE id = @id");
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createProveedor = async (req, res) => {
  try {
    const { nombre, nit, direccion, telefono, email, contactoPrincipal, estado } = req.body;
    
    if (!nombre || !nit || !direccion || !telefono || !email || !contactoPrincipal) {
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("nombre", sql.NVarChar(200), nombre)
      .input("nit", sql.NVarChar(20), nit)
      .input("direccion", sql.NVarChar(300), direccion)
      .input("telefono", sql.NVarChar(20), telefono)
      .input("email", sql.NVarChar(100), email)
      .input("contactoPrincipal", sql.NVarChar(200), contactoPrincipal)
      .input("estado", sql.NVarChar(50), estado || "Activo")
      .query(`
        INSERT INTO proveedores (nombre, nit, direccion, telefono, email, contactoPrincipal, estado)
        OUTPUT INSERTED.*
        VALUES (@nombre, @nit, @direccion, @telefono, @email, @contactoPrincipal, @estado)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProveedor = async (req, res) => {
  try {
    const { nombre, nit, direccion, telefono, email, contactoPrincipal, estado } = req.body;
    
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("nombre", sql.NVarChar(200), nombre)
      .input("nit", sql.NVarChar(20), nit)
      .input("direccion", sql.NVarChar(300), direccion)
      .input("telefono", sql.NVarChar(20), telefono)
      .input("email", sql.NVarChar(100), email)
      .input("contactoPrincipal", sql.NVarChar(200), contactoPrincipal)
      .input("estado", sql.NVarChar(50), estado)
      .query(`
        UPDATE proveedores
        SET nombre = @nombre, nit = @nit, direccion = @direccion,
            telefono = @telefono, email = @email, contactoPrincipal = @contactoPrincipal,
            estado = @estado
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteProveedor = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM proveedores WHERE id = @id");
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }
    res.json({ message: "Proveedor eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};