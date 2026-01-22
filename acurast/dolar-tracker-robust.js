/**
 * DOLAR TRACKER - ACURAST JOB SCRIPT (ROBUST SRE VERSION)
 * 
 * Implementa reintentos para lectura de variables y callback de diagnóstico.
 */

/**
 * Intenta obtener una variable de entorno con reintentos
 */
async function getEnvWithRetry(key, maxRetries = 3, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    const value = _STD_.env[key];
    if (value) return value;
    
    print(`[RETRY] Esperando variable ${key}... Intento ${i + 1}/${maxRetries}`);
    // Simulación de delay mediante una promesa (Acurast soporta await)
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return null;
}

async function runJob() {
  // 1. Lectura robusta de variables
  const CALLBACK_URL = await getEnvWithRetry("CALLBACK_URL");
  const JOB_ID = await getEnvWithRetry("JOB_ID");
  const DEBUG_URL = _STD_.env["DEBUG_URL"]; // Opcional, no requiere retry crítico

  if (!CALLBACK_URL || !JOB_ID) {
    const errorMsg = `Fallo crítico: Variables faltantes. JOB_ID: ${JOB_ID || 'MISSING'}, CALLBACK_URL: ${CALLBACK_URL ? 'OK' : 'MISSING'}`;
    print(`[ERROR] ${errorMsg}`);
    
    // Callback de fallo (Debug)
    if (DEBUG_URL) {
      try {
        await fetch(DEBUG_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "job_failure",
            error: errorMsg,
            timestamp: new Date().toISOString(),
            context: "env_propagation_failure"
          })
        });
        print("[DEBUG] Callback de error enviado a " + DEBUG_URL);
      } catch (e) {
        print("[DEBUG] No se pudo enviar el callback de error");
      }
    }
    return;
  }

  print(`[${JOB_ID}] Iniciando Job de Monitoreo...`);
  const API_URL = "https://ve.dolarapi.com/v1/dolares/oficial";
  const TIMEOUT_MS = 10000;

  try {
    // 2. Consulta a la API con Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const apiResponse = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      throw new Error(`API responded with status ${apiResponse.status}`);
    }

    const apiData = await apiResponse.json();
    const precio = apiData.promedio;

    // 3. Payload
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

    // 4. Envío al Callback Principal
    const cbController = new AbortController();
    const cbTimeoutId = setTimeout(() => cbController.abort(), TIMEOUT_MS);

    const response = await fetch(CALLBACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: cbController.signal
    });
    clearTimeout(cbTimeoutId);

    if (response.ok) {
      print(`[${JOB_ID}] SUCCESS: Datos transmitidos.`);
    } else {
      print(`[${JOB_ID}] ERROR: Callback status ${response.status}`);
    }

  } catch (error) {
    print(`[${JOB_ID}] FAIL: ${error.message}`);
    
    // Reportar error al Debug URL si existe
    if (DEBUG_URL) {
      try {
        await fetch(DEBUG_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "runtime_error",
            job_id: JOB_ID,
            error: error.message,
            timestamp: new Date().toISOString()
          })
        });
      } catch (e) { /* silent */ }
    }
  }
}

runJob();
