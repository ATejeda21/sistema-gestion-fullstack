/* Tablas de apoyo para workflow compras */
IF OBJECT_ID('dbo.solicitudes_compra') IS NULL
BEGIN
  CREATE TABLE dbo.solicitudes_compra (
    id INT IDENTITY(1,1) PRIMARY KEY,
    productoId INT NOT NULL,
    cantidadSugerida INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT(GETDATE()),
    estado NVARCHAR(50) NOT NULL DEFAULT('Pendiente')
  );
END;

IF OBJECT_ID('dbo.recepciones') IS NULL
BEGIN
  CREATE TABLE dbo.recepciones (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ordenId INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT(GETDATE()),
    observaciones NVARCHAR(500)
  );
END;

IF OBJECT_ID('dbo.recepcion_detalle') IS NULL
BEGIN
  CREATE TABLE dbo.recepcion_detalle (
    id INT IDENTITY(1,1) PRIMARY KEY,
    recepcionId INT NOT NULL,
    productoId INT NOT NULL,
    cantidad INT NOT NULL
  );
END;

IF OBJECT_ID('dbo.movimientos_inventario') IS NULL
BEGIN
  CREATE TABLE dbo.movimientos_inventario (
    id INT IDENTITY(1,1) PRIMARY KEY,
    productoId INT NOT NULL,
    tipo NVARCHAR(50) NOT NULL,
    cantidad INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT(GETDATE()),
    referencia NVARCHAR(100)
  );
END;
