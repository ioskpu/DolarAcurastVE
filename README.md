# 🚀 DolarAcurastVE: Monitoreo Descentralizado del Dólar (VES)

¡Excelente noticia! El sistema ha sido validado con éxito: el Job de Acurast se ejecutó y los datos se persistieron correctamente en la base de datos PostgreSQL.

Este proyecto es un **microservidor robusto** y un **script de computación descentralizada** diseñados para monitorear el precio del dólar oficial en Venezuela (VES) de forma automática y confiable.

## 📌 Intención y Funcionalidad

La intención principal es crear un historial verificado y automatizado del precio del dólar. El flujo funciona de la siguiente manera:

1.  **Acurast Job**: Un script descentralizado ([dolar-tracker.js](acurast/dolar-tracker.js)) se ejecuta en la red de Acurast según un cronograma (ej. cada 10 min).
2.  **Extracción de Datos**: El script consulta la API de `ve.dolarapi.com` para obtener el precio oficial.
3.  **Transmisión**: Los datos se envían mediante un Webhook (POST) a una URL pública (exponiendo el backend local vía `ngrok`).
4.  **Recepción y Persistencia**: El backend ([index.js](index.js)) recibe, valida y guarda la información en una tabla de PostgreSQL para su posterior análisis o consulta.

---

## 🛠️ Estructura del Proyecto

```text
├── acurast/
│   ├── dolar-tracker.js    # Script final para despliegue en Acurast
│   └── test-local.js       # Simulador del entorno Acurast para pruebas
├── db.js                   # Configuración del pool de PostgreSQL (pg)
├── index.js                # Servidor Express (Webhook Receiver)
├── .env.example            # Plantilla de variables de entorno
└── package.json            # Dependencias y scripts de automatización
```

---

## 🚀 Guía de Inicio Rápido

### 1. Requisitos Previos
- Node.js (v18+)
- PostgreSQL
- Una cuenta en [Acurast](https://app.acurast.com)
- [ngrok](https://ngrok.com/) instalado

### 2. Configuración del Backend
1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Crea tu archivo `.env` y configura tus credenciales de base de datos:
   ```bash
   cp .env.example .env
   ```
3. Crea la tabla en PostgreSQL:
   ```sql
   CREATE TABLE dolar_price_logs (
       id SERIAL PRIMARY KEY,
       precio_ves DECIMAL NOT NULL,
       fecha_consulta_api TIMESTAMPTZ NOT NULL,
       fuente VARCHAR(50),
       acurast_job_id VARCHAR(100),
       execution_timestamp TIMESTAMPTZ NOT NULL,
       received_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

### 3. Ejecución
- **Modo Desarrollo**: `npm run dev`
- **Simular Job de Acurast**: `npm run test:acurast`

---

## 🌐 Despliegue en Acurast

1.  **Exponer Backend**: Ejecuta `ngrok http 3000` y copia la URL.
2.  **Configurar Webhook**: Actualiza la variable `CALLBACK_URL` en el Secret de Acurast con tu URL de ngrok + `/api/v1/webhook/acurast`.
3.  **Subir Script**: Carga el archivo `acurast/dolar-tracker.js` a IPFS (vía Pinata).
4.  **Crear Deployment**: En la consola de Acurast, crea el job usando el CID de IPFS y configura el cronograma deseado.

---

## ✅ Resultados de Validación
- [x] Endpoint Webhook operativo.
- [x] Validación de esquema JSON exitosa.
- [x] Conexión y persistencia en DB verificada.
- [x] Ejecución exitosa desde el entorno real de Acurast.

---
**Desarrollado con ❤️ para el ecosistema Web3.**
