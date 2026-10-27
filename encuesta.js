/**
 * Imbera Scorecard Comercial - Lógica de Encuesta por Pasos
 */

document.addEventListener('DOMContentLoaded', () => {
    let currentStep = 0;
    const totalSteps = 10;
    
    // Almacén de respuestas
    const surveyData = {
        nombre: '',
        empresa: '',
        rol: '',
        rol_otro: '',

        p1: null,
        p1_factors: [],
        p1_other: '',
        
        p2: null,
        p2_factors: [],
        p2_other: '',
        
        p3: null,
        p3_factors: [],
        p3_other: '',
        
        p4: null,
        p4_factors: [],
        p4_other: '',
        
        p5: null,
        
        p6: null,
        
        p7_smart: [],
        p7_conectividad: [],
        p7_iot: [],
        
        p8: null,
        
        p9: null,
        p9_factors: [],
        p9_other: '',
        
        p10: null,
        p10_factors: [],
        p10_other: ''
    };

    const progressBar = document.getElementById('progressBar');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const surveyActions = document.getElementById('surveyActions');
    const stepViews = document.querySelectorAll('.survey-step-view[data-step]');
    const successView = document.getElementById('surveySuccessView');

    // Registrar o recuperar visita en Supabase para trazabilidad de aperturas
    let visitId = sessionStorage.getItem('imb_survey_visit_id');

    async function recordVisitStart() {
        if (!visitId && window.imberaSupabase) {
            try {
                const sb = window.imberaSupabase.client();
                if (sb) {
                    const { data, error } = await sb.from('encuesta_visitas').insert([{
                        user_agent: navigator.userAgent || 'unknown',
                        path: window.location.pathname || '/encuesta'
                    }]).select('id').single();

                    if (data && data.id) {
                        visitId = data.id;
                        sessionStorage.setItem('imb_survey_visit_id', visitId);
                    }
                }
            } catch (err) {
                console.warn('Visita registrada localmente:', err);
            }
        }
    }
    recordVisitStart();

    // Dropdown Rol: Mostrar u ocultar campo especifique si es "Otro"
    const selRol = document.getElementById('userRol');
    const groupRolOtro = document.getElementById('groupRolOtro');
    const inpRolOtro = document.getElementById('userRolOtro');
    if (selRol && groupRolOtro) {
        selRol.addEventListener('change', (e) => {
            selRol.classList.remove('error');
            if (e.target.value === 'Otro') {
                groupRolOtro.classList.remove('hidden');
                if (inpRolOtro) inpRolOtro.focus();
            } else {
                groupRolOtro.classList.add('hidden');
                if (inpRolOtro) inpRolOtro.value = '';
            }
        });
    }

    // Limpiar errores en inputs de paso 0 al escribir
    ['userNombre', 'userEmpresa', 'userRolOtro'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => el.classList.remove('error'));
        }
    });

    // Actualizar visualización del paso actual
    function updateStepView() {
        stepViews.forEach(view => {
            const stepNum = parseInt(view.getAttribute('data-step'), 10);
            view.classList.toggle('active', stepNum === currentStep);
        });

        // Actualizar barra de progreso (Paso 0 = 5%, Pasos 1 a 10 = 10% a 100%)
        const progressPercent = currentStep === 0 ? 5 : (currentStep / totalSteps) * 100;
        progressBar.style.width = `${progressPercent}%`;

        // Botón Anterior
        if (currentStep === 0) {
            btnPrev.classList.add('hidden');
            btnNext.innerText = 'Comenzar';
        } else if (currentStep === totalSteps) {
            btnPrev.classList.remove('hidden');
            btnNext.innerText = 'Finalizar';
        } else {
            btnPrev.classList.remove('hidden');
            btnNext.innerText = 'Siguiente';
        }

        // Scroll al tope del card suavemente
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Manejar selección de escalas (1 a 5 o 1 a 4)
    document.querySelectorAll('.survey-scale-group').forEach(group => {
        const questionKey = group.getAttribute('data-question');
        const options = group.querySelectorAll('.survey-scale-option');

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                const val = parseInt(opt.getAttribute('data-value'), 10);
                surveyData[questionKey] = val;
            });
        });
    });

    // Manejar selección de checkboxes (Factores)
    document.querySelectorAll('.survey-checkbox-group').forEach(group => {
        const questionKey = group.getAttribute('data-question');
        const items = group.querySelectorAll('.survey-checkbox-item');

        items.forEach(item => {
            item.addEventListener('click', () => {
                item.classList.toggle('active');
                const val = item.getAttribute('data-val');

                if (!Array.isArray(surveyData[questionKey])) {
                    surveyData[questionKey] = [];
                }

                if (item.classList.contains('active')) {
                    if (!surveyData[questionKey].includes(val)) {
                        surveyData[questionKey].push(val);
                    }
                } else {
                    surveyData[questionKey] = surveyData[questionKey].filter(v => v !== val);
                }
            });
        });
    });

    // Manejar selección de Radios (Pregunta 6 y 8)
    document.querySelectorAll('.survey-radio-group').forEach(group => {
        const questionKey = group.getAttribute('data-question');
        const items = group.querySelectorAll('.survey-radio-item');

        items.forEach(item => {
            item.addEventListener('click', () => {
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const val = item.getAttribute('data-value');
                surveyData[questionKey] = val;
            });
        });
    });

    // Campos "Otro: ..."
    ['p1_other', 'p2_other', 'p3_other', 'p4_other', 'p9_other', 'p10_other'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                surveyData[id] = e.target.value.trim();
            });
        }
    });

    // Navegación: Botón Anterior
    btnPrev.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            updateStepView();
        }
    });

    // Navegación: Botón Siguiente / Finalizar
    btnNext.addEventListener('click', async () => {
        // Paso 0: Validación de Datos del Participante
        if (currentStep === 0) {
            const inpNombre = document.getElementById('userNombre');
            const inpEmpresa = document.getElementById('userEmpresa');
            const selRol = document.getElementById('userRol');
            const inpRolOtro = document.getElementById('userRolOtro');

            const nombreVal = inpNombre ? inpNombre.value.trim() : '';
            const empresaVal = inpEmpresa ? inpEmpresa.value.trim() : '';
            const rolVal = selRol ? selRol.value : '';
            const rolOtroVal = inpRolOtro ? inpRolOtro.value.trim() : '';

            let hasError = false;

            if (!nombreVal) {
                if (inpNombre) inpNombre.classList.add('error');
                hasError = true;
            } else if (inpNombre) {
                inpNombre.classList.remove('error');
            }

            if (!empresaVal) {
                if (inpEmpresa) inpEmpresa.classList.add('error');
                hasError = true;
            } else if (inpEmpresa) {
                inpEmpresa.classList.remove('error');
            }

            if (!rolVal) {
                if (selRol) selRol.classList.add('error');
                hasError = true;
            } else if (selRol) {
                selRol.classList.remove('error');
            }

            if (rolVal === 'Otro' && !rolOtroVal) {
                if (inpRolOtro) inpRolOtro.classList.add('error');
                hasError = true;
            } else if (inpRolOtro) {
                inpRolOtro.classList.remove('error');
            }

            if (hasError) {
                const firstErr = document.querySelector('.survey-form-input.error, .survey-form-select.error');
                if (firstErr) {
                    firstErr.focus();
                    firstErr.style.transform = 'translateX(4px)';
                    setTimeout(() => firstErr.style.transform = 'translateX(-4px)', 80);
                    setTimeout(() => firstErr.style.transform = 'translateX(0)', 160);
                }
                return;
            }

            surveyData.nombre = nombreVal;
            surveyData.empresa = empresaVal;
            surveyData.rol = rolVal;
            surveyData.rol_otro = rolVal === 'Otro' ? rolOtroVal : '';

            currentStep = 1;
            updateStepView();
            return;
        }

        // Validación pasos 1 a 10
        let answered = true;
        if (currentStep === 1 && surveyData.p1 === null) answered = false;
        if (currentStep === 2 && surveyData.p2 === null) answered = false;
        if (currentStep === 3 && surveyData.p3 === null) answered = false;
        if (currentStep === 4 && surveyData.p4 === null) answered = false;
        if (currentStep === 5 && surveyData.p5 === null) answered = false;
        if (currentStep === 6 && surveyData.p6 === null) answered = false;
        if (currentStep === 8 && surveyData.p8 === null) answered = false;
        if (currentStep === 9 && surveyData.p9 === null) answered = false;
        if (currentStep === 10 && surveyData.p10 === null) answered = false;

        if (!answered) {
            // Animación suave de aviso en el grupo de escala/radio
            const activeStepEl = document.querySelector(`.survey-step-view[data-step="${currentStep}"]`);
            const targetGroup = activeStepEl.querySelector('.survey-scale-group, .survey-radio-group');
            if (targetGroup) {
                targetGroup.style.transform = 'translateX(6px)';
                setTimeout(() => targetGroup.style.transform = 'translateX(-6px)', 80);
                setTimeout(() => targetGroup.style.transform = 'translateX(4px)', 160);
                setTimeout(() => targetGroup.style.transform = 'translateX(0)', 240);
            }
            return;
        }

        if (currentStep < totalSteps) {
            currentStep++;
            updateStepView();
        } else {
            // ENVIAR ENCUESTA FINAL (Paso 10 completado)
            await submitSurvey();
        }
    });

    // Guardar encuesta completa en Supabase
    async function submitSurvey() {
        btnNext.disabled = true;
        btnNext.innerHTML = 'Enviando...';

        try {
            const payload = {
                nombre: surveyData.nombre || null,
                empresa: surveyData.empresa || null,
                rol: surveyData.rol || null,
                rol_otro: surveyData.rol_otro || null,

                p1_rating: surveyData.p1,
                p1_factors: surveyData.p1_factors || [],
                p1_other: surveyData.p1_other || null,
                
                p2_rating: surveyData.p2,
                p2_factors: surveyData.p2_factors || [],
                p2_other: surveyData.p2_other || null,
                
                p3_rating: surveyData.p3,
                p3_factors: surveyData.p3_factors || [],
                p3_other: surveyData.p3_other || null,
                
                p4_rating: surveyData.p4,
                p4_factors: surveyData.p4_factors || [],
                p4_other: surveyData.p4_other || null,
                
                p5_rating: surveyData.p5,
                
                p6_answer: surveyData.p6,
                
                p7_smart: surveyData.p7_smart || [],
                p7_conectividad: surveyData.p7_conectividad || [],
                p7_iot: surveyData.p7_iot || [],
                
                p8_answer: surveyData.p8,
                
                p9_rating: surveyData.p9,
                p9_factors: surveyData.p9_factors || [],
                p9_other: surveyData.p9_other || null,
                
                p10_rating: surveyData.p10,
                p10_factors: surveyData.p10_factors || [],
                p10_other: surveyData.p10_other || null,
                
                respuestas_json: surveyData
            };

            const sb = window.imberaSupabase ? window.imberaSupabase.client() : null;
            if (sb) {
                let { error: insertError } = await sb.from('encuesta_respuestas').insert([payload]);

                // Fallback automático si las nuevas columnas no se han ejecutado en el SQL de Supabase
                if (insertError && (insertError.code === 'PGRST204' || insertError.message?.toLowerCase().includes('column'))) {
                    console.warn('Columnas directas no detectadas, guardando datos en respuestas_json...');
                    const fallbackPayload = { ...payload };
                    delete fallbackPayload.nombre;
                    delete fallbackPayload.empresa;
                    delete fallbackPayload.rol;
                    delete fallbackPayload.rol_otro;
                    const resFb = await sb.from('encuesta_respuestas').insert([fallbackPayload]);
                    insertError = resFb.error;
                }

                if (insertError) {
                    console.error('Error insertando respuestas:', insertError);
                    alert('No se pudo guardar la encuesta: ' + (insertError.message || 'Error de conexión'));
                    btnNext.disabled = false;
                    btnNext.innerText = 'Finalizar';
                    return;
                }
            } else {
                console.error('Cliente Supabase no disponible.');
                alert('No se pudo establecer conexión con el servidor. Inténtalo de nuevo.');
                btnNext.disabled = false;
                btnNext.innerText = 'Finalizar';
                return;
            }

            // Ocultar vistas de pasos y controles
            stepViews.forEach(v => v.classList.remove('active'));
            surveyActions.style.display = 'none';

            // Limpiar ID de visita para que próximas aperturas se cuenten
            sessionStorage.removeItem('imb_survey_visit_id');

            // Mostrar pantalla de éxito
            successView.classList.add('active');
            progressBar.style.width = '100%';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Excepción al guardar encuesta:', err);
            alert('Ocurrió un error al enviar la encuesta. Por favor inténtalo de nuevo.');
            btnNext.disabled = false;
            btnNext.innerText = 'Finalizar';
        }
    }

    // Inicializar primer paso
    updateStepView();
});
