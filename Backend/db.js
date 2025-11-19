import sql from "mssql";

const dbConfig = {
  user: 'sa',
  password: '1234',
  server: 'localhost',
  database: 'GestionComprasDB',
  options: { 
    encrypt: false, 
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

export async function getConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (error) {
    console.error('Error conectando a la base de datos:', error);
    throw error;
  }
}