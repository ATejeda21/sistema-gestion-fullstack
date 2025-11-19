import { Router } from "express";
import { requireRole } from "../middlewares/role.middleware.js";
import {
  notificarProveedor,
  listarNotificacionesProveedor,
  obtenerNotificacionProveedor
} from "../controllers/notificacionesProveedor.controller.js";

const router = Router();

/**
 * PROCESO:
 * - POST /:ordenId -> Jefe notifica al proveedor (resultado Bien/Mal + observaciones)
 * - GET  /         -> Lista (opcional ?ordenId=) con nombres
 * - GET  /:id      -> Detalle con nombres
 */
router.post("/:ordenId", requireRole(["Jefe"]), notificarProveedor);
router.get("/", requireRole(["Empleado","Jefe","Auxiliar","Gerencia"]), listarNotificacionesProveedor);
router.get("/:id", requireRole(["Empleado","Jefe","Auxiliar","Gerencia"]), obtenerNotificacionProveedor);

export default router;
