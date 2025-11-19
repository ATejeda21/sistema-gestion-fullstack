import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Package, UserSquare, Truck, FileText, DollarSign, Home, Building, Phone, Mail, MapPin, Calendar, User, Settings, Star, Search, Filter, Download, Eye, ArrowLeft, ChevronDown, ChevronRight, CreditCard, Inbox, FileSignature, CheckCircle, Boxes, Send, ClipboardList, ThumbsUp, ThumbsDown, Bell } from 'lucide-react';

// ============================================
// UTILIDADES DE VALIDACIÓN Y SANITIZACIÓN
// ============================================

const TEXT_REGEX = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,-]+$/;

const sanitize = (str) => {
  if (!str) return '';
  return str.replace(/[^\w\s.,-áéíóúÁÉÍÓÚñÑ]/gi, '');
};

const validateText = (value, minLength = 3) => {
  if (!value || value.trim().length < minLength) {
    return { valid: false, message: `Mínimo ${minLength} caracteres` };
  }
  if (!TEXT_REGEX.test(value)) {
    return { valid: false, message: 'Caracteres no permitidos: @#$%^&*<>{}[]' };
  }
  return { valid: true, message: '' };
};

const validateNumber = (value, allowZero = false) => {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { valid: false, message: 'Debe ser un número válido' };
  }
  if (!allowZero && num <= 0) {
    return { valid: false, message: 'Debe ser mayor a 0' };
  }
  if (num < 0) {
    return { valid: false, message: 'No puede ser negativo' };
  }
  return { valid: true, message: '' };
};

const validateDateRange = (desde, hasta) => {
  if (!desde || !hasta) {
    return { valid: false, message: 'Ambas fechas son requeridas' };
  }
  const dateDesde = new Date(desde);
  const dateHasta = new Date(hasta);
  if (dateDesde > dateHasta) {
    return { valid: false, message: 'La fecha "Desde" debe ser menor o igual a "Hasta"' };
  }
  return { valid: true, message: '' };
};

// ============================================
// COMPONENTE DE INPUT VALIDADO
// ============================================

const ValidatedInput = ({ 
  type = 'text', 
  name, 
  label, 
  value, 
  onChange, 
  required = false,
  minLength = 3,
  error = '',
  placeholder = '',
  maxWidth = 'w-full',
  disabled = false,
  ...props 
}) => {
  const [localError, setLocalError] = useState('');
  const [touched, setTouched] = useState(false);

  const handleBlur = () => {
    setTouched(true);
    if (type === 'number') {
      const validation = validateNumber(value);
      setLocalError(validation.valid ? '' : validation.message);
    } else if (type === 'text' || type === 'textarea') {
      const validation = validateText(value, minLength);
      setLocalError(validation.valid ? '' : validation.message);
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (type === 'text' || type === 'textarea') {
      const sanitized = sanitize(newValue);
      onChange({ ...e, target: { ...e.target, value: sanitized, name } });
    } else {
      onChange(e);
    }
    if (touched) {
      setLocalError('');
    }
  };

  const displayError = error || localError;
  const hasError = touched && displayError && required;

  const inputClasses = `bg-slate-700 border ${
    hasError ? 'border-red-500 ring-2 ring-red-500/50' : 'border-slate-600'
  } rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  }`;

  let finalMaxWidth = maxWidth;
  if (maxWidth === 'w-full') {
    if (type === 'number') {
      finalMaxWidth = 'w-full max-w-[150px]';
    } else if (name?.includes('nombre') || name?.includes('descripcion') || name?.includes('motivo')) {
      finalMaxWidth = 'w-full max-w-[300px]';
    } else if (type === 'date') {
      finalMaxWidth = 'w-full max-w-[180px]';
    }
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-white mb-1">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputClasses} w-full`}
          rows={3}
          style={{ maxHeight: '120px', resize: 'vertical' }}
          {...props}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputClasses} ${finalMaxWidth}`}
          {...props}
        />
      )}
      {hasError && (
        <span className="error-text text-red-400 text-xs mt-1 block">
          {displayError}
        </span>
      )}
    </div>
  );
};

// ============================================
// API DE PROCESOS
// ============================================
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

async function request(path, { method='GET', role, body } = {}) {
  const headers = { 'Accept': 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (role) headers['x-role'] = role;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok || (data && data.ok === false)) {
    const msg = (data && data.error) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const api = {
  empleado: {
    crearSolicitud: (payload) =>
      request('/api/procesos/solicitudes', { method: 'POST', role: 'Empleado', body: payload }),
    misSolicitudes: ({ empleadoId, estado } = {}) => {
      const q = new URLSearchParams();
      if (empleadoId) q.set('empleadoId', empleadoId);
      if (estado) q.set('estado', estado);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return request(`/api/procesos/solicitudes${qs}`, { role: 'Empleado' });
    },
    notificarProducto: (ordenId, payload) =>
      request(`/api/procesos/ordenes/${ordenId}/notificar-producto`, { method: 'POST', role: 'Empleado', body: payload }),
  },

  jefe: {
    pendientes: () =>
      request('/api/procesos/solicitudes?estado=Creada', { role: 'Jefe' }),
    modificar: (id, payload) =>
      request(`/api/procesos/solicitudes/${id}`, { method: 'PUT', role: 'Jefe', body: payload }),
    aprobar: (id, payload) =>
      request(`/api/procesos/solicitudes/${id}/aprobar`, { method: 'POST', role: 'Jefe', body: payload }),
    rechazar: (id, payload) =>
      request(`/api/procesos/solicitudes/${id}/rechazar`, { method: 'POST', role: 'Jefe', body: payload }),
    conformidad: (ordenId, payload) =>
      request(`/api/procesos/ordenes/${ordenId}/conformidad-jefe`, { method: 'POST', role: 'Jefe', body: payload }),
  },

  auxiliar: {
    enviarAProveedores: (solicitudId, payload) =>
      request(`/api/procesos/solicitudes/${solicitudId}/enviar-a-proveedores`, { method: 'POST', role: 'Auxiliar', body: payload }),
    registrarCotizacion: (payload) =>
      request('/api/procesos/cotizaciones', { method: 'POST', role: 'Auxiliar', body: payload }),
    crearOCDesdeCotizacion: (cotizacionId) =>
      request(`/api/procesos/ordenes/desde-cotizacion/${cotizacionId}`, { method: 'POST', role: 'Auxiliar' }),
    tracking: (ordenId, payload) =>
      request(`/api/procesos/ordenes/${ordenId}/estado`, { method: 'POST', role: 'Auxiliar', body: payload }),
  },

  gerencia: {
    cotizacionesPorSolicitud: (solicitudId) =>
      request(`/api/procesos/cotizaciones?solicitudId=${encodeURIComponent(solicitudId)}`, { role: 'Gerencia' }),
    aprobarCotizacionFinal: (cotizacionId, payload) =>
      request(`/api/procesos/cotizaciones/${cotizacionId}/aprobar-final`, { method: 'POST', role: 'Gerencia', body: payload }),
  },

  comunes: {
    detalleOC: (ordenId) =>
      request(`/api/procesos/ordenes/${ordenId}`, { role: 'Empleado' }),
  }
};

// ============================================
// API CATÁLOGOS
// ============================================
const API_CONFIG = {
  baseURL: "http://localhost:3001",
  endpoints: {
    proveedores: '/proveedores',
    productos: '/productos',
    empleados: '/empleados',
    vehiculos: '/vehiculos'
  },
};

// ----------------------
// Función para descargar reportes con header x-role
// ----------------------
const descargarReporte = async (rutaRelativa, nombreArchivo, formato = 'xlsx', rol = 'Gerencia') => {
  try {
    const url = `${BASE}/api/reportes/${rutaRelativa}?format=${encodeURIComponent(formato)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/octet-stream',
        'x-role': rol
      }
    });

    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try {
        const jd = await res.json();
        errText = jd?.error || jd?.message || errText;
      } catch (e) {}
      throw new Error(errText);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Error descargarReporte:', err);
    alert('❌ No se pudo generar el reporte: ' + err.message);
  }
};


const catalogoService = {
  getAll: async (endpoint) => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints[endpoint]}`);
      if (!response.ok) throw new Error(`Error fetching ${endpoint}`);
      return await response.json();
    } catch (error) {
      console.error(`Error en getAll(${endpoint}):`, error);
      return [];
    }
  },

  getById: async (endpoint, id) => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints[endpoint]}/${id}`);
      if (!response.ok) throw new Error(`Error fetching ${endpoint}/${id}`);
      return await response.json();
    } catch (error) {
      console.error(`Error en getById(${endpoint}, ${id}):`, error);
      return null;
    }
  },

  create: async (endpoint, data) => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints[endpoint]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`Error creating ${endpoint}`);
      return await response.json();
    } catch (error) {
      console.error(`Error en create(${endpoint}):`, error);
      return null;
    }
  },

  update: async (endpoint, id, data) => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints[endpoint]}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`Error updating ${endpoint}/${id}`);
      return await response.json();
    } catch (error) {
      console.error(`Error en update(${endpoint}, ${id}):`, error);
      return null;
    }
  },

  delete: async (endpoint, id) => {
    try {
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints[endpoint]}/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`Error deleting ${endpoint}/${id}`);
      return true;
    } catch (error) {
      console.error(`Error en delete(${endpoint}, ${id}):`, error);
      return false;
    }
  }
};

// ============================================
// ICONOS
// ============================================
const FilledBuilding = ({ className = "w-8 h-8", color = "#3b82f6" }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
      <path d="M12 2L2 7v14a2 2 0 002 2h16a2 2 0 002-2V7l-10-5z"/>
      <path d="M7 11h2v2H7zM11 11h2v2h-2zM15 11h2v2h-2zM7 15h2v2H7zM11 15h2v2h-2zM15 15h2v2h-2z" fill="white"/>
    </svg>
  </div>
);

const FilledUser = ({ className = "w-8 h-8", color = "#f59e0b" }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
      <circle cx="12" cy="8" r="5"/>
      <path d="M20 21a8 8 0 1 0-16 0h16z"/>
    </svg>
  </div>
);

const FilledTruck = ({ className = "w-8 h-8", color = "#ef4444" }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5" fill="white"/>
      <circle cx="18.5" cy="18.5" r="2.5" fill="white"/>
    </svg>
  </div>
);

const FilledPackage = ({ className = "w-8 h-8", color = "#8b5cf6" }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
      <path d="m7.5 4.27 4.5 2.6 4.5-2.6L21 6v10l-4.5 2.6-4.5-2.6L7.5 18.6 3 16V6l4.5-1.73Z"/>
      <path d="m8 5 4 2.3V21l-4-2.3V5Z" fill="white"/>
      <path d="m16 7.3-4-2.3v13.4l4 2.3V7.3Z" fill="white"/>
    </svg>
  </div>
);

const FilledHome = ({ className = "w-8 h-8", color = "#22c55e" }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <path d="M9 22V12h6v10" fill="white"/>
    </svg>
  </div>
);

const FilledFile = ({ className = "w-8 h-8", color = "#06b6d4" }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z"/>
      <path d="M13 2v7h7" fill="white"/>
      <path d="M8 13h8M8 17h8M8 9h2" stroke="white" strokeWidth="2" fill="none"/>
    </svg>
  </div>
);

const FilledDollar = ({ className = "w-8 h-8", color = "#10b981" }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
      <circle cx="12" cy="12" r="10"/>
      <path d="M16 8h-4V6h-2v2H8l1 2h6v4H9l-1 2h2v2h2v-2h4l-1-2h-6v-4h6l1-2z" fill="white"/>
    </svg>
  </div>
);

const FilledSettings = ({ className = "w-8 h-8", color = "#64748b" }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  </div>
);

const FilledPhone = ({ className = "w-5 h-5", color = "#22c55e" }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
    </svg>
  </div>
);

const FilledMail = ({ className = "w-5 h-5", color = "#3b82f6" }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6" stroke="white" strokeWidth="2" fill="none"/>
    </svg>
  </div>
);

const FilledCalendar = ({ className = "w-5 h-5", color = "#8b5cf6" }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 24 24" fill={color} width="100%" height="100%">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="white" strokeWidth="2"/>
      <line x1="8" y1="2" x2="8" y2="6" stroke="white" strokeWidth="2"/>
      <line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="2"/>
    </svg>
  </div>
);

// ============================================
// MÓDULOS DE PROCESO CON VALIDACIONES
// ============================================

const EmpleadoProceso = ({ api, showMessage, productos }) => {
  const [formSolicitudEmpleado, setFormSolicitudEmpleado] = useState({
    productoId: '',
    cantidad: 1,
    motivo: ''
  });
  const [solicitudes, setSolicitudes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleCrearSolicitud = async (e) => {
    e.preventDefault();
    
    // Validaciones
    const newErrors = {};
    
    if (!formSolicitudEmpleado.productoId) {
      newErrors.productoId = 'Producto es requerido';
    }
    
    const cantidadValidation = validateNumber(formSolicitudEmpleado.cantidad);
    if (!cantidadValidation.valid) {
      newErrors.cantidad = cantidadValidation.message;
    }
    
    const motivoValidation = validateText(formSolicitudEmpleado.motivo, 10);
    if (!motivoValidation.valid) {
      newErrors.motivo = motivoValidation.message;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showMessage('error', '❌ Por favor corrija los errores en el formulario');
      return;
    }
    
    setIsSaving(true);
    try {
      const empleadoId = 1;
      const result = await api.empleado.crearSolicitud({
        empleadoId,
        productoId: parseInt(formSolicitudEmpleado.productoId),
        cantidad: parseInt(formSolicitudEmpleado.cantidad),
        motivo: sanitize(formSolicitudEmpleado.motivo)
      });
      showMessage('success', `✅ Solicitud #${result.id || result.solicitudId} creada exitosamente`);
      setFormSolicitudEmpleado({ productoId: '', cantidad: 1, motivo: '' });
      setErrors({});
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerMisSolicitudes = async () => {
    try {
      const empleadoId = 1;
      const data = await api.empleado.misSolicitudes({ empleadoId });
      setSolicitudes(data || []);
      showMessage('success', `✅ ${data?.length || 0} solicitudes cargadas`);
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormSolicitudEmpleado(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="w-6 h-6 text-green-400" />
          Crear Solicitud de Compra
        </h2>
        <form onSubmit={handleCrearSolicitud} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Producto <span className="text-red-400">*</span>
            </label>
            <select
              name="productoId"
              className={`w-full max-w-[300px] bg-slate-700 border ${errors.productoId ? 'border-red-500' : 'border-slate-600'} rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500`}
              value={formSolicitudEmpleado.productoId}
              onChange={handleInputChange}
              required
            >
              <option value="">Seleccionar producto...</option>
              {productos?.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            {errors.productoId && (
              <span className="error-text text-red-400 text-xs mt-1 block">{errors.productoId}</span>
            )}
          </div>
          
          <ValidatedInput
            type="number"
            name="cantidad"
            label="Cantidad"
            value={formSolicitudEmpleado.cantidad}
            onChange={handleInputChange}
            required
            min="1"
            placeholder="Ej: 5"
            error={errors.cantidad}
            maxWidth="w-full"
          />
          
          <ValidatedInput
            type="textarea"
            name="motivo"
            label="Motivo"
            value={formSolicitudEmpleado.motivo}
            onChange={handleInputChange}
            required
            minLength={10}
            placeholder="Describa el motivo de la solicitud (mínimo 10 caracteres)"
            error={errors.motivo}
          />
          
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full max-w-[200px] bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isSaving ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </form>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-400" />
          Mis Solicitudes
        </h2>
        <button 
          className="w-full max-w-[220px] bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 mb-4"
          onClick={handleVerMisSolicitudes}
        >
          <Eye className="w-4 h-4" />
          Cargar Mis Solicitudes
        </button>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {solicitudes.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No hay solicitudes para mostrar</p>
          ) : (
            solicitudes.map((sol) => (
              <div key={sol.id} className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-white">Solicitud #{sol.id}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    sol.estado === 'Creada' ? 'bg-yellow-500/20 text-yellow-400' :
                    sol.estado === 'Aprobada' ? 'bg-green-500/20 text-green-400' :
                    sol.estado === 'Rechazada' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {sol.estado}
                  </span>
                </div>
                <p className="text-slate-300 text-sm">Producto: {sol.productoNombre || 'N/A'}</p>
                <p className="text-slate-300 text-sm">Cantidad: {sol.cantidad}</p>
                <p className="text-slate-400 text-xs mt-1">{sol.motivo}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const JefeProceso = ({ api, showMessage, productos }) => {
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [formModificacion, setFormModificacion] = useState({ 
    id: '', 
    productoId: '',
    cantidad: '',
    motivo: '' 
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleCargarPendientes = async () => {
    try {
      const data = await api.jefe.pendientes();
      setSolicitudesPendientes(data || []);
      showMessage('success', `✅ ${data?.length || 0} solicitudes pendientes cargadas`);
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    }
  };

  const handleModificar = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!formModificacion.id) {
      newErrors.id = 'ID de solicitud es requerido';
    }
    
    if (formModificacion.cantidad) {
      const validation = validateNumber(formModificacion.cantidad);
      if (!validation.valid) {
        newErrors.cantidad = validation.message;
      }
    }
    
    if (formModificacion.motivo) {
      const validation = validateText(formModificacion.motivo, 3);
      if (!validation.valid) {
        newErrors.motivo = validation.message;
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showMessage('error', '❌ Por favor corrija los errores');
      return;
    }
    
    setIsSaving(true);
    try {
      const payload = {};
      if (formModificacion.productoId) payload.productoId = parseInt(formModificacion.productoId);
      if (formModificacion.cantidad) payload.cantidad = parseInt(formModificacion.cantidad);
      if (formModificacion.motivo) payload.motivo = sanitize(formModificacion.motivo);
      
      await api.jefe.modificar(parseInt(formModificacion.id), payload);
      showMessage('success', '✅ Solicitud modificada exitosamente');
      setFormModificacion({ id: '', productoId: '', cantidad: '', motivo: '' });
      setErrors({});
      handleCargarPendientes();
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAprobar = async (id) => {
    if (!confirm('¿Confirmar aprobación de esta solicitud?')) return;
    try {
      const comentario = prompt('Comentario (opcional):');
      await api.jefe.aprobar(id, { 
        jefeId: 1,
        jefeComentarios: comentario ? sanitize(comentario) : 'Aprobado' 
      });
      showMessage('success', '✅ Solicitud aprobada exitosamente');
      handleCargarPendientes();
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    }
  };

  const handleRechazar = async (id) => {
    const motivo = prompt('Motivo del rechazo (requerido):');
    if (!motivo) {
      showMessage('error', '⚠️ Debe ingresar un motivo');
      return;
    }
    
    const validation = validateText(motivo, 5);
    if (!validation.valid) {
      showMessage('error', `❌ Motivo inválido: ${validation.message}`);
      return;
    }
    
    try {
      await api.jefe.rechazar(id, { 
        jefeId: 1,
        motivo: sanitize(motivo)
      });
      showMessage('success', '✅ Solicitud rechazada');
      handleCargarPendientes();
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    }
  };

  const handleConformidad = async () => {
    try {
      const ordenId = prompt('Número de la orden entregada:');
      if (!ordenId) return;
      
      const conforme = confirm('¿La entrega es conforme?');
      const observaciones = prompt('Observaciones (opcional):');
      
      await api.jefe.conformidad(parseInt(ordenId), {
        jefeId: 1,
        conforme,
        observaciones: observaciones ? sanitize(observaciones) : (conforme ? 'Conforme' : 'No conforme')
      });
      showMessage('success', '✅ Conformidad registrada correctamente');
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormModificacion(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Inbox className="w-6 h-6 text-blue-400" />
            Solicitudes Pendientes
          </h2>
          <button 
            className="w-full max-w-[200px] bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 mb-4"
            onClick={handleCargarPendientes}
          >
            <Download className="w-4 h-4" />
            Cargar Pendientes
          </button>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {solicitudesPendientes.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No hay solicitudes pendientes</p>
            ) : (
              solicitudesPendientes.map((sol) => (
                <div key={sol.id} className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-white">Solicitud #{sol.id}</h3>
                    <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                      {sol.estado}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mb-1">Producto: {sol.productoNombre || 'N/A'}</p>
                  <p className="text-slate-300 text-sm mb-1">Cantidad: {sol.cantidad}</p>
                  <p className="text-slate-400 text-xs mb-3">{sol.motivo}</p>
                  <div className="flex gap-2">
                    <button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 px-2 rounded text-xs flex items-center justify-center gap-1"
                      onClick={() => handleAprobar(sol.id)}
                    >
                      <ThumbsUp className="w-3 h-3" />Aprobar
                    </button>
                    <button 
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1.5 px-2 rounded text-xs flex items-center justify-center gap-1"
                      onClick={() => handleRechazar(sol.id)}
                    >
                      <ThumbsDown className="w-3 h-3" />Rechazar
                    </button>
                    <button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-2 rounded text-xs flex items-center justify-center gap-1"
                      onClick={() => setFormModificacion({ 
                        id: sol.id, 
                        productoId: sol.productoId, 
                        cantidad: sol.cantidad,
                        motivo: sol.motivo || '' 
                      })}
                    >
                      <Edit3 className="w-3 h-3" />Modificar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Edit3 className="w-6 h-6 text-blue-400" />
            Modificar Solicitud
          </h2>
          <form onSubmit={handleModificar} className="space-y-4">
            <ValidatedInput
              type="number"
              name="id"
              label="Número de Solicitud"
              value={formModificacion.id}
              onChange={handleInputChange}
              required
              placeholder="Número de solicitud"
              error={errors.id}
            />
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">Nuevo Producto</label>
              <select
                name="productoId"
                className="w-full max-w-[300px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500"
                value={formModificacion.productoId}
                onChange={handleInputChange}
              >
                <option value="">Sin cambios...</option>
                {productos?.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            
            <ValidatedInput
              type="number"
              name="cantidad"
              label="Nueva Cantidad"
              value={formModificacion.cantidad}
              onChange={handleInputChange}
              placeholder="Dejar vacío para no modificar"
              error={errors.cantidad}
            />
            
            <ValidatedInput
              type="textarea"
              name="motivo"
              label="Nuevo Motivo"
              value={formModificacion.motivo}
              onChange={handleInputChange}
              placeholder="Dejar vacío para no modificar"
              error={errors.motivo}
            />
            
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full max-w-[200px] bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-400" />
          Registrar Conformidad Post-Entrega
        </h2>
        <p className="text-slate-300 mb-4">Registre si la entrega fue conforme o no conforme:</p>
        <button 
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center gap-2"
          onClick={handleConformidad}
        >
          <CheckCircle className="w-4 h-4" />
          Registrar Conformidad
        </button>
      </div>
    </div>
  );
};

const AuxiliarProceso = ({ api, showMessage, proveedores }) => {
  const [formEnvioProveedores, setFormEnvioProveedores] = useState({ 
    solicitudId: '', 
    proveedorIds: '' 
  });
  const [formCotizacion, setFormCotizacion] = useState({
    solicitudId: '',
    proveedorId: '',
    precio: '',
    tiempoEntrega: '',
    condiciones: ''
  });
  const [formTracking, setFormTracking] = useState({ 
    ordenId: '', 
    estado: 'Pendiente', 
    observaciones: '' 
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleEnviarProveedores = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!formEnvioProveedores.solicitudId) {
      newErrors.solicitudId = 'Número de solicitud es requerido';
    }
    
    const proveedorIdsArray = formEnvioProveedores.proveedorIds
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));
    
    if (proveedorIdsArray.length === 0) {
      newErrors.proveedorIds = 'Ingrese al menos un proveedor válido';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showMessage('error', '❌ Corrija los errores en el formulario');
      return;
    }
    
    setIsSaving(true);
    try {
      await api.auxiliar.enviarAProveedores(parseInt(formEnvioProveedores.solicitudId), {
        auxiliarId: 1,
        proveedores: proveedorIdsArray
      });
      showMessage('success', `✅ Solicitud enviada a ${proveedorIdsArray.length} proveedor(es)`);
      setFormEnvioProveedores({ solicitudId: '', proveedorIds: '' });
      setErrors({});
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegistrarCotizacion = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!formCotizacion.solicitudId) newErrors.solicitudId = 'Requerido';
    if (!formCotizacion.proveedorId) newErrors.proveedorId = 'Requerido';
    
    const precioValidation = validateNumber(formCotizacion.precio);
    if (!precioValidation.valid) {
      newErrors.precio = precioValidation.message;
    }
    
    const tiempoValidation = validateText(formCotizacion.tiempoEntrega, 2);
    if (!tiempoValidation.valid) {
      newErrors.tiempoEntrega = tiempoValidation.message;
    }
    
    const condicionesValidation = validateText(formCotizacion.condiciones, 3);
    if (!condicionesValidation.valid) {
      newErrors.condiciones = condicionesValidation.message;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showMessage('error', '❌ Corrija los errores');
      return;
    }
    
    setIsSaving(true);
    try {
      await api.auxiliar.registrarCotizacion({
        solicitudId: parseInt(formCotizacion.solicitudId),
        proveedorId: parseInt(formCotizacion.proveedorId),
        precio: parseFloat(formCotizacion.precio),
        tiempoEntrega: sanitize(formCotizacion.tiempoEntrega),
        condiciones: sanitize(formCotizacion.condiciones)
      });
      showMessage('success', '✅ Cotización registrada exitosamente');
      setFormCotizacion({
        solicitudId: '',
        proveedorId: '',
        precio: '',
        tiempoEntrega: '',
        condiciones: ''
      });
      setErrors({});
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCrearOC = async () => {
    try {
      const cotizacionId = prompt('Número de la cotización aprobada por gerencia:');
      if (!cotizacionId) return;
      
      const validation = validateNumber(cotizacionId);
      if (!validation.valid) {
        showMessage('error', '❌ Número de cotización inválido');
        return;
      }
      
      const result = await api.auxiliar.crearOCDesdeCotizacion(parseInt(cotizacionId));
      
      if (result && result.ordenId) {
        showMessage('success', `✅ Orden de compra #${result.ordenId} creada exitosamente`);
      } else {
        showMessage('success', '✅ Orden de compra creada');
      }
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    }
  };

  const handleActualizarTracking = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!formTracking.ordenId) {
      newErrors.ordenId = 'Número de orden es requerido';
    }
    
    if (formTracking.observaciones) {
      const validation = validateText(formTracking.observaciones, 3);
      if (!validation.valid) {
        newErrors.observaciones = validation.message;
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showMessage('error', '❌ Corrija los errores');
      return;
    }
    
    setIsSaving(true);
    try {
      await api.auxiliar.tracking(parseInt(formTracking.ordenId), {
        estado: formTracking.estado,
        observaciones: formTracking.observaciones ? sanitize(formTracking.observaciones) : ''
      });
      showMessage('success', '✅ Estado de tracking actualizado');
      setFormTracking({ ordenId: '', estado: 'Pendiente', observaciones: '' });
      setErrors({});
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (formName, e) => {
    const { name, value } = e.target;
    if (formName === 'envio') {
      setFormEnvioProveedores(prev => ({ ...prev, [name]: value }));
    } else if (formName === 'cotizacion') {
      setFormCotizacion(prev => ({ ...prev, [name]: value }));
    } else if (formName === 'tracking') {
      setFormTracking(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Send className="w-6 h-6 text-blue-400" />
            Enviar Solicitud a Proveedores
          </h2>
          <form onSubmit={handleEnviarProveedores} className="space-y-4">
            <ValidatedInput
              type="number"
              name="solicitudId"
              label="Número de Solicitud Aprobada"
              value={formEnvioProveedores.solicitudId}
              onChange={(e) => handleInputChange('envio', e)}
              required
              placeholder="Ej: 1"
              error={errors.solicitudId}
            />
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Proveedores <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="proveedorIds"
                className={`w-full max-w-[300px] bg-slate-700 border ${errors.proveedorIds ? 'border-red-500' : 'border-slate-600'} rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500`}
                value={formEnvioProveedores.proveedorIds}
                onChange={(e) => handleInputChange('envio', e)}
                required
                placeholder="Ej: 1, 2, 3"
              />
              <p className="text-slate-400 text-xs mt-1">Ingrese los números separados por comas</p>
              {errors.proveedorIds && (
                <span className="error-text text-red-400 text-xs mt-1 block">{errors.proveedorIds}</span>
              )}
            </div>
            
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full max-w-[220px] bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSaving ? 'Enviando...' : 'Enviar a Proveedores'}
            </button>
          </form>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-400" />
            Registrar Cotización
          </h2>
          <form onSubmit={handleRegistrarCotizacion} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ValidatedInput
                type="number"
                name="solicitudId"
                label="Número Solicitud"
                value={formCotizacion.solicitudId}
                onChange={(e) => handleInputChange('cotizacion', e)}
                required
                error={errors.solicitudId}
              />
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Proveedor <span className="text-red-400">*</span>
                </label>
                <select
                  name="proveedorId"
                  className={`w-full bg-slate-700 border ${errors.proveedorId ? 'border-red-500' : 'border-slate-600'} rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500`}
                  value={formCotizacion.proveedorId}
                  onChange={(e) => handleInputChange('cotizacion', e)}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {proveedores?.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                {errors.proveedorId && (
                  <span className="error-text text-red-400 text-xs mt-1 block">{errors.proveedorId}</span>
                )}
              </div>
            </div>
            
            <ValidatedInput
              type="number"
              name="precio"
              label="Precio"
              value={formCotizacion.precio}
              onChange={(e) => handleInputChange('cotizacion', e)}
              required
              step="0.01"
              placeholder="Ej: 120.50"
              error={errors.precio}
            />
            
            <ValidatedInput
              type="text"
              name="tiempoEntrega"
              label="Tiempo de Entrega"
              value={formCotizacion.tiempoEntrega}
              onChange={(e) => handleInputChange('cotizacion', e)}
              required
              placeholder="Ej: 3 días, 1 semana"
              error={errors.tiempoEntrega}
            />
            
            <ValidatedInput
              type="textarea"
              name="condiciones"
              label="Condiciones"
              value={formCotizacion.condiciones}
              onChange={(e) => handleInputChange('cotizacion', e)}
              required
              placeholder="Ej: Crédito 30 días"
              error={errors.condiciones}
            />
            
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full max-w-[220px] bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Registrar Cotización'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-purple-400" />
            Crear Orden de Compra
          </h2>
          <p className="text-slate-300 mb-4">Crear OC desde una cotización aprobada por gerencia:</p>
          <button 
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center gap-2"
            onClick={handleCrearOC}
          >
            <Plus className="w-4 h-4" />
            Crear Orden de Compra
          </button>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-400" />
            Actualizar Tracking
          </h2>
          <form onSubmit={handleActualizarTracking} className="space-y-4">
            <ValidatedInput
              type="number"
              name="ordenId"
              label="Número de Orden"
              value={formTracking.ordenId}
              onChange={(e) => handleInputChange('tracking', e)}
              required
              placeholder="Número de orden"
              error={errors.ordenId}
            />
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Estado <span className="text-red-400">*</span>
              </label>
              <select 
                name="estado"
                className="w-full max-w-[200px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500"
                value={formTracking.estado}
                onChange={(e) => handleInputChange('tracking', e)}
                required
              >
                <option value="Pendiente">Pendiente</option>
                <option value="EnRuta">En Ruta</option>
                <option value="Entregado">Entregado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            
            <ValidatedInput
              type="textarea"
              name="observaciones"
              label="Observaciones"
              value={formTracking.observaciones}
              onChange={(e) => handleInputChange('tracking', e)}
              placeholder="Observaciones del tracking (opcional)"
              error={errors.observaciones}
            />
            
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full max-w-[200px] bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Truck className="w-4 h-4" />
              {isSaving ? 'Actualizando...' : 'Actualizar Estado'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const GerenciaProceso = ({ api, showMessage }) => {
  const [cotizacionesSolicitud, setCotizacionesSolicitud] = useState([]);
  const [solicitudIdBuscar, setSolicitudIdBuscar] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleBuscarCotizaciones = async () => {
    if (!solicitudIdBuscar) {
      showMessage('error', '⚠️ Ingrese un número de solicitud');
      return;
    }
    
    const validation = validateNumber(solicitudIdBuscar);
    if (!validation.valid) {
      showMessage('error', '❌ Número de solicitud inválido');
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await api.gerencia.cotizacionesPorSolicitud(parseInt(solicitudIdBuscar));
      setCotizacionesSolicitud(data || []);
      showMessage('success', `✅ ${data?.length || 0} cotizaciones encontradas`);
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAprobarCotizacion = async (cotizacionId) => {
    if (!confirm('¿Confirmar aprobación final de esta cotización?')) return;
    try {
      const comentario = prompt('Comentario (opcional):');
      const comentarioFinal = comentario ? sanitize(comentario) : 'Aprobado por gerencia';
      
      await api.gerencia.aprobarCotizacionFinal(cotizacionId, {
        gerenteId: 1,
        comentario: comentarioFinal
      });
      showMessage('success', '✅ Cotización aprobada. El auxiliar puede crear la OC.');
      handleBuscarCotizaciones();
    } catch (error) {
      showMessage('error', `❌ Error: ${error.message}`);
    }
  };

  return (
    <div>
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-400" />
          Buscar Cotizaciones por Solicitud
        </h2>
        <div className="flex gap-4 mb-4">
          <input 
            type="number"
            className="flex-1 max-w-[200px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500"
            value={solicitudIdBuscar}
            onChange={(e) => setSolicitudIdBuscar(e.target.value)}  
            placeholder="Número de solicitud"
          />
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
            onClick={handleBuscarCotizaciones}
            disabled={isLoading}
          >
            <Search className="w-4 h-4" />
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {cotizacionesSolicitud.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No hay cotizaciones para mostrar</p>
          ) : (
            cotizacionesSolicitud.map((cot) => (
              <div key={cot.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-lg">Cotización #{cot.id}</h3>
                    <p className="text-slate-300 text-sm">Proveedor: {cot.proveedorNombre || `ID ${cot.proveedorId}`}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    cot.estado === 'Recibida' || cot.estado === 'Pendiente' ? 'bg-yellow-500/20 text-yellow-400' :
                    cot.estado === 'Aprobada' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {cot.estado || 'Recibida'}
                  </span>
                </div>
                
                <div className="bg-slate-600 rounded p-3 mb-3">
                  <p className="text-slate-300 text-sm">Precio: Q{cot.precio?.toFixed(2) || '0.00'}</p>
                  <p className="text-slate-300 text-sm">Tiempo: {cot.tiempoEntrega || 'N/A'}</p>
                  <p className="text-slate-300 text-sm">Condiciones: {cot.condiciones || 'N/A'}</p>
                </div>

                {(cot.estado === 'Recibida' || cot.estado === 'Pendiente' || !cot.estado) && (
                  <button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                    onClick={() => handleAprobarCotizacion(cot.id)}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Aprobar Cotización
                  </button>
                )}
                
                {cot.estado === 'Aprobada' && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-2 text-center">
                    <p className="text-green-400 text-sm font-medium">✓ Aprobada - Lista para OC</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Proceso de Aprobación</h2>
        <div className="space-y-2 text-slate-300">
          <p>• Busque las cotizaciones asociadas a una solicitud aprobada por el jefe</p>
          <p>• Revise los detalles de cada cotización (precios, plazos, proveedores)</p>
          <p>• Apruebe la cotización más conveniente</p>
          <p>• El auxiliar de compras podrá crear la orden de compra desde la cotización aprobada</p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
function App() {
  const [database, setDatabase] = useState({
    proveedores: [],
    productos: [],
    empleados: [],
    vehiculos: []
  });

  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [currentModal, setCurrentModal] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedMenus, setExpandedMenus] = useState({});
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSavingForm, setIsSavingForm] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [proveedores, productos, empleados, vehiculos] = await Promise.all([
        catalogoService.getAll('proveedores'),
        catalogoService.getAll('productos'),
        catalogoService.getAll('empleados'),
        catalogoService.getAll('vehiculos')
      ]);

      setDatabase({
        proveedores: proveedores || [],
        productos: productos || [],
        empleados: empleados || [],
        vehiculos: vehiculos || []
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
      showMessage('error', '❌ Error al cargar los datos del sistema');
    } finally {
      setLoading(false);
    }
  };

  const reloadSection = async (section) => {
    try {
      const data = await catalogoService.getAll(section);
      setDatabase(prev => ({ ...prev, [section]: data || [] }));
    } catch (error) {
      console.error(`Error recargando ${section}:`, error);
    }
  };

  const showMessage = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: FilledHome, color: '#22c55e' },
    { 
      id: 'catalogos', 
      label: 'Catálogos', 
      icon: FilledPackage,
      color: '#3b82f6',
      submenu: [
        { id: 'proveedores', label: 'Proveedores', icon: FilledBuilding, color: '#8b5cf6' },
        { id: 'empleados', label: 'Empleados', icon: FilledUser, color: '#f59e0b' },
        { id: 'vehiculos', label: 'Vehículos', icon: FilledTruck, color: '#ef4444' },
        { id: 'productos', label: 'Productos', icon: FilledPackage, color: '#8b5cf6' }
      ]
    },
    { 
      id: 'procesos', 
      label: 'Procesos', 
      icon: FilledFile,
      color: '#06b6d4',
      submenu: [
        { id: 'proceso-empleado', label: 'Empleado', icon: User, color: '#06b6d4' },
        { id: 'proceso-jefe', label: 'Jefe', icon: ClipboardList, color: '#f59e0b' },
        { id: 'proceso-auxiliar', label: 'Auxiliar de Compras', icon: FileSignature, color: '#8b5cf6' },
        { id: 'proceso-gerencia', label: 'Gerente Financiero', icon: ThumbsUp, color: '#10b981' }
      ]
    },
    { id: 'reportes', label: 'Reportes', icon: FilledDollar, color: '#10b981' }
  ];

  const getModalTypeFromSection = (section) => {
    const mapping = {
      'proveedores': 'proveedor',
      'empleados': 'empleado', 
      'vehiculos': 'vehiculo',
      'productos': 'producto'
    };
    return mapping[section] || section;
  };

  const showSection = (section) => {
    setCurrentSection(section);
    setSearchTerm('');
    setFilterType('all');
    setExpandedMenus({});
    setShowDetails(false);
    setMensaje({ tipo: '', texto: '' });
  };

  const goBackToDashboard = () => {
    setCurrentSection('dashboard');
    setSearchTerm('');
    setFilterType('all');
    setExpandedMenus({});
    setShowDetails(false);
    setMensaje({ tipo: '', texto: '' });
  };

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const openModal = (type, id = null) => {
    const modalType = getModalTypeFromSection(currentSection);
    setCurrentModal(modalType);
    setEditingId(id);
    setFormErrors({});
    
    if (id) {
      const tableName = getTableName(modalType);
      const item = database[tableName].find(item => item.id === id);
      setFormData(item || {});
    } else {
      setFormData({});
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentModal('');
    setEditingId(null);
    setFormData({});
    setFormErrors({});
  };

  const showItemDetails = (type, item) => {
    setSelectedItem({ type, data: item });
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedItem(null);
  };

  const getTableName = (type) => {
    const typeMap = {
      'proveedor': 'proveedores',
      'empleado': 'empleados', 
      'vehiculo': 'vehiculos',
      'producto': 'productos'
    };
    return typeMap[type] || type + 's';
  };

  const validateForm = (type, data) => {
    const errors = {};
    
    // Validaciones comunes para texto
    const textFields = ['nombre', 'nit', 'direccion', 'telefono', 'email', 'contactoPrincipal', 'cargo', 'departamento', 'marcaModelo', 'placa', 'responsable', 'sku'];
    
    textFields.forEach(field => {
      if (data[field]) {
        const validation = validateText(data[field], 3);
        if (!validation.valid) {
          errors[field] = validation.message;
        }
      }
    });
    
    // Validaciones numéricas
    const numericFields = ['precioUnitario', 'impuesto', 'kilometraje', 'anio'];
    
    numericFields.forEach(field => {
      if (data[field]) {
        const validation = validateNumber(data[field], field === 'impuesto');
        if (!validation.valid) {
          errors[field] = validation.message;
        }
      }
    });
    
    // Validación de email
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Email inválido';
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataObj = new FormData(e.target);
    const data = {};
    
    for (let [key, value] of formDataObj.entries()) {
      data[key] = value;
    }
    
    // Sanitizar todos los campos de texto
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string' && !['email'].includes(key)) {
        data[key] = sanitize(data[key]);
      }
    });
    
    // Validar formulario
    const errors = validateForm(currentModal, data);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showMessage('error', '❌ Por favor corrija los errores en el formulario');
      return;
    }

    setIsSavingForm(true);
    if (editingId) {
      await updateItem(currentModal, editingId, data);
    } else {
      await addItem(currentModal, data);
    }
    setIsSavingForm(false);
    closeModal();
  };

  const addItem = async (type, data) => {
    const tableName = getTableName(type);
    const newItem = await catalogoService.create(tableName, data);
    if (newItem) {
      await reloadSection(tableName);
      showMessage('success', `✅ ${type} agregado exitosamente`);
    } else {
      showMessage('error', `❌ Error al agregar ${type}`);
    }
  };

  const updateItem = async (type, id, data) => {
    const tableName = getTableName(type);
    const updated = await catalogoService.update(tableName, id, data);
    if (updated) {
      await reloadSection(tableName);
      showMessage('success', `✅ ${type} actualizado exitosamente`);
    } else {
      showMessage('error', `❌ Error al actualizar ${type}`);
    }
  };

  const confirmDelete = (type, item) => {
    const deleteType = getModalTypeFromSection(currentSection);
    setDeleteCandidate({ type: deleteType, item });
    setShowConfirmDelete(true);
  };

  const executeDelete = async () => {
    if (deleteCandidate) {
      const { type, item } = deleteCandidate;
      const tableName = getTableName(type);
      const success = await catalogoService.delete(tableName, item.id);
      if (success) {
        await reloadSection(tableName);
        showMessage('success', `✅ ${type} eliminado exitosamente`);
      } else {
        showMessage('error', `❌ Error al eliminar ${type}`);
      }
    }
    setShowConfirmDelete(false);
    setDeleteCandidate(null);
  };

  const cancelDelete = () => {
    setShowConfirmDelete(false);
    setDeleteCandidate(null);
  };

  const filterItems = (items, section) => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(item => {
        const searchableFields = getSearchableFields(item, section);
        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(item => {
        if (item.estado) return item.estado === filterType;
        if (item.activo) return item.activo === filterType;
        return true;
      });
    }

    return filtered;
  };

  const getSearchableFields = (item, section) => {
    switch (section) {
      case 'proveedores':
        return [item.nombre, item.nit, item.contactoPrincipal];
      case 'empleados':
        return [item.nombre, item.cargo, item.departamento, item.email];
      case 'vehiculos':
        return [item.marcaModelo, item.placa, item.responsable];
      case 'productos':
        return [item.nombre, item.sku];
      default:
        return [];
    }
  };

  const renderFormFields = (type) => {
    switch(type) {
      case 'proveedor':
        return (
          <div className="space-y-4">
            <ValidatedInput
              type="text"
              name="nombre"
              label="Nombre del Proveedor"
              defaultValue={formData.nombre || ''}
              onChange={() => {}}
              required
              placeholder="Ingrese el nombre del proveedor"
              error={formErrors.nombre}
            />
            
            <ValidatedInput
              type="text"
              name="nit"
              label="NIT"
              defaultValue={formData.nit || ''}
              onChange={() => {}}
              required
              placeholder="Ejemplo: 1234567-8"
              error={formErrors.nit}
            />
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Dirección <span className="text-red-400">*</span>
              </label>
              <textarea 
                name="direccion" 
                className={`w-full bg-slate-700 border ${formErrors.direccion ? 'border-red-500' : 'border-slate-600'} rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500`}
                rows={2} 
                defaultValue={formData.direccion || ''} 
                required 
                placeholder="Dirección completa del proveedor" 
                style={{ maxHeight: '100px', resize: 'vertical' }}
              />
              {formErrors.direccion && (
                <span className="error-text text-red-400 text-xs mt-1 block">{formErrors.direccion}</span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <ValidatedInput
                type="tel"
                name="telefono"
                label="Teléfono"
                defaultValue={formData.telefono || ''}
                onChange={() => {}}
                required
                placeholder="+502 1234-5678"
                error={formErrors.telefono}
              />
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Correo Electrónico <span className="text-red-400">*</span>
                </label>
                <input 
                  type="email" 
                  name="email" 
                  className={`w-full bg-slate-700 border ${formErrors.email ? 'border-red-500' : 'border-slate-600'} rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500`}
                  defaultValue={formData.email || ''} 
                  required 
                  placeholder="contacto@empresa.com" 
                />
                {formErrors.email && (
                  <span className="error-text text-red-400 text-xs mt-1 block">{formErrors.email}</span>
                )}
              </div>
            </div>
            
            <ValidatedInput
              type="text"
              name="contactoPrincipal"
              label="Contacto Principal"
              defaultValue={formData.contactoPrincipal || ''}
              onChange={() => {}}
              required
              placeholder="Nombre del contacto"
              error={formErrors.contactoPrincipal}
            />
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Estado <span className="text-red-400">*</span>
              </label>
              <select 
                name="estado" 
                className="w-full max-w-[180px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500" 
                defaultValue={formData.estado || 'Activo'} 
                required
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        );

      case 'producto':
        return (
          <div className="space-y-4">
            <ValidatedInput
              type="text"
              name="sku"
              label="SKU"
              defaultValue={formData.sku || ''}
              onChange={() => {}}
              required
              placeholder="PROD-001"
              error={formErrors.sku}
            />
            
            <ValidatedInput
              type="text"
              name="nombre"
              label="Nombre del Producto"
              defaultValue={formData.nombre || ''}
              onChange={() => {}}
              required
              placeholder="Nombre del producto"
              error={formErrors.nombre}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Unidad <span className="text-red-400">*</span>
                </label>
                <select 
                  name="unidad" 
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500" 
                  defaultValue={formData.unidad || ''} 
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Unidad">Unidad</option>
                  <option value="Caja">Caja</option>
                  <option value="Libra">Libra</option>
                  <option value="Kilogramo">Kilogramo</option>
                  <option value="Metro">Metro</option>
                  <option value="Litro">Litro</option>
                  <option value="Galón">Galón</option>
                </select>
              </div>
              
              <ValidatedInput
                type="number"
                name="precioUnitario"
                label="Precio Unitario"
                defaultValue={formData.precioUnitario || ''}
                onChange={() => {}}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                error={formErrors.precioUnitario}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <ValidatedInput
                type="number"
                name="impuesto"
                label="Impuesto (%)"
                defaultValue={formData.impuesto || 12}
                onChange={() => {}}
                required
                min="0"
                max="100"
                step="0.01"
                placeholder="12"
                error={formErrors.impuesto}
              />
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Activo <span className="text-red-400">*</span>
                </label>
                <select 
                  name="activo" 
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500" 
                  defaultValue={formData.activo || 'Sí'} 
                  required
                >
                  <option value="Sí">Sí</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          </div>
        );
        
      case 'empleado':
        return (
          <div className="space-y-4">
            <ValidatedInput
              type="text"
              name="nombre"
              label="Nombre Completo"
              defaultValue={formData.nombre || ''}
              onChange={() => {}}
              required
              placeholder="Nombre completo del empleado"
              error={formErrors.nombre}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <ValidatedInput
                type="text"
                name="cargo"
                label="Cargo"
                defaultValue={formData.cargo || ''}
                onChange={() => {}}
                required
                placeholder="Cargo del empleado"
                error={formErrors.cargo}
              />
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Departamento <span className="text-red-400">*</span>
                </label>
                <select 
                  name="departamento" 
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500" 
                  defaultValue={formData.departamento || ''} 
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Administración">Administración</option>
                  <option value="Logística">Logística</option>
                  <option value="Compras">Compras</option>
                  <option value="Finanzas">Finanzas</option>
                  <option value="Recursos Humanos">Recursos Humanos</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <ValidatedInput
                type="tel"
                name="telefono"
                label="Teléfono"
                defaultValue={formData.telefono || ''}
                onChange={() => {}}
                required
                placeholder="+502 1234-5678"
                error={formErrors.telefono}
              />
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input 
                  type="email" 
                  name="email" 
                  className={`w-full bg-slate-700 border ${formErrors.email ? 'border-red-500' : 'border-slate-600'} rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500`}
                  defaultValue={formData.email || ''} 
                  required 
                  placeholder="empleado@empresa.gt" 
                />
                {formErrors.email && (
                  <span className="error-text text-red-400 text-xs mt-1 block">{formErrors.email}</span>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Estado <span className="text-red-400">*</span>
              </label>
              <select 
                name="estado" 
                className="w-full max-w-[180px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500" 
                defaultValue={formData.estado || 'Activo'} 
                required
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        );
        
      case 'vehiculo':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ValidatedInput
                type="text"
                name="marcaModelo"
                label="Marca/Modelo"
                defaultValue={formData.marcaModelo || ''}
                onChange={() => {}}
                required
                placeholder="Ford F-150"
                error={formErrors.marcaModelo}
              />
              
              <ValidatedInput
                type="text"
                name="placa"
                label="Placa"
                defaultValue={formData.placa || ''}
                onChange={() => {}}
                required
                placeholder="P-123ABC"
                error={formErrors.placa}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Tipo <span className="text-red-400">*</span>
                </label>
                <select 
                  name="tipo" 
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500" 
                  defaultValue={formData.tipo || ''} 
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Camión">Camión</option>
                  <option value="Auto">Auto</option>
                  <option value="Moto">Moto</option>
                  <option value="Camioneta">Camioneta</option>
                </select>
              </div>
              
              <ValidatedInput
                type="number"
                name="anio"
                label="Año"
                defaultValue={formData.anio || ''}
                onChange={() => {}}
                required
                min="1990"
                max="2025"
                placeholder="2020"
                error={formErrors.anio}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <ValidatedInput
                type="number"
                name="kilometraje"
                label="Kilometraje"
                defaultValue={formData.kilometraje || ''}
                onChange={() => {}}
                required
                min="0"
                placeholder="45000"
                error={formErrors.kilometraje}
              />
              
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Responsable <span className="text-red-400">*</span>
                </label>
                <select 
                  name="responsable" 
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500" 
                  defaultValue={formData.responsable || ''} 
                  required
                >
                  <option value="">Seleccionar...</option>
                  {database.empleados.map(e => (
                    <option key={e.id} value={e.nombre}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Estado <span className="text-red-400">*</span>
              </label>
              <select 
                name="estado" 
                className="w-full max-w-[180px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500" 
                defaultValue={formData.estado || 'Operativo'} 
                required
              >
                <option value="Operativo">Operativo</option>
                <option value="En taller">En taller</option>
              </select>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const renderCard = (type, item) => {
    let icon, title, subtitle, info, status;
    
    switch(type) {
      case 'proveedores':
        icon = <FilledBuilding className="w-12 h-12" color="#8b5cf6" />;
        title = item.nombre;
        subtitle = `NIT: ${item.nit}`;
        info = [
          { icon: <FilledPhone className="w-4 h-4" color="#22c55e" />, text: item.telefono },
          { icon: <FilledMail className="w-4 h-4" color="#3b82f6" />, text: item.email },
          { icon: <FilledUser className="w-4 h-4" color="#f59e0b" />, text: item.contactoPrincipal }
        ];
        status = item.estado === 'Activo' ? 
          { class: 'bg-green-500/20 text-green-400', text: 'Activo' } :
          { class: 'bg-red-500/20 text-red-400', text: 'Inactivo' };
        break;

      case 'productos':
        icon = <FilledPackage className="w-12 h-12" color="#8b5cf6" />;
        title = item.nombre;
        subtitle = `SKU: ${item.sku}`;
        info = [
          { icon: <FilledPackage className="w-4 h-4" color="#8b5cf6" />, text: item.unidad },
          { icon: <FilledDollar className="w-4 h-4" color="#22c55e" />, text: `Q${item.precioUnitario?.toFixed(2)}` },
          { icon: <FilledCalendar className="w-4 h-4" color="#f59e0b" />, text: `IVA: ${item.impuesto}%` }
        ];
        status = item.activo === 'Sí' ? 
          { class: 'bg-green-500/20 text-green-400', text: 'Activo' } :
          { class: 'bg-red-500/20 text-red-400', text: 'Inactivo' };
        break;
        
      case 'empleados':
        icon = <FilledUser className="w-12 h-12" color="#f59e0b" />;
        title = item.nombre;
        subtitle = `${item.cargo} - ${item.departamento}`;
        info = [
          { icon: <FilledPhone className="w-4 h-4" color="#22c55e" />, text: item.telefono },
          { icon: <FilledMail className="w-4 h-4" color="#3b82f6" />, text: item.email }
        ];
        status = item.estado === 'Activo' ? 
          { class: 'bg-green-500/20 text-green-400', text: 'Activo' } :
          { class: 'bg-red-500/20 text-red-400', text: 'Inactivo' };
        break;
        
      case 'vehiculos':
        icon = <FilledTruck className="w-12 h-12" color="#ef4444" />;
        title = item.marcaModelo;
        subtitle = `Placa: ${item.placa} | ${item.tipo} ${item.anio}`;
        info = [
          { icon: <FilledSettings className="w-4 h-4" color="#64748b" />, text: `${item.kilometraje?.toLocaleString()} km` },
          { icon: <FilledUser className="w-4 h-4" color="#3b82f6" />, text: item.responsable }
        ];
        status = item.estado === 'Operativo' ? 
          { class: 'bg-green-500/20 text-green-400', text: 'Operativo' } :
          { class: 'bg-red-500/20 text-red-400', text: 'En Taller' };
        break;
        
      default:
        return null;
    }

    return (
      <div key={item.id} className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700 hover:shadow-xl transition-shadow">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white mb-1 truncate">{title}</h3>
            <p className="text-slate-300 text-sm truncate">{subtitle}</p>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          {info.map((i, index) => (
            <div key={index} className="flex items-center gap-2 text-slate-200">
              <span className="flex-shrink-0">{i.icon}</span>
              <span className="text-sm truncate">{i.text}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mb-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.class}`}>{status.text}</span>
          <button className="text-blue-400 hover:text-blue-300 text-sm underline" onClick={() => showItemDetails(getModalTypeFromSection(currentSection), item)}>Ver detalles</button>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 font-medium text-sm" onClick={() => openModal(getModalTypeFromSection(currentSection), item.id)}>
            <Edit3 className="w-4 h-4" />Editar
          </button>
          <button className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1 font-medium text-sm" onClick={() => confirmDelete(getModalTypeFromSection(currentSection), item)}>
            <Trash2 className="w-4 h-4" />Eliminar
          </button>
        </div>
      </div>
    );
  };

  const getModalTitle = (type, isEditing) => {
    const action = isEditing ? 'Editar' : 'Agregar';
    const names = {
      'proveedor': 'Proveedor',
      'empleado': 'Empleado',
      'vehiculo': 'Vehículo',
      'producto': 'Producto'
    };
    return `${action} ${names[type] || type.charAt(0).toUpperCase() + type.slice(1)}`;
  };

  const renderSection = () => {
    if (loading) {
      return (
        <div className="p-6 flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-pulse mb-4"><FilledSettings className="w-16 h-16 mx-auto" color="#3b82f6" /></div>
            <p className="text-white text-lg">Cargando datos...</p>
          </div>
        </div>
      );
    }

    if (currentSection === 'dashboard') {
      return (
        <div className="p-6">
          <div className="mb-8">
            <h1 className="flex items-center gap-4 text-4xl font-bold text-white mb-2">
              <FilledHome className="w-16 h-16" color="#22c55e" />Panel Principal
            </h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <FilledBuilding className="w-16 h-16" color="white" />
                <div>
                  <div className="text-3xl font-bold">{database.proveedores.length}</div>
                  <div className="text-purple-200">Proveedores</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <FilledUser className="w-16 h-16" color="white" />
                <div>
                  <div className="text-3xl font-bold">{database.empleados.length}</div>
                  <div className="text-amber-200">Empleados</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <FilledTruck className="w-16 h-16" color="white" />
                <div>
                  <div className="text-3xl font-bold">{database.vehiculos.length}</div>
                  <div className="text-red-200">Vehículos</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-xl p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <FilledPackage className="w-16 h-16" color="white" />
                <div>
                  <div className="text-3xl font-bold">{database.productos.length}</div>
                  <div className="text-cyan-200">Productos</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentSection === 'reportes') {
      return (
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors font-medium" onClick={goBackToDashboard}>
                <ArrowLeft className="w-5 h-5" />Regresar
              </button>
              <h1 className="flex items-center gap-4 text-3xl font-bold text-white">
                <FilledDollar className="w-12 h-12" color="#10b981" />Reportes
              </h1>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            

<h2 className="text-xl font-bold text-white mb-4">📈 Sistema de Reportes</h2>
<p className="text-slate-300 mb-6">Acceda a los reportes disponibles del sistema:</p>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* 📋 Reporte de Solicitudes */}
  <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
    <h3 className="text-lg font-semibold text-white mb-2">📋 Reporte de Solicitudes</h3>
    <p className="text-slate-300 text-sm mb-3">Detalle completo de todas las solicitudes del sistema</p>
    <div className="flex gap-2">
      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm"
        onClick={() => descargarReporte('solicitudes/detalle', 'reporte_solicitudes.xlsx', 'xlsx')}>
        📘 Excel
      </button>
      <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm"
        onClick={() => descargarReporte('solicitudes/detalle', 'reporte_solicitudes.pdf', 'pdf')}>
        📄 PDF
      </button>
    </div>
  </div>

  {/* 📊 Resumen de Solicitudes */}
  <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
    <h3 className="text-lg font-semibold text-white mb-2">📊 Resumen de Solicitudes</h3>
    <p className="text-slate-300 text-sm mb-3">Vista resumida del estado de solicitudes</p>
    <div className="flex gap-2">
      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm"
        onClick={() => descargarReporte('solicitudes/resumen', 'resumen_solicitudes.xlsx', 'xlsx')}>
        📘 Excel
      </button>
      <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm"
        onClick={() => descargarReporte('solicitudes/resumen', 'resumen_solicitudes.pdf', 'pdf')}>
        📄 PDF
      </button>
    </div>
  </div>

  {/* 🏢 Órdenes por Proveedor */}
  <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
    <h3 className="text-lg font-semibold text-white mb-2">🏢 Órdenes por Proveedor</h3>
    <p className="text-slate-300 text-sm mb-3">Listado de órdenes agrupadas por proveedor</p>
    <div className="flex gap-2">
      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm"
        onClick={() => descargarReporte('ordenes/proveedor', 'ordenes_proveedor.xlsx', 'xlsx')}>
        📘 Excel
      </button>
      <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm"
        onClick={() => descargarReporte('ordenes/proveedor', 'ordenes_proveedor.pdf', 'pdf')}>
        📄 PDF
      </button>
    </div>
  </div>

  {/* 💰 Comparativo de Cotizaciones */}
  <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
    <h3 className="text-lg font-semibold text-white mb-2">💰 Comparativo de Cotizaciones</h3>
    <p className="text-slate-300 text-sm mb-3">Análisis comparativo de cotizaciones recibidas</p>
    <div className="flex gap-2">
      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm"
        onClick={() => descargarReporte('cotizaciones/comparativo', 'comparativo_cotizaciones.xlsx', 'xlsx')}>
        📘 Excel
      </button>
      <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 text-sm"
        onClick={() => descargarReporte('cotizaciones/comparativo', 'comparativo_cotizaciones.pdf', 'pdf')}>
        📄 PDF
      </button>
    </div>
  </div>
</div>


<div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                💡 <strong>Nota:</strong> Los reportes se generan con la información actualizada del sistema. 
                Puede aplicar filtros adicionales usando parámetros en la URL (desde, hasta, categoria, etc.)
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (currentSection === 'proceso-empleado') {
      return (
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors font-medium" onClick={goBackToDashboard}>
                <ArrowLeft className="w-5 h-5" />Regresar
              </button>
              <h1 className="flex items-center gap-4 text-3xl font-bold text-white">
                <User className="w-12 h-12" color="#06b6d4" />
                Módulo Empleado
              </h1>
            </div>
          </div>
          <EmpleadoProceso api={api} showMessage={showMessage} productos={database.productos} />
        </div>
      );
    }

    if (currentSection === 'proceso-jefe') {
      return (
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors font-medium" onClick={goBackToDashboard}>
                <ArrowLeft className="w-5 h-5" />Regresar
              </button>
              <h1 className="flex items-center gap-4 text-3xl font-bold text-white">
                <ClipboardList className="w-12 h-12" color="#f59e0b" />
                Módulo Jefe de Departamento
              </h1>
            </div>
          </div>
          <JefeProceso api={api} showMessage={showMessage} productos={database.productos} />
        </div>
      );
    }

    if (currentSection === 'proceso-auxiliar') {
      return (
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors font-medium" onClick={goBackToDashboard}>
                <ArrowLeft className="w-5 h-5" />Regresar
              </button>
              <h1 className="flex items-center gap-4 text-3xl font-bold text-white">
                <FileSignature className="w-12 h-12" color="#8b5cf6" />
                Módulo Auxiliar de Compras
              </h1>
            </div>
          </div>
          <AuxiliarProceso api={api} showMessage={showMessage} proveedores={database.proveedores} />
        </div>
      );
    }

    if (currentSection === 'proceso-gerencia') {
      return (
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors font-medium" onClick={goBackToDashboard}>
                <ArrowLeft className="w-5 h-5" />Regresar
              </button>
              <h1 className="flex items-center gap-4 text-3xl font-bold text-white">
                <ThumbsUp className="w-12 h-12" color="#10b981" />
                Módulo Gerente Financiero
              </h1>
            </div>
          </div>
          <GerenciaProceso api={api} showMessage={showMessage} />
        </div>
      );
    }

    const sectionData = database[currentSection];
    const sectionName = currentSection.charAt(0).toUpperCase() + currentSection.slice(1);
    const sectionIcon = menuItems.find(item => item.id === currentSection || (item.submenu && item.submenu.find(sub => sub.id === currentSection)));
    
    let buttonText = "Agregar ";
    switch(currentSection) {
      case 'proveedores': buttonText += "Proveedor"; break;
      case 'empleados': buttonText += "Empleado"; break;
      case 'vehiculos': buttonText += "Vehículo"; break;
      case 'productos': buttonText += "Producto"; break;
      default: buttonText += currentSection.slice(0, -1);
    }

    const getFilterOptions = () => {
      switch(currentSection) {
        case 'proveedores': return [{value: 'all', label: 'Todos'},{value: 'Activo', label: 'Activos'},{value: 'Inactivo', label: 'Inactivos'}];
        case 'empleados': return [{value: 'all', label: 'Todos'},{value: 'Activo', label: 'Activos'},{value: 'Inactivo', label: 'Inactivos'}];
        case 'vehiculos': return [{value: 'all', label: 'Todos'},{value: 'Operativo', label: 'Operativo'},{value: 'En taller', label: 'En Taller'}];
        case 'productos': return [{value: 'all', label: 'Todos'},{value: 'Sí', label: 'Activos'},{value: 'No', label: 'Inactivos'}];
        default: return [{value: 'all', label: 'Todos'}];
      }
    };

    if (!sectionData) {
      return (
        <div className="p-6">
          <div className="flex items-center gap-4 mb-8">
            <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors font-medium" onClick={goBackToDashboard}>
              <ArrowLeft className="w-5 h-5" />Regresar
            </button>
            <h1 className="text-3xl font-bold text-white">Sección no encontrada</h1>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors font-medium" onClick={goBackToDashboard}>
              <ArrowLeft className="w-5 h-5" />Regresar
            </button>
            <h1 className="flex items-center gap-4 text-3xl font-bold text-white">
              {sectionIcon?.icon && React.createElement(sectionIcon.icon, {className: "w-12 h-12", color: sectionIcon.color})}
              {sectionName}
            </h1>
          </div>
          <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium" onClick={() => openModal(getModalTypeFromSection(currentSection))}>
            <Plus className="w-5 h-5" />{buttonText}
          </button>
        </div>
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input type="text" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div>
            <select className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {getFilterOptions().map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filterItems(sectionData, currentSection).length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-400 text-lg">No se encontraron resultados</p>
            </div>
          ) : (
            filterItems(sectionData, currentSection).map(item => renderCard(currentSection, item))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {mensaje.texto && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl ${
          mensaje.tipo === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white font-medium animate-pulse`}>
          {mensaje.texto}
        </div>
      )}

      <header className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M3 13h1v7c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-7h1a1 1 0 0 0 .707-1.707l-9-9a.999.999 0 0 0-1.414 0l-9 9A1 1 0 0 0 3 13zM7 15h2v4H7v-4zm4 4v-4h2v4h-2zm6-2v2h-2v-4h2v2z" fill="white"/>
                <circle cx="12" cy="8" r="2" fill="#fbbf24"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Sistema de Compras</h1>
          </div>
          <nav className="flex items-center gap-2">
            {menuItems.map(item => (
              <div key={item.id} className="relative">
                {item.submenu ? (
                  <div>
                    <button className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${expandedMenus[item.id] ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`} onClick={() => toggleMenu(item.id)}>
                      <item.icon className="w-5 h-5" color={expandedMenus[item.id] ? 'white' : item.color} />
                      <span>{item.label}</span>
                      {expandedMenus[item.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {expandedMenus[item.id] && (
                      <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 min-w-48">
                        {item.submenu.map(subItem => (
                          <button key={subItem.id} className={`flex items-center gap-2 w-full px-3 py-2 text-left rounded-lg transition-colors font-medium text-sm ${currentSection === subItem.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`} onClick={() => showSection(subItem.id)}>
                            <subItem.icon className="w-4 h-4" color={currentSection === subItem.id ? 'white' : subItem.color} />
                            <span>{subItem.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${currentSection === item.id ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`} onClick={() => showSection(item.id)}>
                    <item.icon className="w-5 h-5" color={currentSection === item.id ? 'white' : item.color} />
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            ))}
          </nav>
        </div>
      </header>

      <main>{renderSection()}</main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-slate-800 rounded-xl w-full max-w-4xl max-h-[75vh] overflow-hidden border border-slate-700 flex flex-col">
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{getModalTitle(currentModal, editingId)}</h2>
                <button className="text-gray-400 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-colors" onClick={closeModal}>×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <form onSubmit={handleSubmit}>
                {renderFormFields(currentModal)}
                <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
                  <button type="button" className="flex-1 max-w-[150px] bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg transition-colors font-medium" onClick={closeModal}>Cancelar</button>
                  <button type="submit" disabled={isSavingForm} className="flex-1 max-w-[150px] bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSavingForm ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDetails && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && closeDetails()}>
          <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-slate-700">
            <div className="bg-slate-800 p-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Detalles</h2>
                <button className="text-gray-400 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-colors" onClick={closeDetails}>×</button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
              <div className="space-y-4">
                {Object.entries(selectedItem.data).map(([key, value]) => (
                  key !== 'id' && (
                    <div key={key} className="flex justify-between py-2 border-b border-slate-700">
                      <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}:</span>
                      <span className="text-white font-medium">{Array.isArray(value) ? value.length + ' elementos' : typeof value === 'object' ? JSON.stringify(value) : value?.toString() || 'N/A'}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmDelete && deleteCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirmar Eliminación</h3>
                  <p className="text-slate-300">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 mb-6">
                <p className="text-white">¿Está seguro de eliminar este elemento?</p>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg transition-colors font-medium" onClick={cancelDelete}>Cancelar</button>
                <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2" onClick={executeDelete}>
                  <Trash2 className="w-4 h-4" />Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;