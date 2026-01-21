ACTÚA COMO ESPECIALISTA EN DESARROLLO PARA ACURAST. Necesito el script final que se desplegará en Acurast, adaptado al entorno de ejecución correcto.

OBJETIVO DEL SCRIPT (dolar-tracker.js):

Ejecutarse en el entorno de Acurast (que provee fetch y print, pero NO console.log).

Consultar la API https://ve.dolarapi.com/v1/dolares/oficial cada vez que sea ejecutado.

Formatear los datos y enviarlos vía POST a una CALLBACK_URL configurada como variable.

Ser robusto ante fallos de red o de la API.

REQUISITOS TÉCNICOS ESPECÍFICOS DE ACURAST:

LOGGING: Usar print() en lugar de console.log. Ej: print("Iniciando job...").

VARIABLES: Leer la URL del callback desde _STD_.env["CALLBACK_URL"]. Validar que exista.

HTTP: Usar fetch (disponible globalmente en Acurast) para ambas peticiones (GET a la API, POST al callback).

MANEJO DE ERRORES: No lanzar excepciones no controladas. Usar try/catch y loggear errores con print().

ESTRUCTURA DE SALIDA (JSON para el callback):
El script debe enviar un POST con un JSON que coincida EXACTAMENTE con este esquema, para que el backend creado anteriormente lo entienda:

json
{
  "event": "dolar_price_update",
  "data": {
    "precio_ves": 344.51,
    "fecha_consulta_api": "2026-01-20T16:03:00.209Z",
    "fuente": "oficial"
  },
  "job_metadata": {
    "acurast_job_id": "unknown",
    "execution_timestamp": "2026-01-20T16:00:00.000Z"
  }
}
INSTRUCCIONES:

Genera el código completo para dolar-tracker.js.

Incluye comentarios claros sobre las partes críticas.

Asegúrate de que:

El acurast_job_id puede leerse de _STD_.env["JOB_ID"] si Acurast lo inyecta, o dejarse como "unknown".

El execution_timestamp sea la fecha/hora de la ejecución actual en formato ISO.

Se haga parseo seguro de la respuesta de la API (usar response.json() y validar la propiedad promedio).

Proporciona también un ejemplo del archivo .env local para pruebas: CALLBACK_URL=https://xxxx.ngrok.io/api/v1/webhook/acurast.

CONSEJOS DE PRUEBA:
Sugiere cómo probar este script localmente en Node.js de manera SIMULADA:

Crear un archivo de prueba test-local.js que mockee _STD_.env y print.

Ejecutarlo con node test-local.js para verificar la lógica antes del deploy.

text

---

### 🚀 Flujo de Integración Final
1.  **Backend**: Ejecuta el prompt del Paso 1, crea la DB, levanta el servidor y obtén tu URL pública con **`ngrok http 3000`** (ej: `https://abc123.ngrok.io`). Tu `CALLBACK_URL` será `https://abc123.ngrok.io/api/v1/webhook/acurast`.
2.  **Script**: Con la `CALLBACK_URL` en mano, ejecuta el prompt del Paso 2 para generar `dolar-tracker.js`.
3.  **Deploy en Acurast**:
    *   **Sube** `dolar-tracker.js` a Pinata. Obtén el enlace IPFS.
    *   En **app.acurast.com**, crea un nuevo Job Deployment.
    *   **Schedule:** `*/10 * * * *` (cada 10 minutos).
    *   **Source Code URL:** Pega tu enlace IPFS.
    *   **Environment Variables:** Añade un Secret con `Key: CALLBACK_URL` y `Value: [tu-url-de-ngrok]`.
    *   **Number of Runs (Total Executions):** Configúralo para que dure lo que necesites (ej. 144 ejecuciones = 1 día si corre cada 10 min).