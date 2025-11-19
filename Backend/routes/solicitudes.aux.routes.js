import { Router } from "express";
import { enviarSolicitudAProveedores } from "../controllers/auxiliar.controller.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = Router();

// Auxiliar de compras
router.post("/:id/enviar-a-proveedores", requireRole(["Auxiliar"]), enviarSolicitudAProveedores);

export default router;
