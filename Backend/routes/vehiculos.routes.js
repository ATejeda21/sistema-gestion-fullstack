import { Router } from "express";
import {
  getVehiculos,
  getVehiculoById,
  createVehiculo,
  updateVehiculo,
  deleteVehiculo
} from "../controllers/vehiculos.controller.js";

const router = Router();

router.get("/", getVehiculos);
router.get("/:id", getVehiculoById);
router.post("/", createVehiculo);
router.put("/:id", updateVehiculo);
router.delete("/:id", deleteVehiculo);

export default router;