import { Router } from "express";
import { requireRole } from "../middlewares/role.middleware.js";
import {
  repSolicitudesResumen,
  repSolicitudesDetalle,
  repOrdenesPorProveedor,
  repComparativoCotizaciones
} from "../controllers/reportes.controller.js";

const router = Router();

// Roles amplios de lectura (ajusta si gustas)
const ROLES = ["Empleado","Jefe","Auxiliar","Gerencia"];

router.get("/solicitudes/resumen",  requireRole(ROLES), repSolicitudesResumen);
router.get("/solicitudes/detalle",  requireRole(ROLES), repSolicitudesDetalle);
router.get("/ordenes/proveedores",  requireRole(ROLES), repOrdenesPorProveedor);
router.get("/cotizaciones/comparativo", requireRole(ROLES), repComparativoCotizaciones);

export default router;
