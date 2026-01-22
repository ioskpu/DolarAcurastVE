/**
 * DOLAR TRACKER - ACURAST JOB SCRIPT (PROD VERSION)
 * 
 * Este script consulta el precio del dólar oficial en Venezuela y lo envía a un webhook.
 * Optimizado para el entorno descentralizado de Acurast con robustez mejorada.
 */

async function runJob() {
  // 1. Configuración de variables de entorno y validación
  const CALLBACK_URL = _STD_.env["CALLBACK_URL"];
  const JOB_ID = _STD_.env["JOB_ID"];

  if (!CALLBACK_URL || !JOB_ID) {
    print(`[ERROR] Variables de entorno faltantes. JOB_ID: ${JOB_ID || 'NO CONFIGURADO'}, CALLBACK_URL: ${CALLBACK_URL ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
    return;
  }

  print(`[${JOB_ID}] Iniciando Job de Monitoreo...`);
  
  const API_URL = "https://ve.dolarapi.com/v1/dolares/oficial";
  const TIMEOUT_MS = 10000; // 10 segundos de timeout

  try {
    // 2. Consulta a la API de Dólar con Timeout
    print(`[${JOB_ID}] Consultando API: ${API_URL}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const apiResponse = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      print(`[${JOB_ID}] ERROR API: Status ${apiResponse.status}`);
      return;
    }

    const apiData = await apiResponse.json();

    if (!apiData || !apiData.promedio) {
      print(`[${JOB_ID}] ERROR: Formato de datos de API inválido`);
      return;
    }

    const precio = apiData.promedio;
    print(`[${JOB_ID}] Precio obtenido: ${precio} VES`);

    // 3. Preparación del Payload para el Webhook
    const payload = {
      event: "dolar_price_update",
      data: {
        precio_ves: precio,
        fecha_consulta_api: apiData.fechaActualizacion || new Date().toISOString(),
        fuente: "oficial"
      },
      job_metadata: {
        acurast_job_id: JOB_ID,
        execution_timestamp: new Date().toISOString()
      }
    };

    // 4. Envío de datos al Callback con Timeout
    print(`[${JOB_ID}] Enviando datos al callback: ${CALLBACK_URL}`);
    
    const cbController = new AbortController();
    const cbTimeoutId = setTimeout(() => cbController.abort(), TIMEOUT_MS);

    const callbackResponse = await fetch(CALLBACK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: cbController.signal
    });
    clearTimeout(cbTimeoutId);

    if (callbackResponse.ok) {
      print(`[${JOB_ID}] SUCCESS: Datos transmitidos correctamente.`);
    } else {
      print(`[${JOB_ID}] ERROR CALLBACK: Status ${callbackResponse.status}`);
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      print(`[${JOB_ID}] ERROR: Timeout de 10s alcanzado`);
    } else {
      print(`[${JOB_ID}] CRITICAL ERROR: ${error.message}`);
    }
  }
}

// Ejecutar el job
runJob();
