import { Router } from "express";
import { aprobarCotizacion, registrarRecepcion, revisarReorden } from "../controllers/workflow.controller.js";

const router = Router();

router.post("/cotizaciones/:id/aprobar", aprobarCotizacion);
router.post("/ordenes/:id/recepciones", registrarRecepcion);
router.post("/inventario/revisar-reorden", revisarReorden);

export default router;
