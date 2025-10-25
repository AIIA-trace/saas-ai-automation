/**
 * Sistema de seguimiento de uso del plan
 * Permite registrar y consultar el uso de llamadas, emails y usuarios
 * para cada usuario específico del sistema
 */

// Constantes para los límites de cada plan
const PLAN_LIMITS = {
    basic: {
        calls: 100,
        emails: 500,
        users: 1
    },
    professional: {
        calls: 1000,
        emails: 5000,
        users: 5
    },
    premium: {
        calls: Infinity,
        emails: Infinity,
        users: 15
    }
};

// Prefijo para la clave de almacenamiento en localStorage
const USAGE_STORAGE_PREFIX = 'dashboard_usage_data_user_';

/**
 * Obtiene el ID del usuario actual
 * @returns {string} ID del usuario o 'guest' si no hay usuario autenticado
 */
function getCurrentUserId() {
    try {
        // Intentar obtener datos del usuario del localStorage
        const userData = localStorage.getItem('user_data');
        if (userData) {
            const user = JSON.parse(userData);
            return user.id || user.userId || user.user_id || 'guest';
        }
    } catch (error) {
        console.error('Error obteniendo ID del usuario:', error);
    }
    
    return 'guest'; // Usuario invitado por defecto
}

/**
 * Obtiene la clave de almacenamiento específica para el usuario actual
 * @returns {string} Clave de almacenamiento
 */
function getUserStorageKey() {
    return USAGE_STORAGE_PREFIX + getCurrentUserId();
}

/**
 * Inicializa el sistema de seguimiento de uso
 * Si no hay datos previos, crea un registro inicial
 * @param {boolean} forceReset - Si es true, reinicia los datos aunque ya existan
 */
function initializeUsageTracker(forceReset = false) {
    console.log('🔄 Inicializando sistema de seguimiento de uso para el usuario actual...');
    
    // Obtener la clave de almacenamiento para el usuario actual
    const storageKey = getUserStorageKey();
    
    // Verificar si ya existen datos o si se debe forzar el reinicio
    if (forceReset || !localStorage.getItem(storageKey)) {
        // Crear datos iniciales
        const initialData = {
            currentPlan: 'professional', // Plan por defecto
            usage: {
                calls: 0,
                emails: 0,
                users: 1 // Al menos un usuario (el actual)
            },
            lastUpdated: new Date().toISOString(),
            userId: getCurrentUserId() // Guardar el ID del usuario
        };
        
        // Guardar datos iniciales
        localStorage.setItem(storageKey, JSON.stringify(initialData));
        console.log(`✅ Datos de uso inicializados para el usuario ${getCurrentUserId()}`);
    } else {
        console.log(`✅ Datos de uso existentes encontrados para el usuario ${getCurrentUserId()}`);
    }
}

/**
 * Obtiene los datos actuales de uso para el usuario actual
 * @returns {Object} Datos de uso actual
 */
function getUsageData() {
    const storageKey = getUserStorageKey();
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : null;
}

/**
 * Obtiene los datos de uso de un usuario específico
 * @param {string} userId - ID del usuario
 * @returns {Object} Datos de uso del usuario
 */
function getUserUsageData(userId) {
    if (!userId) return null;
    
    const storageKey = USAGE_STORAGE_PREFIX + userId;
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : null;
}

/**
 * Actualiza los datos de uso para el usuario actual
 * @param {Object} newData Nuevos datos a actualizar
 */
function updateUsageData(newData) {
    const storageKey = getUserStorageKey();
    const currentData = getUsageData() || {
        currentPlan: 'professional',
        usage: { calls: 0, emails: 0, users: 1 },
        lastUpdated: new Date().toISOString(),
        userId: getCurrentUserId()
    };
    
    // Actualizar solo los campos proporcionados
    const updatedData = {
        ...currentData,
        ...newData,
        usage: {
            ...currentData.usage,
            ...(newData.usage || {})
        },
        lastUpdated: new Date().toISOString(),
        userId: getCurrentUserId() // Asegurar que el ID del usuario siempre esté presente
    };
    
    localStorage.setItem(storageKey, JSON.stringify(updatedData));
    console.log(`✅ Datos de uso actualizados para el usuario ${getCurrentUserId()}`, updatedData);
    
    // Disparar evento para notificar cambios
    document.dispatchEvent(new CustomEvent('usageUpdated', { detail: updatedData }));
}

/**
 * Registra una nueva llamada
 */
function trackCall() {
    const data = getUsageData();
    if (data) {
        updateUsageData({
            usage: {
                calls: data.usage.calls + 1
            }
        });
    }
}

/**
 * Registra un nuevo email
 */
function trackEmail() {
    const data = getUsageData();
    if (data) {
        updateUsageData({
            usage: {
                emails: data.usage.emails + 1
            }
        });
    }
}

/**
 * Actualiza el número de usuarios
 * @param {number} count Número de usuarios
 */
function updateUserCount(count) {
    if (typeof count === 'number' && count > 0) {
        updateUsageData({
            usage: {
                users: count
            }
        });
    }
}

/**
 * Cambia el plan actual
 * @param {string} plan Nombre del plan ('basic', 'professional', 'premium')
 */
function changePlan(plan) {
    if (['basic', 'professional', 'premium'].includes(plan)) {
        updateUsageData({
            currentPlan: plan
        });
    }
}

/**
 * Obtiene los límites del plan actual
 * @returns {Object} Límites del plan actual
 */
function getCurrentPlanLimits() {
    const data = getUsageData();
    return data ? PLAN_LIMITS[data.currentPlan] : PLAN_LIMITS.professional;
}

/**
 * Actualiza la UI con los datos de uso actuales
 */
function updateUsageUI() {
    const data = getUsageData();
    if (!data) return;
    
    const limits = getCurrentPlanLimits();
    
    // Actualizar contadores de llamadas
    const callsCount = document.querySelector('#plan-usage-calls-count');
    const callsProgress = document.querySelector('#plan-usage-calls-progress');
    if (callsCount && callsProgress) {
        const callsPercentage = limits.calls === Infinity ? 0 : Math.min(100, (data.usage.calls / limits.calls) * 100);
        callsCount.textContent = `${data.usage.calls} / ${limits.calls === Infinity ? '∞' : limits.calls}`;
        callsProgress.style.width = `${callsPercentage}%`;
        callsProgress.setAttribute('aria-valuenow', callsPercentage);
    }
    
    // Actualizar contadores de emails
    const emailsCount = document.querySelector('#plan-usage-emails-count');
    const emailsProgress = document.querySelector('#plan-usage-emails-progress');
    if (emailsCount && emailsProgress) {
        const emailsPercentage = limits.emails === Infinity ? 0 : Math.min(100, (data.usage.emails / limits.emails) * 100);
        emailsCount.textContent = `${data.usage.emails} / ${limits.emails === Infinity ? '∞' : limits.emails}`;
        emailsProgress.style.width = `${emailsPercentage}%`;
        emailsProgress.setAttribute('aria-valuenow', emailsPercentage);
    }
    
    // Obtener contador real de llamadas desde el backend
    fetchRealCallCount();
}

/**
 * Obtiene el uso mensual real desde el backend (llamadas y emails)
 */
async function fetchRealCallCount() {
    try {
        const response = await window.ApiHelper.fetchApi({ url: '/api/usage/monthly', auth: 'jwt' }, { method: 'GET' });
        
        if (!response.success) {
            console.error('❌ Error en respuesta de uso mensual');
            return;
        }
        
        const { usage, limits } = response;
        
        // Actualizar contador de llamadas
        const callsCount = document.querySelector('#plan-usage-calls-count');
        const callsProgress = document.querySelector('#plan-usage-calls-progress');
        
        if (callsCount && callsProgress) {
            const callsPercentage = limits.calls === Infinity ? 0 : Math.min(100, (usage.calls / limits.calls) * 100);
            callsCount.textContent = `${usage.calls} / ${limits.calls === Infinity ? '∞' : limits.calls.toLocaleString()}`;
            callsProgress.style.width = `${callsPercentage}%`;
            callsProgress.setAttribute('aria-valuenow', callsPercentage);
        }
        
        // Actualizar contador de emails
        const emailsCount = document.querySelector('#plan-usage-emails-count');
        const emailsProgress = document.querySelector('#plan-usage-emails-progress');
        
        if (emailsCount && emailsProgress) {
            const emailsPercentage = limits.emails === Infinity ? 0 : Math.min(100, (usage.emails / limits.emails) * 100);
            emailsCount.textContent = `${usage.emails} / ${limits.emails === Infinity ? '∞' : limits.emails.toLocaleString()}`;
            emailsProgress.style.width = `${emailsPercentage}%`;
            emailsProgress.setAttribute('aria-valuenow', emailsPercentage);
        }
        
        console.log(`📊 Uso mensual actualizado - Llamadas: ${usage.calls}, Emails: ${usage.emails}`);
    } catch (error) {
        console.error('❌ Error obteniendo uso mensual:', error);
    }
}

// Exportar funciones
window.UsageTracker = {
    initialize: initializeUsageTracker,
    getUsage: getUsageData,
    getUserUsage: getUserUsageData,
    trackCall,
    trackEmail,
    updateUserCount,
    changePlan,
    getCurrentPlanLimits,
    updateUI: updateUsageUI,
    getCurrentUserId
};
