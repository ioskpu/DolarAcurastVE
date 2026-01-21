/**
 * DOLAR TRACKER - ACURAST JOB SCRIPT
 * 
 * Este script consulta el precio del dólar oficial en Venezuela y lo envía a un webhook.
 * Diseñado para ejecutarse en el entorno Acurast.
 */

async function runJob() {
  print("Iniciando Job de Monitoreo de Dólar...");

  // 1. Configuración de variables de entorno de Acurast
  const CALLBACK_URL = _STD_.env["CALLBACK_URL"];
  const JOB_ID = _STD_.env["JOB_ID"] || "unknown";

  if (!CALLBACK_URL) {
    print("ERROR: CALLBACK_URL no configurada en las variables de entorno.");
    return;
  }

  const API_URL = "https://ve.dolarapi.com/v1/dolares/oficial";

  try {
    // 2. Consulta a la API de Dólar
    print(`Consultando API: ${API_URL}`);
    const apiResponse = await fetch(API_URL);

    if (!apiResponse.ok) {
      print(`ERROR: La API respondió con status ${apiResponse.status}`);
      return;
    }

    const apiData = await apiResponse.json();

    // Validamos que tengamos el campo promedio (o el campo que corresponda de ve.dolarapi.com)
    // Según la API oficial suele ser 'promedio'
    if (!apiData || !apiData.promedio) {
      print("ERROR: Los datos recibidos de la API no tienen el formato esperado.");
      return;
    }

    print(`Precio obtenido: ${apiData.promedio} VES`);

    // 3. Preparación del Payload para el Webhook
    const payload = {
      event: "dolar_price_update",
      data: {
        precio_ves: apiData.promedio,
        fecha_consulta_api: apiData.fechaActualizacion || new Date().toISOString(),
        fuente: "oficial"
      },
      job_metadata: {
        acurast_job_id: JOB_ID,
        execution_timestamp: new Date().toISOString()
      }
    };

    // 4. Envío de datos al Callback (Webhook)
    print(`Enviando datos al callback: ${CALLBACK_URL}`);
    const callbackResponse = await fetch(CALLBACK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (callbackResponse.ok) {
      print("SUCCESS: Webhook enviado correctamente.");
    } else {
      print(`ERROR: El webhook respondió con status ${callbackResponse.status}`);
    }

  } catch (error) {
    print(`CRITICAL ERROR: ${error.message}`);
  }
}

// Ejecutar el job
runJob();
