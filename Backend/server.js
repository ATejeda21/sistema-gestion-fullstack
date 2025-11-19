import workflowRoutes from './routes/workflow.routes.js';
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import proveedoresRoutes from "./routes/proveedores.routes.js";
import empleadosRoutes from "./routes/empleados.routes.js";
import vehiculosRoutes from "./routes/vehiculos.routes.js";
import productosRoutes from "./routes/productos.routes.js";
import cotizacionesRoutes from "./routes/cotizaciones.routes.js";
import aprobacionesRoutes from "./routes/aprobaciones.routes.js";
import ordenesRoutes from "./routes/ordenes.routes.js";
import entregasRoutes from "./routes/entregas.routes.js";
import notificacionesProveedorRoutes from "./routes/notificacionesProveedor.routes.js";
import notificacionesProductosRoutes from "./routes/notificacionesProductos.routes.js";
import inventarioRoutes from "./routes/inventario.routes.js";
import solicitudesRoutes from './routes/solicitudes.routes.js';
import solicitudesAuxRoutes from './routes/solicitudes.aux.routes.js';
import ordenesProcRoutes from "./routes/ordenes.proc.routes.js";
import reportesRoutes from "./routes/reportes.routes.js";




dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("✅ Backend funcionando!"));

// Catálogos
app.use("/proveedores", proveedoresRoutes);
app.use("/empleados", empleadosRoutes);
app.use("/vehiculos", vehiculosRoutes);
app.use("/productos", productosRoutes);

// Procesos
app.use("/api/procesos/cotizaciones", cotizacionesRoutes);
app.use("/aprobaciones", aprobacionesRoutes);
app.use("/ordenes", ordenesRoutes);
app.use("/entregas", entregasRoutes);
app.use("/notificaciones-productos", notificacionesProductosRoutes);
app.use("/inventario", inventarioRoutes);
app.use('/api/procesos/solicitudes', solicitudesRoutes);
app.use('/api/procesos/solicitudes', solicitudesAuxRoutes); 
app.use("/api/procesos/ordenes", ordenesProcRoutes);
app.use("/api/procesos/notificaciones-proveedor", notificacionesProveedorRoutes);

app.use("/api/reportes", reportesRoutes);




const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
app.use('/api/workflow', workflowRoutes);
