import { Router } from "express";
import {
  getNotificacionesProductos,
  getNotificacionProductoById,
  createNotificacionProducto,
  updateNotificacionProducto,
  deleteNotificacionProducto
} from "../controllers/notificacionesProductos.controller.js";

const router = Router();

router.get("/", getNotificacionesProductos);
router.get("/:id", getNotificacionProductoById);
router.post("/", createNotificacionProducto);
router.put("/:id", updateNotificacionProducto);
router.delete("/:id", deleteNotificacionProducto);

export default router;