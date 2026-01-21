const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logger middleware simple
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Endpoint principal del webhook
app.post('/api/v1/webhook/acurast', async (req, res) => {
  const { event, data, job_metadata } = req.body;

  // 1. Validación de campos críticos
  if (!event || !data || !data.precio_ves || !data.fecha_consulta_api) {
    console.error('[Webhook Error] Datos incompletos:', req.body);
    return res.status(400).json({
      success: false,
      message: 'Bad Request: Faltan campos críticos (event, data.precio_ves, data.fecha_consulta_api)'
    });
  }

  try {
    // 2. Extracción de datos
    const { precio_ves, fecha_consulta_api, fuente } = data;
    const { acurast_job_id, execution_timestamp } = job_metadata || {};

    // 3. Inserción en la base de datos
    const query = `
      INSERT INTO dolar_price_logs (
        precio_ves, 
        fecha_consulta_api, 
        fuente, 
        acurast_job_id, 
        execution_timestamp
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;

    const values = [
      precio_ves,
      fecha_consulta_api,
      fuente || 'desconocida',
      acurast_job_id || null,
      execution_timestamp || new Date().toISOString()
    ];

    const result = await db.query(query, values);
    
    console.log(`[Webhook Success] Datos guardados con ID: ${result.rows[0].id}`);

    // 4. Respuesta exitosa
    return res.status(200).json({
      success: true,
      message: 'Webhook recibido y procesado correctamente',
      id: result.rows[0].id
    });

  } catch (error) {
    console.error('[Webhook Error] Error al procesar el webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Microservidor Acurast corriendo en el puerto ${PORT}`);
  console.log(`[Server] Endpoint: POST http://localhost:${PORT}/api/v1/webhook/acurast`);
});
