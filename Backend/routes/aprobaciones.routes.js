import { Router } from "express";
import {
  getAprobaciones,
  getAprobacionById,
  createAprobacion,
  updateAprobacion,
  deleteAprobacion
} from "../controllers/aprobaciones.controller.js";

const router = Router();

router.get("/", getAprobaciones);
router.get("/:id", getAprobacionById);
router.post("/", createAprobacion);
router.put("/:id", updateAprobacion);
router.delete("/:id", deleteAprobacion);

export default router;