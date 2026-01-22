/**
 * TEST LOCAL - SIMULADOR DE ENTORNO ACURAST
 * 
 * Este script emula las globales de Acurast (_STD_ y print)
 * para probar dolar-tracker.js en un entorno Node.js local.
 */

const fs = require('fs');
const path = require('path');

// Intentar cargar .env desde la raíz del proyecto (un nivel arriba)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 1. Simular el entorno de Acurast
global._STD_ = {
  env: {
    CALLBACK_URL: process.env.CALLBACK_URL,
    JOB_ID: process.env.JOB_ID || "local-test-job"
  }
};

global.print = (msg) => {
  console.log(`[ACURAST PRINT]: ${msg}`);
};

// Polyfill de fetch para Node.js
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

console.log("--- Iniciando Simulación Local de Acurast (en carpeta acurast/) ---");
console.log(`Callback URL: ${global._STD_.env.CALLBACK_URL}`);

// 2. Cargar y ejecutar el script del tracker
try {
  const trackerPath = path.join(__dirname, 'dolar-tracker.js');
  const trackerScript = fs.readFileSync(trackerPath, 'utf8');
  eval(trackerScript);
} catch (error) {
  console.error("Error al ejecutar el script del tracker:", error);
}
