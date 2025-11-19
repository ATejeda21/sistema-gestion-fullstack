import { Router } from "express";
import {
  crearSolicitud,
  listarSolicitudes,
  modificarSolicitud,
  aprobarSolicitud,
  rechazarSolicitud
} from "../controllers/solicitudes.controller.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = Router();

// Empleado
router.post("/", requireRole(["Empleado"]), crearSolicitud);

// Jefe (y lectura general)
router.get("/", requireRole(["Empleado","Jefe","Auxiliar","Gerencia"]), listarSolicitudes);
router.put("/:id", requireRole(["Jefe"]), modificarSolicitud);
router.post("/:id/aprobar", requireRole(["Jefe"]), aprobarSolicitud);
router.post("/:id/rechazar", requireRole(["Jefe"]), rechazarSolicitud);

export default router;
