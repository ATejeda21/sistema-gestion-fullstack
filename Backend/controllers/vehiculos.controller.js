import { getConnection } from "../db.js";
import sql from "mssql";

export const getVehiculos = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM vehiculos");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getVehiculoById = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM vehiculos WHERE id = @id");
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createVehiculo = async (req, res) => {
  try {
    const { marcaModelo, placa, tipo, anio, kilometraje, responsable, estado } = req.body;
    
    if (!marcaModelo || !placa || !tipo || !anio || kilometraje === undefined || !responsable) {
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("marcaModelo", sql.NVarChar(200), marcaModelo)
      .input("placa", sql.NVarChar(20), placa)
      .input("tipo", sql.NVarChar(50), tipo)
      .input("anio", sql.Int, anio)
      .input("kilometraje", sql.Int, kilometraje)
      .input("responsable", sql.NVarChar(200), responsable)
      .input("estado", sql.NVarChar(50), estado || "Operativo")
      .query(`
        INSERT INTO vehiculos (marcaModelo, placa, tipo, anio, kilometraje, responsable, estado)
        OUTPUT INSERTED.*
        VALUES (@marcaModelo, @placa, @tipo, @anio, @kilometraje, @responsable, @estado)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateVehiculo = async (req, res) => {
  try {
    const { marcaModelo, placa, tipo, anio, kilometraje, responsable, estado } = req.body;
    
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("marcaModelo", sql.NVarChar(200), marcaModelo)
      .input("placa", sql.NVarChar(20), placa)
      .input("tipo", sql.NVarChar(50), tipo)
      .input("anio", sql.Int, anio)
      .input("kilometraje", sql.Int, kilometraje)
      .input("responsable", sql.NVarChar(200), responsable)
      .input("estado", sql.NVarChar(50), estado)
      .query(`
        UPDATE vehiculos
        SET marcaModelo = @marcaModelo, placa = @placa, tipo = @tipo,
            anio = @anio, kilometraje = @kilometraje, responsable = @responsable,
            estado = @estado
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteVehiculo = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM vehiculos WHERE id = @id");
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Vehículo no encontrado" });
    }
    res.json({ message: "Vehículo eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};