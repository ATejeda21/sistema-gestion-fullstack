import { getConnection } from "../db.js";
import sql from "mssql";

export const getEmpleados = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM empleados");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmpleadoById = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM empleados WHERE id = @id");
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createEmpleado = async (req, res) => {
  try {
    const { nombre, cargo, departamento, telefono, email, estado } = req.body;
    
    if (!nombre || !cargo || !departamento || !telefono || !email) {
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("nombre", sql.NVarChar(200), nombre)
      .input("cargo", sql.NVarChar(100), cargo)
      .input("departamento", sql.NVarChar(100), departamento)
      .input("telefono", sql.NVarChar(20), telefono)
      .input("email", sql.NVarChar(100), email)
      .input("estado", sql.NVarChar(50), estado || "Activo")
      .query(`
        INSERT INTO empleados (nombre, cargo, departamento, telefono, email, estado)
        OUTPUT INSERTED.*
        VALUES (@nombre, @cargo, @departamento, @telefono, @email, @estado)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateEmpleado = async (req, res) => {
  try {
    const { nombre, cargo, departamento, telefono, email, estado } = req.body;
    
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("nombre", sql.NVarChar(200), nombre)
      .input("cargo", sql.NVarChar(100), cargo)
      .input("departamento", sql.NVarChar(100), departamento)
      .input("telefono", sql.NVarChar(20), telefono)
      .input("email", sql.NVarChar(100), email)
      .input("estado", sql.NVarChar(50), estado)
      .query(`
        UPDATE empleados
        SET nombre = @nombre, cargo = @cargo, departamento = @departamento,
            telefono = @telefono, email = @email, estado = @estado
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteEmpleado = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM empleados WHERE id = @id");
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }
    res.json({ message: "Empleado eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};