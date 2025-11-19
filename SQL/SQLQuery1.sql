USE GestionComprasDB; -- <— ajusta si tu BD se llama distinto
GO

/* 1) solicitud_proveedores */
IF OBJECT_ID('dbo.solicitud_proveedores','U') IS NULL
BEGIN
  CREATE TABLE dbo.solicitud_proveedores(
    id           INT IDENTITY(1,1) PRIMARY KEY,
    solicitudId  INT NOT NULL,
    proveedorId  INT NOT NULL,
    fechaEnvio   DATETIME NOT NULL DEFAULT(GETDATE())
  );
  -- Índice de uso frecuente
  CREATE INDEX IX_solicitud_proveedores_solicitud ON dbo.solicitud_proveedores(solicitudId);
END
GO

/* 2) oc_tracking */
IF OBJECT_ID('dbo.oc_tracking','U') IS NULL
BEGIN
  CREATE TABLE dbo.oc_tracking(
    id            INT IDENTITY(1,1) PRIMARY KEY,
    ordenId       INT NOT NULL,
    estado        NVARCHAR(50) NOT NULL,
    fecha         DATETIME NOT NULL DEFAULT(GETDATE()),
    observaciones NVARCHAR(500) NULL
  );
  CREATE INDEX IX_oc_tracking_orden ON dbo.oc_tracking(ordenId, fecha);
END
GO

/* 3) cotizaciones — columnas del flujo */
IF OBJECT_ID('dbo.cotizaciones','U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.cotizaciones','solicitudId') IS NULL
    ALTER TABLE dbo.cotizaciones ADD solicitudId INT NULL;
  IF COL_LENGTH('dbo.cotizaciones','proveedorId') IS NULL
    ALTER TABLE dbo.cotizaciones ADD proveedorId INT NULL;
  IF COL_LENGTH('dbo.cotizaciones','precio') IS NULL
    ALTER TABLE dbo.cotizaciones ADD precio DECIMAL(18,2) NULL;
  IF COL_LENGTH('dbo.cotizaciones','tiempoEntrega') IS NULL
    ALTER TABLE dbo.cotizaciones ADD tiempoEntrega NVARCHAR(50) NULL;
  IF COL_LENGTH('dbo.cotizaciones','condiciones') IS NULL
    ALTER TABLE dbo.cotizaciones ADD condiciones NVARCHAR(500) NULL;
  IF COL_LENGTH('dbo.cotizaciones','estado') IS NULL
    ALTER TABLE dbo.cotizaciones ADD estado NVARCHAR(50) NULL;
  IF COL_LENGTH('dbo.cotizaciones','fecha') IS NULL
    ALTER TABLE dbo.cotizaciones ADD fecha DATETIME NULL;

  -- Única por solicitud-proveedor (evita duplicados)
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UQ_cotizaciones_solicitud_proveedor' AND object_id=OBJECT_ID('dbo.cotizaciones'))
    CREATE UNIQUE INDEX UQ_cotizaciones_solicitud_proveedor
      ON dbo.cotizaciones(solicitudId, proveedorId)
      WHERE solicitudId IS NOT NULL AND proveedorId IS NOT NULL;
END
GO

/* 4) ordenes_compra — crear si no existe, o completar columnas nuevas */
IF OBJECT_ID('dbo.ordenes_compra','U') IS NULL
BEGIN
  CREATE TABLE dbo.ordenes_compra(
    id                   INT IDENTITY(1,1) PRIMARY KEY,
    cotizacionId         INT NOT NULL,
    proveedorId          INT NOT NULL,
    total                DECIMAL(18,2) NOT NULL DEFAULT(0),
    estado               NVARCHAR(50) NOT NULL,
    fecha                DATETIME NOT NULL DEFAULT(GETDATE()),
    -- Paso 5:
    conformidadJefe      NVARCHAR(10) NULL,
    jefeIdConformidad    INT NULL,
    observacionesJefe    NVARCHAR(500) NULL,
    notificadoEmpleado   NVARCHAR(10) NULL,
    empleadoIdNotifica   INT NULL,
    observacionesEmpleado NVARCHAR(500) NULL
  );
END
ELSE
BEGIN
  IF COL_LENGTH('dbo.ordenes_compra','conformidadJefe') IS NULL
    ALTER TABLE dbo.ordenes_compra ADD conformidadJefe NVARCHAR(10) NULL;
  IF COL_LENGTH('dbo.ordenes_compra','jefeIdConformidad') IS NULL
    ALTER TABLE dbo.ordenes_compra ADD jefeIdConformidad INT NULL;
  IF COL_LENGTH('dbo.ordenes_compra','observacionesJefe') IS NULL
    ALTER TABLE dbo.ordenes_compra ADD observacionesJefe NVARCHAR(500) NULL;
  IF COL_LENGTH('dbo.ordenes_compra','notificadoEmpleado') IS NULL
    ALTER TABLE dbo.ordenes_compra ADD notificadoEmpleado NVARCHAR(10) NULL;
  IF COL_LENGTH('dbo.ordenes_compra','empleadoIdNotifica') IS NULL
    ALTER TABLE dbo.ordenes_compra ADD empleadoIdNotifica INT NULL;
  IF COL_LENGTH('dbo.ordenes_compra','observacionesEmpleado') IS NULL
    ALTER TABLE dbo.ordenes_compra ADD observacionesEmpleado NVARCHAR(500) NULL;
END
GO

/* 5) inventario — estandarizar nombres usados por el backend */
IF OBJECT_ID('dbo.inventario','U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.inventario','productoId') IS NULL
    ALTER TABLE dbo.inventario ADD productoId INT NOT NULL DEFAULT(0);
  IF COL_LENGTH('dbo.inventario','cantidadActual') IS NULL
    ALTER TABLE dbo.inventario ADD cantidadActual INT NOT NULL DEFAULT(0);
  IF COL_LENGTH('dbo.inventario','cantidadMinima') IS NULL
    ALTER TABLE dbo.inventario ADD cantidadMinima INT NULL;
END
GO
