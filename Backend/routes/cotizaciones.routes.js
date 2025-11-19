import { Router } from "express";
import { requireRole } from "../middlewares/role.middleware.js";

// === PROCESO (flujo de negocio) ===
// Auxiliar registra cotización (validando vínculo solicitud↔proveedor y 1x proveedor)
import { registrarCotizacion } from "../controllers/auxiliar.controller.js";

// Listados con nombres + aprobar final (viven en el mismo cotizaciones.controller.js)
import {
  listarCotizaciones,         // GET /  (?solicitudId=)  [Empleado/Jefe/Auxiliar/Gerencia]
  listarPendientesGerencia,   // GET /pendientes         [Gerencia]
  aprobarCotizacionFinal,     // POST /:id/aprobar-final [Gerencia]

  // === CRUD admin opcional ===
  getCotizaciones as adminGetCotizaciones,
  getCotizacionById as adminGetCotizacionById,
  createCotizacion as adminCreateCotizacion,
  updateCotizacion as adminUpdateCotizacion,
  deleteCotizacion as adminDeleteCotizacion
} from "../controllers/cotizaciones.controller.js";

const router = Router();

/**
 * === NEGOCIO (proceso) ===
 * - POST /                  -> Auxiliar registra una cotización (con reglas)
 * - GET  /?solicitudId=     -> Listado con nombres (visible para todo el proceso)
 * - GET  /pendientes        -> Gerencia ve cotizaciones 'Recibida' sin aprobada (sin buscar)
 * - POST /:id/aprobar-final -> Gerencia aprueba una y auto-rechaza el resto (con motivo)
 */
router.post("/", requireRole(["Auxiliar"]), registrarCotizacion);
router.get("/", requireRole(["Empleado","Jefe","Auxiliar","Gerencia"]), listarCotizaciones);
router.get("/pendientes", requireRole(["Gerencia"]), listarPendientesGerencia);
router.post("/:id/aprobar-final", requireRole(["Gerencia"]), aprobarCotizacionFinal);

/**
 * === CRUD ADMIN (opcional) ===
 * Lo dejo bajo /admin para no mezclar con el flujo de negocio.
 */
router.get("/admin", requireRole(["Jefe","Gerencia"]), adminGetCotizaciones);
router.get("/admin/:id", requireRole(["Jefe","Gerencia"]), adminGetCotizacionById);
router.post("/admin", requireRole(["Jefe","Gerencia"]), adminCreateCotizacion);
router.put("/admin/:id", requireRole(["Jefe","Gerencia"]), adminUpdateCotizacion);
router.delete("/admin/:id", requireRole(["Jefe","Gerencia"]), adminDeleteCotizacion);

export default router;
