import { getConnection } from "../db.js";
import sql from "mssql";

export const getEntregas = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM entregas");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEntregaById = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM entregas WHERE id = @id");
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Entrega no encontrada" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createEntrega = async (req, res) => {
  try {
    const { id_orden, fecha_entrega, id_empleado, id_vehiculo, estado, observaciones } = req.body;
    
    if (!id_orden || !fecha_entrega || !id_empleado || !id_vehiculo) {
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id_orden", sql.Int, id_orden)
      .input("fecha_entrega", sql.Date, fecha_entrega)
      .input("id_empleado", sql.Int, id_empleado)
      .input("id_vehiculo", sql.Int, id_vehiculo)
      .input("estado", sql.NVarChar(50), estado || "Pendiente")
      .input("observaciones", sql.NVarChar, observaciones || null)
      .query(`
        INSERT INTO entregas (id_orden, fecha_entrega, id_empleado, id_vehiculo, estado, observaciones)
        OUTPUT INSERTED.*
        VALUES (@id_orden, @fecha_entrega, @id_empleado, @id_vehiculo, @estado, @observaciones)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateEntrega = async (req, res) => {
  try {
    const { id_orden, fecha_entrega, id_empleado, id_vehiculo, estado, observaciones } = req.body;
    
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("id_orden", sql.Int, id_orden)
      .input("fecha_entrega", sql.Date, fecha_entrega)
      .input("id_empleado", sql.Int, id_empleado)
      .input("id_vehiculo", sql.Int, id_vehiculo)
      .input("estado", sql.NVarChar(50), estado)
      .input("observaciones", sql.NVarChar, observaciones)
      .query(`
        UPDATE entregas
        SET id_orden = @id_orden, fecha_entrega = @fecha_entrega,
            id_empleado = @id_empleado, id_vehiculo = @id_vehiculo,
            estado = @estado, observaciones = @observaciones
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Entrega no encontrada" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteEntrega = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM entregas WHERE id = @id");
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Entrega no encontrada" });
    }
    res.json({ message: "Entrega eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};