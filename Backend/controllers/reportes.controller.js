import { getConnection } from "../db.js";
import sql from "mssql";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

/* ============ Helpers comunes ============ */

const parseRange = (q) => {
  const desde = q.desde ? new Date(q.desde) : null;
  const hasta = q.hasta ? new Date(q.hasta) : null;
  return { desde, hasta };
};

const fmtDate = (d) => {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const summarizeFilters = (title, extra = {}) => {
  const parts = [];
  if (extra.desde) parts.push(`Desde: ${fmtDate(extra.desde)}`);
  if (extra.hasta) parts.push(`Hasta: ${fmtDate(extra.hasta)}`);
  if (extra.categoria) parts.push(`Categoría: ${extra.categoria}`);
  if (extra.empleadoNombre) parts.push(`Empleado: ${extra.empleadoNombre}`);
  if (extra.productoNombre) parts.push(`Producto: ${extra.productoNombre}`);
  if (extra.proveedorId) parts.push(`ProveedorId: ${extra.proveedorId}`);
  if (extra.productoLike) parts.push(`Producto contiene: "${extra.productoLike}"`);
  const sub = parts.join("   |   ");
  return { title, subtitle: sub };
};

/* ============ Export a Excel (1 hoja) ============ */
const sendXlsx = async (res, rows, sheetName = "Reporte") => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  if (rows && rows.length) {
    ws.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k }));
    rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true };
    ws.columns.forEach((c) => {
      if (!c) return;
      const hdr = (c.header || "").toString();
      c.width = Math.min(Math.max(hdr.length, 12), 40);
    });
  } else {
    ws.addRow(["Sin datos"]);
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${sheetName}.xlsx`);
  await wb.xlsx.write(res);
  res.end();
};

/* ============ Export a PDF (mejorado, sin librerías extra) ============ */
/**
 * sendPdfTable(res, { title, subtitle, rows, columns })
 * - rows: array de objetos
 * - columns: [{ key, label, width? }]  width es proporcional (suma ~1.0). Opcional.
 *   Si no se pasa columns, usa las keys de rows[0].
 */
const sendPdfTable = (res, { title = "Reporte", subtitle = "", rows = [], columns = [] }) => {
  const doc = new PDFDocument({ size: "A4", margin: 32 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${title}.pdf`);
  doc.pipe(res);

  // Encabezado
  doc.fontSize(18).text(title, { underline: true });
  if (subtitle) {
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor("#555555").text(subtitle);
    doc.fillColor("black");
  }
  doc.moveDown(0.5);

  if (!rows || rows.length === 0) {
    doc.fontSize(12).text("Sin datos.");
    doc.end();
    return;
  }

  // Columnas por defecto si no vienen definidas
  const keys = columns.length ? columns.map((c) => c.key) : Object.keys(rows[0]);
  const labels = {};
  if (!columns.length) {
    columns = keys.map((k) => ({ key: k, label: k }));
  } else {
    columns.forEach((c) => (labels[c.key] = c.label));
  }

  // Anchos proporcionales si no están definidos (reparte según longitud estimada)
  const estimateLen = (k) => {
    const label = (labels[k] || k).toString();
    let maxLen = label.length;
    for (let i = 0; i < Math.min(30, rows.length); i++) {
      const v = rows[i]?.[k];
      const s = (v == null ? "" : String(v)).toString();
      maxLen = Math.max(maxLen, s.length);
    }
    return maxLen;
  };
  const ests = columns.map((c) => ({ key: c.key, label: c.label || c.key, est: c.width ? null : estimateLen(c.key), width: c.width }));
  const totalEst = ests.reduce((acc, c) => acc + (c.width ? 0 : c.est), 0);
  // Área útil
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const tableWidth = right - left;
  const minCol = 40;
  const maxCol = tableWidth * 0.45;

  // Calcula anchos finales
  const colWidths = ests.map((c) => {
    if (c.width) return c.width * tableWidth; // proporcional sugerido
    const w = Math.min(Math.max((c.est / totalEst) * tableWidth, minCol), maxCol);
    return w;
  });

  const headerY = doc.y;
  let x = left;

  // Header row
  doc.fontSize(10).font("Helvetica-Bold");
  columns.forEach((c, idx) => {
    const w = colWidths[idx];
    doc.text(c.label || c.key, x + 2, headerY, { width: w - 4, ellipsis: true });
    x += w;
  });
  const afterHeaderY = doc.y + 4;
  // línea bajo encabezados
  doc.moveTo(left, afterHeaderY).lineTo(right, afterHeaderY).lineWidth(0.5).strokeColor("#999999").stroke();

  // Body
  doc.font("Helvetica").strokeColor("#CCCCCC");
  let y = afterHeaderY + 4;
  const lineHeight = 14;
  const rowPad = 4;

  const drawRow = (row) => {
    let rowHeight = lineHeight; // altura mínima
    // Medir altura real por celdas
    columns.forEach((c, idx) => {
      const text = row[c.key] == null ? "" : String(row[c.key]);
      const w = colWidths[idx] - 4;
      const h = doc.heightOfString(text, { width: w, align: "left" });
      rowHeight = Math.max(rowHeight, h + rowPad);
    });

    // Salto de página si no cabe
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      // Pie de página simple con número de página
      const p = doc.page;
      doc.fontSize(8).fillColor("#777").text(`Página ${p.number}`, left, p.height - p.margins.bottom + 6);
      doc.addPage();
      // reimprimir encabezados
      doc.fontSize(18).text(title, { underline: true });
      if (subtitle) {
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor("#555").text(subtitle);
        doc.fillColor("black");
      }
      doc.moveDown(0.5);
      // encabezado de tabla otra vez
      const _headerY = doc.y;
      let _x = left;
      doc.fontSize(10).font("Helvetica-Bold");
      columns.forEach((c, idx) => {
        const w = colWidths[idx];
        doc.text(c.label || c.key, _x + 2, _headerY, { width: w - 4, ellipsis: true });
        _x += w;
      });
      const _afterHeaderY = doc.y + 4;
      doc.moveTo(left, _afterHeaderY).lineTo(right, _afterHeaderY).lineWidth(0.5).strokeColor("#999").stroke();
      doc.font("Helvetica").strokeColor("#CCC").fillColor("black");
      y = _afterHeaderY + 4;
    }

    // Dibujar celdas
    let cx = left;
    columns.forEach((c, idx) => {
      const text = row[c.key] == null ? "" : String(row[c.key]);
      const w = colWidths[idx];
      doc.text(text, cx + 2, y, { width: w - 4, ellipsis: true });
      // línea vertical tenue
      doc.moveTo(cx + w, y - 2).lineTo(cx + w, y + rowHeight + 2).lineWidth(0.2).strokeColor("#EEEEEE").stroke();
      cx += w;
    });
    y += rowHeight;
    // línea horizontal entre filas
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.2).strokeColor("#EEEEEE").stroke();
    doc.fillColor("black");
  };

  rows.forEach(drawRow);

  // Pie final con página
  const p = doc.page;
  doc.fontSize(8).fillColor("#777").text(`Página ${p.number}`, left, p.height - p.margins.bottom + 6);
  doc.end();
};

/* =========================================================
 * ===================  REPORTES  ==========================
 * =======================================================*/

/* ====== Solicitudes: resumen ====== */
export const repSolicitudesResumen = async (req, res) => {
  const { desde, hasta } = parseRange(req.query);
  try {
    const pool = await getConnection();
    const rq = pool.request()
      .input("desde", sql.Date, desde)
      .input("hasta", sql.Date, hasta);

    const mensual = await rq.query("SELECT * FROM dbo.vw_solicitudes_resumen_mensual ORDER BY anio, mes, categoria");
    const topProd = await pool.request().query("SELECT TOP 20 * FROM dbo.vw_solicitudes_top_productos ORDER BY unidades DESC");
    const porEmp  = await pool.request().query("SELECT * FROM dbo.vw_solicitudes_por_empleado ORDER BY unidades DESC");

    const data = {
      mensual: mensual.recordset,
      topProductos: topProd.recordset,
      porEmpleado: porEmp.recordset
    };

    const fmt = (req.query.format || "json").toLowerCase();
    if (fmt === "xlsx") return sendXlsx(res, data.mensual, "Solicitudes_Resumen");
    if (fmt === "pdf") {
      const { title, subtitle } = summarizeFilters("Solicitudes - Resumen (Mensual)", { desde, hasta });
      const cols = [
        { key: "anio",      label: "Año",      width: 0.10 },
        { key: "mes",       label: "Mes",      width: 0.10 },
        { key: "categoria", label: "Categoría",width: 0.25 },
        { key: "solicitudes", label: "Solicitudes", width: 0.20 },
        { key: "unidades",  label: "Unidades", width: 0.20 }
      ];
      return sendPdfTable(res, { title, subtitle, rows: data.mensual, columns: cols });
    }
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/* ====== Solicitudes: detalle ====== */
export const repSolicitudesDetalle = async (req, res) => {
  const { desde, hasta } = parseRange(req.query);
  const { empleadoNombre, productoNombre, categoria } = req.query || {};
  try {
    const pool = await getConnection();
    const r = await pool.request()
      .input("desde", sql.Date, desde)
      .input("hasta", sql.Date, hasta)
      .input("empleadoNombre", sql.NVarChar(200), empleadoNombre ? `%${empleadoNombre}%` : null)
      .input("productoNombre", sql.NVarChar(200), productoNombre ? `%${productoNombre}%` : null)
      .input("categoria",       sql.NVarChar(100), categoria || null)
      .query(`
        SELECT *
        FROM dbo.vw_solicitudes_base
        WHERE (@empleadoNombre IS NULL OR empleadoNombre LIKE @empleadoNombre)
          AND (@productoNombre IS NULL OR productoNombre LIKE @productoNombre)
          AND (@categoria IS NULL OR categoria = @categoria)
          AND (@desde IS NULL OR CAST(fecha AS date) >= @desde)
          AND (@hasta IS NULL OR CAST(fecha AS date) <= @hasta)
        ORDER BY fecha DESC, id DESC
      `);

    const fmt = (req.query.format || "json").toLowerCase();
    if (fmt === "xlsx") return sendXlsx(res, r.recordset, "Solicitudes_Detalle");
    if (fmt === "pdf") {
      const { title, subtitle } = summarizeFilters("Solicitudes - Detalle", {
        desde, hasta, categoria, empleadoNombre, productoNombre
      });
      const cols = [
        { key: "fecha",          label: "Fecha",        width: 0.15 },
        { key: "empleadoNombre", label: "Empleado",     width: 0.20 },
        { key: "productoNombre", label: "Producto",     width: 0.25 },
        { key: "categoria",      label: "Categoría",    width: 0.15 },
        { key: "cantidad",       label: "Cantidad",     width: 0.10 },
        { key: "estado",         label: "Estado",       width: 0.15 }
      ];
      return sendPdfTable(res, { title, subtitle, rows: r.recordset, columns: cols });
    }
    return res.json(r.recordset);
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/* ====== Órdenes por proveedor ====== */
export const repOrdenesPorProveedor = async (req, res) => {
  const { desde, hasta } = parseRange(req.query);
  const { proveedorId, productoLike } = req.query || {};
  try {
    const pool = await getConnection();

    // RESUMEN filtrado usando vw_ordenes_base
    const sum = await pool.request()
      .input("desde", sql.Date, desde)
      .input("hasta", sql.Date, hasta)
      .input("proveedorId", sql.Int, proveedorId ? Number(proveedorId) : null)
      .input("productoLike", sql.NVarChar(200), productoLike ? `%${productoLike}%` : null)
      .query(`
        SELECT proveedorId, proveedorNombre,
               COUNT(*)                AS ordenes,
               SUM(total)              AS montoTotal,
               SUM(cantidadSolicitada) AS unidadesTotales
        FROM dbo.vw_ordenes_base
        WHERE (@desde IS NULL OR CAST(fechaOC AS date) >= @desde)
          AND (@hasta  IS NULL OR CAST(fechaOC AS date) <= @hasta)
          AND (@proveedorId IS NULL OR proveedorId = @proveedorId)
          AND (@productoLike IS NULL OR productoNombre LIKE @productoLike)
        GROUP BY proveedorId, proveedorNombre
        ORDER BY montoTotal DESC
      `);

    // DETALLE
    const det = await pool.request()
      .input("desde", sql.Date, desde)
      .input("hasta", sql.Date, hasta)
      .input("proveedorId", sql.Int, proveedorId ? Number(proveedorId) : null)
      .input("productoLike", sql.NVarChar(200), productoLike ? `%${productoLike}%` : null)
      .query(`
        SELECT *
        FROM dbo.vw_ordenes_base
        WHERE (@desde IS NULL OR CAST(fechaOC AS date) >= @desde)
          AND (@hasta IS NULL OR CAST(fechaOC AS date) <= @hasta)
          AND (@proveedorId IS NULL OR proveedorId = @proveedorId)
          AND (@productoLike IS NULL OR productoNombre LIKE @productoLike)
        ORDER BY fechaOC DESC, ordenId DESC
      `);

    const data = { resumen: sum.recordset, detalle: det.recordset };
    const fmt = (req.query.format || "json").toLowerCase();
    if (fmt === "xlsx") return sendXlsx(res, data.detalle, "OC_Por_Proveedor");
    if (fmt === "pdf") {
      const { title, subtitle } = summarizeFilters("Órdenes por proveedor (detalle)", {
        desde, hasta, proveedorId, productoLike
      });
      const cols = [
        { key: "fechaOC",        label: "Fecha OC",   width: 0.13 },
        { key: "estadoOC",       label: "Estado",     width: 0.10 },
        { key: "proveedorNombre",label: "Proveedor",  width: 0.22 },
        { key: "productoNombre", label: "Producto",   width: 0.23 },
        { key: "categoria",      label: "Categoría",  width: 0.12 },
        { key: "cantidadSolicitada", label: "Cant.",  width: 0.07 },
        { key: "total",          label: "Total",      width: 0.13 }
      ];
      return sendPdfTable(res, { title, subtitle, rows: data.detalle, columns: cols });
    }
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};

/* ====== Comparativo de cotizaciones ====== */
export const repComparativoCotizaciones = async (req, res) => {
  const { desde, hasta } = parseRange(req.query);
  const { solicitudId, proveedorId, productoLike, ordenId } = req.query || {};
  try {
    const pool = await getConnection();
    let sid = solicitudId ? Number(solicitudId) : null;

    // Si nos pasan ordenId, derivamos solicitudId
    if (!sid && ordenId) {
      const q = await pool.request()
        .input("ordenId", sql.Int, Number(ordenId))
        .query(`
          SELECT s.id AS solicitudId
          FROM dbo.ordenes_compra oc
          LEFT JOIN dbo.cotizaciones c ON c.id = oc.cotizacionId
          LEFT JOIN dbo.solicitudes_compra s ON s.id = c.solicitudId
          WHERE oc.id = @ordenId
        `);
      sid = q.recordset[0]?.solicitudId ?? null;
    }

    const r = await pool.request()
      .input("desde", sql.Date, desde)
      .input("hasta", sql.Date, hasta)
      .input("solicitudId", sql.Int, sid)
      .input("proveedorId", sql.Int, proveedorId ? Number(proveedorId) : null)
      .input("productoLike", sql.NVarChar(200), productoLike ? `%${productoLike}%` : null)
      .query(`
        SELECT *
        FROM dbo.vw_cotizaciones_comparativo
        WHERE (@solicitudId IS NULL OR solicitudId = @solicitudId)
          AND (@proveedorId IS NULL OR proveedorId = @proveedorId)
          AND (@productoLike IS NULL OR productoNombre LIKE @productoLike)
        ORDER BY solicitudId DESC, estado DESC, precio ASC
      `);

    const fmt = (req.query.format || "json").toLowerCase();
    if (fmt === "xlsx") return sendXlsx(res, r.recordset, "Comparativo_Cotizaciones");
    if (fmt === "pdf") {
      const { title, subtitle } = summarizeFilters("Comparativo de cotizaciones", {
        desde, hasta, solicitudId: sid, proveedorId, productoLike, ordenId
      });
      const cols = [
        { key: "solicitudId",     label: "Solicitud",    width: 0.10 },
        { key: "proveedorNombre", label: "Proveedor",    width: 0.18 },
        { key: "precio",          label: "Precio",       width: 0.10 },
        { key: "estado",          label: "Estado",       width: 0.10 },
        { key: "rechazoMotivo",   label: "Motivo rechazo", width: 0.22 },
        { key: "productoNombre",  label: "Producto",     width: 0.18 },
        { key: "empleadoNombre",  label: "Solicitante",  width: 0.12 }
      ];
      return sendPdfTable(res, { title, subtitle, rows: r.recordset, columns: cols });
    }
    return res.json(r.recordset);
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
};
