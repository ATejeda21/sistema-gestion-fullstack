import { Router } from "express";
import {
  getEntregas,
  getEntregaById,
  createEntrega,
  updateEntrega,
  deleteEntrega
} from "../controllers/entregas.controller.js";

const router = Router();

router.get("/", getEntregas);
router.get("/:id", getEntregaById);
router.post("/", createEntrega);
router.put("/:id", updateEntrega);
router.delete("/:id", deleteEntrega);

export default router;