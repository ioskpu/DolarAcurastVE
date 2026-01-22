const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Deshabilitar para permitir CDN de Tailwind fácilmente en desarrollo
}));
app.use(cors());
app.use(express.json());

// Servir archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Logger middleware simple
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// NUEVO ENDPOINT: GET /api/v1/prices
app.get('/api/v1/prices', async (req, res) => {
  try {
    const { limit = 50, job_id, page = 1, per_page = 20 } = req.query;
    
    const offset = (page - 1) * per_page;
    let query = 'SELECT * FROM dolar_price_logs';
    const params = [];

    if (job_id) {
      query += ' WHERE acurast_job_id = $1';
      params.push(job_id);
    }

    query += ` ORDER BY received_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(per_page, offset);

    const result = await db.query(query, params);
    
    // Obtener total para metadatos de paginación
    const countQuery = job_id ? 'SELECT COUNT(*) FROM dolar_price_logs WHERE acurast_job_id = $1' : 'SELECT COUNT(*) FROM dolar_price_logs';
    const countResult = await db.query(countQuery, job_id ? [job_id] : []);
    const totalItems = parseInt(countResult.rows[0].count);

    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        total: totalItems,
        page: parseInt(page),
        per_page: parseInt(per_page),
        total_pages: Math.ceil(totalItems / per_page)
      }
    });
  } catch (error) {
    console.error('[API Error] Error al obtener precios:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Endpoint principal del webhook
app.post('/api/v1/webhook/acurast', async (req, res) => {
  const { event, data, job_metadata } = req.body;

  if (!event || !data || !data.precio_ves || !data.fecha_consulta_api) {
    console.error('[Webhook Error] Datos incompletos:', req.body);
    return res.status(400).json({
      success: false,
      message: 'Bad Request: Faltan campos críticos (event, data.precio_ves, data.fecha_consulta_api)'
    });
  }

  try {
    const { precio_ves, fecha_consulta_api, fuente } = data;
    const { acurast_job_id, execution_timestamp } = job_metadata || {};

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

    return res.status(200).json({
      success: true,
      message: 'Webhook recibido y procesado correctamente',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('[Webhook Error] Error al procesar el webhook:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Ruta raíz para servir el dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Microservidor Acurast corriendo en el puerto ${PORT}`);
});
