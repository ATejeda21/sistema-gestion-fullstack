import { Router } from "express";
import { requireRole } from "../middlewares/role.middleware.js";
import {
  crearOCDesdeCotizacion,
  actualizarEstadoOrden,
  obtenerOC,
  conformidadJefe,
  notificarProductoEmpleado
} from "../controllers/ordenes.proc.controller.js";

const router = Router();

// Crear OC desde cotización aprobada (Auxiliar)
router.post("/desde-cotizacion/:id", requireRole(["Auxiliar"]), crearOCDesdeCotizacion);

// Tracking de OC (Auxiliar)
router.post("/:ordenId/estado", requireRole(["Auxiliar"]), actualizarEstadoOrden);

// Ver detalle de OC (todos los roles del proceso)
router.get("/:ordenId", requireRole(["Empleado","Jefe","Auxiliar","Gerencia"]), obtenerOC);

// Conformidad del Jefe (post-entrega)
router.post("/:ordenId/conformidad-jefe", requireRole(["Jefe"]), conformidadJefe);

// Empleado notifica producto (crea recepción + inventario si conforme)
router.post("/:ordenId/notificar-producto", requireRole(["Empleado"]), notificarProductoEmpleado);

export default router;
