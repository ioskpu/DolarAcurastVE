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
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/**
 * Helper para registrar en logs de debug
 */
async function logToDebug(payload, source, error = null) {
  try {
    const query = 'INSERT INTO webhook_debug_logs (payload, source, error) VALUES ($1, $2, $3)';
    await db.query(query, [JSON.stringify(payload), source, error]);
  } catch (err) {
    console.error('[CRITICAL] Fallo al guardar log de debug:', err.message);
  }
}

// 1. ENDPOINT DE DIAGNÓSTICO (DEBUG)
app.post('/api/v1/webhook/debug', async (req, res) => {
  console.log('[DEBUG] Recibido diagnóstico:', req.body);
  await logToDebug(req.body, 'debug_endpoint');
  return res.status(200).json({ success: true });
});

// 2. ENDPOINT PRINCIPAL (MODIFICADO)
app.post('/api/v1/webhook/acurast', async (req, res) => {
  const { event, data, job_metadata } = req.body;

  // Registrar intento en tabla de debug
  await logToDebug(req.body, 'acurast_main');

  if (!event || !data || !data.precio_ves || !data.fecha_consulta_api) {
    const errorMsg = 'Faltan campos críticos';
    await logToDebug(req.body, 'acurast_main_error', errorMsg);
    return res.status(400).json({ success: false, message: errorMsg });
  }

  try {
    const { precio_ves, fecha_consulta_api, fuente } = data;
    const { acurast_job_id, execution_timestamp } = job_metadata || {};

    const query = `
      INSERT INTO dolar_price_logs (
        precio_ves, fecha_consulta_api, fuente, acurast_job_id, execution_timestamp
      ) VALUES ($1, $2, $3, $4, $5) RETURNING id;
    `;

    const values = [
      precio_ves,
      fecha_consulta_api,
      fuente || 'desconocida',
      acurast_job_id || null,
      execution_timestamp || new Date().toISOString()
    ];

    const result = await db.query(query, values);
    return res.status(200).json({ success: true, id: result.rows[0].id });

  } catch (error) {
    await logToDebug(req.body, 'acurast_db_error', error.message);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// GET /api/v1/prices (Mismo de antes)
app.get('/api/v1/prices', async (req, res) => {
  try {
    const { job_id, page = 1, per_page = 20 } = req.query;
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
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
});

app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`[SRE] Servidor robusto en puerto ${PORT}`));
