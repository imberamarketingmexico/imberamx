/**
 * Imbera SuperAdmin - Scorecard Comercial Analytics & Data
 */

document.addEventListener('DOMContentLoaded', () => {
    const MASTER_PASS = 'Imbera2026$';
    const AUTH_STORAGE_KEY = 'imb_superadmin_auth';

    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');
    const adminPassword = document.getElementById('adminPassword');
    const loginError = document.getElementById('loginError');
    const btnLogout = document.getElementById('btnLogout');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnExportCsv = document.getElementById('btnExportCsv');

    const kpiVisits = document.getElementById('kpiVisits');
    const kpiResponses = document.getElementById('kpiResponses');
    const kpiRate = document.getElementById('kpiRate');
    const kpiCsat = document.getElementById('kpiCsat');

    const tableBody = document.getElementById('tableBody');
    const tableSearch = document.getElementById('tableSearch');
    const tableCountLabel = document.getElementById('tableCountLabel');

    const detailModal = document.getElementById('detailModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    // Chart instances store to avoid re-creation memory leaks
    const chartInstances = {};
    let allResponses = [];
    let allVisits = [];

    // --- 1. Autenticación Persistente ---
    function checkAuth() {
        const isAuth = localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
        if (isAuth) {
            loginOverlay.style.display = 'none';
            loadDashboardData();
        } else {
            loginOverlay.style.display = 'flex';
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (adminPassword.value.trim() === MASTER_PASS) {
            localStorage.setItem(AUTH_STORAGE_KEY, 'true');
            loginOverlay.style.display = 'none';
            loginError.style.display = 'none';
            loadDashboardData();
        } else {
            loginError.style.display = 'block';
            adminPassword.value = '';
            adminPassword.focus();
        }
    });

    btnLogout.addEventListener('click', () => {
        if (confirm('¿Deseas cerrar la sesión de SuperAdmin?')) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            window.location.reload();
        }
    });

    btnRefresh.addEventListener('click', () => {
        btnRefresh.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Actualizando...';
        loadDashboardData().finally(() => {
            btnRefresh.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Actualizar';
        });
    });

    // Tabs Navigation
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId)?.classList.add('active');
        });
    });

    // Modal Close
    modalCloseBtn.addEventListener('click', () => detailModal.classList.remove('active'));
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) detailModal.classList.remove('active');
    });

    // --- 2. Carga de Datos desde Supabase ---
    async function loadDashboardData() {
        const sb = window.imberaSupabase ? window.imberaSupabase.client() : null;
        if (!sb) {
            console.error('Supabase no disponible.');
            return;
        }

        try {
            // Consultar visitas y respuestas en paralelo
            const [visitsRes, responsesRes] = await Promise.all([
                sb.from('encuesta_visitas').select('*').order('created_at', { ascending: false }),
                sb.from('encuesta_respuestas').select('*').order('created_at', { ascending: false })
            ]);

            allVisits = visitsRes.data || [];
            allResponses = responsesRes.data || [];

            console.log(`[SuperAdmin] Cargadas ${allVisits.length} visitas y ${allResponses.length} respuestas.`);

            updateKpis();
            try {
                renderCharts();
            } catch (errCharts) {
                console.error('Error renderizando gráficas:', errCharts);
            }
            renderTable(allResponses);
        } catch (err) {
            console.error('Error al cargar datos del scorecard:', err);
        }
    }

    // --- 3. Actualizar KPIs Superiores ---
    function updateKpis() {
        const totalVisits = allVisits.length;
        const totalResp = allResponses.length;
        
        kpiVisits.innerText = totalVisits.toLocaleString('es-MX');
        kpiResponses.innerText = totalResp.toLocaleString('es-MX');

        // Tasa de finalización
        const rate = totalVisits > 0 ? Math.round((totalResp / totalVisits) * 100) : (totalResp > 0 ? 100 : 0);
        kpiRate.innerText = `${rate}%`;

        // CSAT Promedio Global (Preguntas de escala 1 a 5: P1, P2, P3, P9, P10)
        let sumRatings = 0;
        let countRatings = 0;

        allResponses.forEach(r => {
            [r.p1_rating, r.p2_rating, r.p3_rating, r.p9_rating, r.p10_rating].forEach(val => {
                if (val && !isNaN(val)) {
                    sumRatings += val;
                    countRatings++;
                }
            });
        });

        if (countRatings > 0) {
            const csatAvg = (sumRatings / countRatings).toFixed(1);
            kpiCsat.innerText = `${csatAvg} / 5.0`;
        } else {
            kpiCsat.innerText = '-';
        }
    }

    // --- 4. Renderizado de Gráficas por Pregunta ---
    function renderCharts() {
        if (typeof Chart === 'undefined') return;

        // Helpers de agregación
        function getScaleCounts(key, maxScale = 5) {
            const counts = Array(maxScale).fill(0);
            let sum = 0;
            let valid = 0;

            allResponses.forEach(r => {
                const val = r[key];
                if (val >= 1 && val <= maxScale) {
                    counts[val - 1]++;
                    sum += val;
                    valid++;
                }
            });

            const avg = valid > 0 ? (sum / valid).toFixed(2) : '-';
            return { counts, avg, total: valid };
        }

        function getFactorsCount(factorsKey, otherKey) {
            const map = {};
            let otherList = [];

            allResponses.forEach(r => {
                const arr = r[factorsKey] || [];
                arr.forEach(f => {
                    map[f] = (map[f] || 0) + 1;
                });
                if (r[otherKey] && r[otherKey].trim()) {
                    otherList.push(r[otherKey].trim());
                }
            });

            return { map, otherList };
        }

        function createOrUpdateChart(id, config) {
            const canvas = document.getElementById(id);
            if (!canvas) return;

            try {
                if (typeof Chart !== 'undefined') {
                    const existing = Chart.getChart(canvas);
                    if (existing) {
                        existing.destroy();
                    } else if (chartInstances[id]) {
                        chartInstances[id].destroy();
                    }
                    chartInstances[id] = new Chart(canvas, config);
                }
            } catch (chartErr) {
                console.warn(`Error al renderizar gráfica ${id}:`, chartErr);
            }
        }

        // Gráfica de Barras para Escalas (P1, P2, P3, P9, P10)
        function renderScaleChart(chartId, avgId, factorsId, pKey, factorsKey, otherKey, labels) {
            const data = getScaleCounts(pKey, labels.length);
            document.getElementById(avgId).innerText = `Promedio: ${data.avg} / ${labels.length}.0 (${data.total} respuestas)`;

            createOrUpdateChart(chartId, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Votos',
                        data: data.counts,
                        backgroundColor: '#004d61',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    }
                }
            });

            // Listado de factores
            if (factorsId) {
                const fData = getFactorsCount(factorsKey, otherKey);
                const container = document.getElementById(factorsId).querySelector('.factors-content');
                if (container) {
                    const sorted = Object.entries(fData.map).sort((a, b) => b[1] - a[1]);
                    if (sorted.length === 0 && fData.otherList.length === 0) {
                        container.innerHTML = '<div style="color:#94a3b8; font-size:12px;">Sin factores registrados aún.</div>';
                    } else {
                        let html = '';
                        sorted.forEach(([factor, count]) => {
                            html += `
                                <div class="factor-item">
                                    <span>${factor}</span>
                                    <span class="factor-count">${count}</span>
                                </div>
                            `;
                        });
                        if (fData.otherList.length > 0) {
                            html += `
                                <div class="factor-item" style="margin-top:6px; border-top: 1px dashed #e2e8f0; padding-top:4px;">
                                    <span><strong>Otros comentarios:</strong> ${fData.otherList.join('; ')}</span>
                                    <span class="factor-count">${fData.otherList.length}</span>
                                </div>
                            `;
                        }
                        container.innerHTML = html;
                    }
                }
            }
        }

        const scaleLabels5 = ['1 (Muy insatisfecho)', '2 (Insatisfecho)', '3 (Neutral)', '4 (Satisfecho)', '5 (Muy Satisfecho)'];
        
        // P1
        renderScaleChart('chart_p1', 'avg_p1', 'factors_p1', 'p1_rating', 'p1_factors', 'p1_other', scaleLabels5);

        // P2
        renderScaleChart('chart_p2', 'avg_p2', 'factors_p2', 'p2_rating', 'p2_factors', 'p2_other', scaleLabels5);

        // P3
        renderScaleChart('chart_p3', 'avg_p3', 'factors_p3', 'p3_rating', 'p3_factors', 'p3_other', scaleLabels5);

        // P4 (Escala 1 a 4)
        const scaleLabelsP4 = ['1: No resolvió', '2: Insuficiente', '3: Parcial', '4: Completo'];
        renderScaleChart('chart_p4', 'avg_p4', 'factors_p4', 'p4_rating', 'p4_factors', 'p4_other', scaleLabelsP4);

        // P5 (Familiaridad 1 a 4)
        const scaleLabelsP5 = ['1: No las conozco', '2: He escuchado', '3: Conozco algunas', '4: Las conozco muy bien'];
        const p5Data = getScaleCounts('p5_rating', 4);
        document.getElementById('avg_p5').innerText = `Nivel promedio: ${p5Data.avg} / 4.0 (${p5Data.total} respuestas)`;
        createOrUpdateChart('chart_p5', {
            type: 'bar',
            data: {
                labels: scaleLabelsP5,
                datasets: [{
                    label: 'Respuestas',
                    data: p5Data.counts,
                    backgroundColor: '#0d9488',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });

        // P6 (Uso Smart Cooler - Radio)
        const p6Counts = { 'si_actualmente': 0, 'si_probadas': 0, 'no': 0 };
        allResponses.forEach(r => {
            if (r.p6_answer && p6Counts.hasOwnProperty(r.p6_answer)) {
                p6Counts[r.p6_answer]++;
            }
        });
        createOrUpdateChart('chart_p6', {
            type: 'doughnut',
            data: {
                labels: ['Sí, actualmente las utilizo', 'Sí, las he probado', 'No'],
                datasets: [{
                    data: [p6Counts['si_actualmente'], p6Counts['si_probadas'], p6Counts['no']],
                    backgroundColor: ['#005a36', '#0284c7', '#94a3b8']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });

        // P7 (Atributos de Mayor Valor: Smart, Conectividad, IoT)
        const p7Counts = {};
        allResponses.forEach(r => {
            ['p7_smart', 'p7_conectividad', 'p7_iot'].forEach(catKey => {
                const arr = r[catKey] || [];
                arr.forEach(attr => {
                    p7Counts[attr] = (p7Counts[attr] || 0) + 1;
                });
            });
        });
        const p7Labels = Object.keys(p7Counts);
        const p7Values = Object.values(p7Counts);

        createOrUpdateChart('chart_p7', {
            type: 'bar',
            data: {
                labels: p7Labels.length > 0 ? p7Labels : ['Sin respuestas aún'],
                datasets: [{
                    label: 'Frecuencia de selección',
                    data: p7Values.length > 0 ? p7Values : [0],
                    backgroundColor: '#0284c7',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });

        // P8 (Uso de Sostenibilidad - Radio)
        const p8Counts = { 'si': 0, 'no': 0 };
        allResponses.forEach(r => {
            if (r.p8_answer === 'si') p8Counts['si']++;
            if (r.p8_answer === 'no') p8Counts['no']++;
        });
        createOrUpdateChart('chart_p8', {
            type: 'doughnut',
            data: {
                labels: ['Sí, actualmente las utilizo', 'No'],
                datasets: [{
                    data: [p8Counts['si'], p8Counts['no']],
                    backgroundColor: ['#005a36', '#94a3b8']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });

        // P9
        renderScaleChart('chart_p9', 'avg_p9', 'factors_p9', 'p9_rating', 'p9_factors', 'p9_other', scaleLabels5);

        // P10
        renderScaleChart('chart_p10', 'avg_p10', 'factors_p10', 'p10_rating', 'p10_factors', 'p10_other', scaleLabels5);
    }

    // --- 5. Renderizado de Tabla de Respuestas Detalladas ---
    function renderTable(dataList) {
        tableCountLabel.innerText = `${dataList.length} encuesta(s) completada(s)`;

        if (dataList.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; color: var(--slate-500); padding: 30px;">No hay encuestas registradas todavía.</td></tr>';
            return;
        }

        function formatRatingBadge(val) {
            if (!val) return '<span style="color:#94a3b8;">-</span>';
            return `<span class="rating-badge rating-${val}">${val} / 5</span>`;
        }

        function formatP6Badge(val) {
            if (val === 'si_actualmente') return '<span style="color:#166534; font-weight:700;">Sí (Usa)</span>';
            if (val === 'si_probadas') return '<span style="color:#0369a1; font-weight:700;">Sí (Probó)</span>';
            if (val === 'no') return '<span style="color:#64748b;">No</span>';
            return '-';
        }

        function formatP8Badge(val) {
            if (val === 'si') return '<span style="color:#166534; font-weight:700;">Sí</span>';
            if (val === 'no') return '<span style="color:#64748b;">No</span>';
            return '-';
        }

        let html = '';
        dataList.forEach((r, idx) => {
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleString('es-MX', {
                timeZone: 'America/Mexico_City',
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }) : 'Reciente';

            html += `
                <tr>
                    <td style="font-weight: 700; color: var(--slate-500);">#${dataList.length - idx}</td>
                    <td style="font-weight: 600;">${dateStr}</td>
                    <td>${formatRatingBadge(r.p1_rating)}</td>
                    <td>${formatRatingBadge(r.p2_rating)}</td>
                    <td>${formatRatingBadge(r.p3_rating)}</td>
                    <td><span class="rating-badge rating-${r.p4_rating || 3}">${r.p4_rating ? r.p4_rating + '/4' : '-'}</span></td>
                    <td>${r.p5_rating ? r.p5_rating + '/4' : '-'}</td>
                    <td>${formatP6Badge(r.p6_answer)}</td>
                    <td>${formatP8Badge(r.p8_answer)}</td>
                    <td>${formatRatingBadge(r.p9_rating)}</td>
                    <td>${formatRatingBadge(r.p10_rating)}</td>
                    <td>
                        <button type="button" class="btn-view-detail" data-idx="${idx}">Ver Detalle</button>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;

        // Eventos para abrir modal de detalle
        tableBody.querySelectorAll('.btn-view-detail').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-idx'), 10);
                showDetailModal(dataList[idx]);
            });
        });
    }

    // Buscador en tabla
    tableSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderTable(allResponses);
            return;
        }

        const filtered = allResponses.filter((r, idx) => {
            const num = (allResponses.length - idx).toString();
            const dateStr = new Date(r.created_at).toLocaleString('es-MX');
            const otherText = (r.p1_other || '') + (r.p2_other || '') + (r.p3_other || '') + (r.p10_other || '');
            return num.includes(query) || dateStr.toLowerCase().includes(query) || otherText.toLowerCase().includes(query);
        });

        renderTable(filtered);
    });

    // --- 6. Modal de Detalle de una Encuesta ---
    function showDetailModal(r) {
        if (!r) return;
        const dateStr = r.created_at ? new Date(r.created_at).toLocaleString('es-MX') : 'Reciente';
        modalTitle.innerText = `Detalle de Encuesta (${dateStr})`;

        function renderRow(num, title, answer, factors, other) {
            let fHtml = '';
            if (factors && factors.length > 0) {
                fHtml += `<div class="detail-factors"><strong>Factores seleccionados:</strong> ${factors.join(', ')}</div>`;
            }
            if (other) {
                fHtml += `<div class="detail-factors" style="margin-top:4px;"><strong>Comentario 'Otro':</strong> ${other}</div>`;
            }

            return `
                <div class="detail-row">
                    <div class="detail-q">Pregunta ${num}: ${title}</div>
                    <div class="detail-a">${answer}</div>
                    ${fHtml}
                </div>
            `;
        }

        let bodyHtml = `
            ${renderRow(1, 'Cumplimiento de entregas, tiempos y cantidades', `${r.p1_rating ? r.p1_rating + ' / 5.0' : 'Sin respuesta'}`, r.p1_factors, r.p1_other)}
            ${renderRow(2, 'Estado físico y recepción de equipos', `${r.p2_rating ? r.p2_rating + ' / 5.0' : 'Sin respuesta'}`, r.p2_factors, r.p2_other)}
            ${renderRow(3, 'Atención y solución de fallas / garantías', `${r.p3_rating ? r.p3_rating + ' / 5.0' : 'Sin respuesta'}`, r.p3_factors, r.p3_other)}
            ${renderRow(4, 'Soporte postventa y refacciones', `${r.p4_rating ? r.p4_rating + ' / 4.0' : 'Sin respuesta'}`, r.p4_factors, r.p4_other)}
            ${renderRow(5, 'Familiaridad con innovación y tecnología Imbera', `${r.p5_rating ? r.p5_rating + ' / 4.0' : 'Sin respuesta'}`, null, null)}
            ${renderRow(6, 'Uso de soluciones Smart Cooler', `${r.p6_answer || 'Sin respuesta'}`, null, null)}
            <div class="detail-row">
                <div class="detail-q">Pregunta 7: Atributos de mayor valor por solución</div>
                <div class="detail-factors"><strong>Smart:</strong> ${(r.p7_smart || []).join(', ') || 'Ninguno'}</div>
                <div class="detail-factors" style="margin-top:4px;"><strong>Conectividad:</strong> ${(r.p7_conectividad || []).join(', ') || 'Ninguno'}</div>
                <div class="detail-factors" style="margin-top:4px;"><strong>IoT:</strong> ${(r.p7_iot || []).join(', ') || 'Ninguno'}</div>
            </div>
            ${renderRow(8, 'Uso de soluciones de sostenibilidad', `${r.p8_answer === 'si' ? 'Sí' : (r.p8_answer === 'no' ? 'No' : 'Sin respuesta')}`, null, null)}
            ${renderRow(9, 'Satisfacción con sostenibilidad', `${r.p9_rating ? r.p9_rating + ' / 5.0' : 'Sin respuesta'}`, r.p9_factors, r.p9_other)}
            ${renderRow(10, 'Relación y acompañamiento con equipo comercial', `${r.p10_rating ? r.p10_rating + ' / 5.0' : 'Sin respuesta'}`, r.p10_factors, r.p10_other)}
        `;

        modalBody.innerHTML = bodyHtml;
        detailModal.classList.add('active');
    }

    // --- 7. Exportar a CSV ---
    btnExportCsv.addEventListener('click', () => {
        if (allResponses.length === 0) {
            alert('Aún no hay respuestas para exportar.');
            return;
        }

        const headers = [
            'ID',
            'Fecha y Hora',
            'P1 Entrega (Rating 1-5)',
            'P1 Factores',
            'P1 Otro',
            'P2 Estado Fisico (Rating 1-5)',
            'P2 Factores',
            'P2 Otro',
            'P3 Atencion Fallas (Rating 1-5)',
            'P3 Factores',
            'P3 Otro',
            'P4 Soporte Postventa (Rating 1-4)',
            'P4 Factores',
            'P4 Otro',
            'P5 Innovacion (Rating 1-4)',
            'P6 Smart Cooler',
            'P7 Smart Atributos',
            'P7 Conectividad Atributos',
            'P7 IoT Atributos',
            'P8 Sostenibilidad Uso',
            'P9 Sostenibilidad (Rating 1-5)',
            'P9 Factores',
            'P9 Otro',
            'P10 Equipo Comercial (Rating 1-5)',
            'P10 Factores',
            'P10 Otro'
        ];

        function escapeCsv(val) {
            if (val === null || val === undefined) return '""';
            const str = Array.isArray(val) ? val.join('; ') : val.toString();
            return `"${str.replace(/"/g, '""')}"`;
        }

        let csvRows = [];
        csvRows.push(headers.join(','));

        allResponses.forEach((r, idx) => {
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleString('es-MX') : '';
            const row = [
                idx + 1,
                escapeCsv(dateStr),
                escapeCsv(r.p1_rating),
                escapeCsv(r.p1_factors),
                escapeCsv(r.p1_other),
                escapeCsv(r.p2_rating),
                escapeCsv(r.p2_factors),
                escapeCsv(r.p2_other),
                escapeCsv(r.p3_rating),
                escapeCsv(r.p3_factors),
                escapeCsv(r.p3_other),
                escapeCsv(r.p4_rating),
                escapeCsv(r.p4_factors),
                escapeCsv(r.p4_other),
                escapeCsv(r.p5_rating),
                escapeCsv(r.p6_answer),
                escapeCsv(r.p7_smart),
                escapeCsv(r.p7_conectividad),
                escapeCsv(r.p7_iot),
                escapeCsv(r.p8_answer),
                escapeCsv(r.p9_rating),
                escapeCsv(r.p9_factors),
                escapeCsv(r.p9_other),
                escapeCsv(r.p10_rating),
                escapeCsv(r.p10_factors),
                escapeCsv(r.p10_other)
            ];
            csvRows.push(row.join(','));
        });

        // Generar descarga con BOM UTF-8 para Excel
        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `encuesta_satisfaccion_imbera_${now}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Iniciar verificación de login
    checkAuth();
});
