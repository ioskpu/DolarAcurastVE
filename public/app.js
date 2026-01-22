// Configuración
let currentPage = 1;
const perPage = 20;
let currentJobId = '';
let autoRefreshInterval;

// Elementos del DOM
const pricesTableBody = document.getElementById('prices-table-body');
const mainPrice = document.getElementById('main-price');
const mainPriceDate = document.getElementById('main-price-date');
const mainPriceJob = document.getElementById('main-price-job');
const jobFilter = document.getElementById('job-filter');
const lastUpdateTime = document.getElementById('last-update-time');
const refreshBtn = document.getElementById('refresh-btn');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentRange = document.getElementById('current-range');
const totalResults = document.getElementById('total-results');

// Función principal de carga de datos
async function fetchPrices(page = 1, jobId = '') {
    try {
        let url = `/api/v1/prices?page=${page}&per_page=${perPage}`;
        if (jobId) url += `&job_id=${encodeURIComponent(jobId)}`;

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            renderDashboard(result.data, result.pagination);
            if (page === 1 && !jobId) {
                updateHighlight(result.data[0]);
                updateJobFilter(result.data);
            }
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        pricesTableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-10 text-center text-red-400">Error al conectar con la API</td></tr>';
    } finally {
        lastUpdateTime.innerText = `Última actualización: ${new Date().toLocaleTimeString()}`;
    }
}

// Actualizar la tarjeta destacada
function updateHighlight(lastEntry) {
    if (!lastEntry) return;
    mainPrice.innerText = parseFloat(lastEntry.precio_ves).toFixed(2);
    mainPriceDate.innerText = `Fecha API: ${new Date(lastEntry.fecha_consulta_api).toLocaleString()}`;
    mainPriceJob.innerText = `Job ID: ${lastEntry.acurast_job_id || 'N/A'}`;
}

// Renderizar la tabla y paginación
function renderDashboard(data, pagination) {
    if (data.length === 0) {
        pricesTableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-10 text-center text-gray-400">No hay datos disponibles</td></tr>';
        return;
    }

    pricesTableBody.innerHTML = data.map(row => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                ${new Date(row.fecha_consulta_api).toLocaleString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                ${parseFloat(row.precio_ves).toFixed(2)} VES
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-500 font-mono">
                ${row.acurast_job_id || 'N/A'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                ${new Date(row.received_at).toLocaleString()}
            </td>
        </tr>
    `).join('');

    // Actualizar controles de paginación
    totalResults.innerText = pagination.total;
    const start = (pagination.page - 1) * pagination.per_page + 1;
    const end = Math.min(pagination.page * pagination.per_page, pagination.total);
    currentRange.innerText = pagination.total > 0 ? `${start}-${end}` : '0-0';

    prevPageBtn.disabled = pagination.page <= 1;
    nextPageBtn.disabled = pagination.page >= pagination.total_pages;
}

// Actualizar las opciones del filtro (solo con IDs únicos)
const knownJobs = new Set();
function updateJobFilter(data) {
    data.forEach(row => {
        if (row.acurast_job_id && !knownJobs.has(row.acurast_job_id)) {
            knownJobs.add(row.acurast_job_id);
            const option = document.createElement('option');
            option.value = row.acurast_job_id;
            option.textContent = row.acurast_job_id;
            jobFilter.appendChild(option);
        }
    });
}

// Event Listeners
jobFilter.addEventListener('change', (e) => {
    currentJobId = e.target.value;
    currentPage = 1;
    fetchPrices(currentPage, currentJobId);
});

refreshBtn.addEventListener('click', () => {
    fetchPrices(currentPage, currentJobId);
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchPrices(currentPage, currentJobId);
    }
});

nextPageBtn.addEventListener('click', () => {
    currentPage++;
    fetchPrices(currentPage, currentJobId);
});

// Inicialización y Auto-refresh
function init() {
    fetchPrices();
    
    // Configurar actualización automática cada 60 segundos
    autoRefreshInterval = setInterval(() => {
        // Solo actualizar automáticamente si estamos en la página 1
        if (currentPage === 1) {
            fetchPrices(1, currentJobId);
        }
    }, 60000);
}

init();
