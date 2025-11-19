import { getConnection } from "../db.js";
import sql from "mssql";

export const getOrdenes = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query("SELECT * FROM ordenes");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrdenById = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM ordenes WHERE id = @id");
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createOrden = async (req, res) => {
  try {
    const { fecha, id_proveedor, id_empleado, detalle, total, forma_pago, observaciones, estado } = req.body;
    
    if (!fecha || !id_proveedor || !id_empleado || !detalle || !total) {
      return res.status(400).json({ error: "Campos requeridos faltantes" });
    }

    const pool = await getConnection();
    const result = await pool
      .request()
      .input("fecha", sql.Date, fecha)
      .input("id_proveedor", sql.Int, id_proveedor)
      .input("id_empleado", sql.Int, id_empleado)
      .input("detalle", sql.NVarChar, JSON.stringify(detalle))
      .input("total", sql.Decimal(10, 2), total)
      .input("forma_pago", sql.NVarChar(50), forma_pago || "Efectivo")
      .input("observaciones", sql.NVarChar, observaciones || null)
      .input("estado", sql.NVarChar(50), estado || "Pendiente")
      .query(`
        INSERT INTO ordenes (fecha, id_proveedor, id_empleado, detalle, total, forma_pago, observaciones, estado)
        OUTPUT INSERTED.*
        VALUES (@fecha, @id_proveedor, @id_empleado, @detalle, @total, @forma_pago, @observaciones, @estado)
      `);
    
    const orden = result.recordset[0];
    orden.detalle = JSON.parse(orden.detalle);
    res.status(201).json(orden);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOrden = async (req, res) => {
  try {
    const { fecha, id_proveedor, id_empleado, detalle, total, forma_pago, observaciones, estado } = req.body;
    
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .input("fecha", sql.Date, fecha)
      .input("id_proveedor", sql.Int, id_proveedor)
      .input("id_empleado", sql.Int, id_empleado)
      .input("detalle", sql.NVarChar, JSON.stringify(detalle))
      .input("total", sql.Decimal(10, 2), total)
      .input("forma_pago", sql.NVarChar(50), forma_pago)
      .input("observaciones", sql.NVarChar, observaciones)
      .input("estado", sql.NVarChar(50), estado)
      .query(`
        UPDATE ordenes
        SET fecha = @fecha, id_proveedor = @id_proveedor, id_empleado = @id_empleado,
            detalle = @detalle, total = @total, forma_pago = @forma_pago,
            observaciones = @observaciones, estado = @estado
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }
    
    const orden = result.recordset[0];
    orden.detalle = JSON.parse(orden.detalle);
    res.json(orden);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOrden = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM ordenes WHERE id = @id");
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }
    res.json({ message: "Orden eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};