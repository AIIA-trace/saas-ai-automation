/**
 * Script de prueba para el sistema de seguimiento de uso
 * Este script simula acciones de usuario para verificar que el sistema
 * de seguimiento de uso funciona correctamente para múltiples usuarios
 * y muestra un widget de resumen de uso en tiempo real
 */

// Lista de usuarios de prueba
const TEST_USERS = [
    { id: 'user1', name: 'Ana García', plan: 'professional' },
    { id: 'user2', name: 'Carlos López', plan: 'premium' },
    { id: 'user3', name: 'María Rodríguez', plan: 'basic' }
];

/**
 * Simula un inicio de sesión de usuario
 * @param {Object} user - Usuario a simular
 */
function simulateUserLogin(user) {
    console.log(`🔑 Simulando inicio de sesión para ${user.name} (${user.id})...`);
    
    // Guardar datos del usuario en localStorage (simular autenticación)
    const userData = {
        id: user.id,
        name: user.name,
        email: `${user.id}@example.com`,
        role: 'user'
    };
    
    localStorage.setItem('user_data', JSON.stringify(userData));
    
    // Reinicializar el sistema de seguimiento para el nuevo usuario
    if (window.UsageTracker) {
        window.UsageTracker.initialize();
        window.UsageTracker.changePlan(user.plan);
        window.UsageTracker.updateUI();
        
        // Mostrar el widget de resumen de uso si existe la función
        if (typeof showUsageSummary === 'function') {
            showUsageSummary();
        }
    }
    
    console.log(`✅ Usuario ${user.name} ha iniciado sesión. ID: ${user.id}, Plan: ${user.plan}`);
    
    // Actualizar información en la UI
    const userInfoElement = document.querySelector('#user-info');
    if (userInfoElement) {
        userInfoElement.textContent = `Usuario actual: ${user.name} (${user.id})`;
    }
    
    return userData;
}

/**
 * Simula acciones de usuario para el usuario actual
 * @param {number} calls - Número de llamadas a simular
 * @param {number} emails - Número de emails a simular
 * @param {number} users - Número de usuarios a establecer
 */
function simulateUserActions(calls = 5, emails = 10, users = 3) {
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`🧪 Iniciando pruebas para el usuario ${userId}...`);
    
    // Verificar que el sistema está inicializado
    if (!window.UsageTracker) {
        console.error('❌ Error: UsageTracker no está inicializado');
        return;
    }
    
    // Mostrar datos iniciales
    console.log('📊 Datos iniciales:', window.UsageTracker.getUsage());
    
    // Simular llamadas
    console.log(`📞 Simulando ${calls} llamadas...`);
    for (let i = 0; i < calls; i++) {
        window.UsageTracker.trackCall();
    }
    
    // Simular emails
    console.log(`📧 Simulando ${emails} emails...`);
    for (let i = 0; i < emails; i++) {
        window.UsageTracker.trackEmail();
    }
    
    // Simular actualización de usuarios
    console.log(`👥 Simulando actualización a ${users} usuarios...`);
    window.UsageTracker.updateUserCount(users);
    
    // Actualizar la UI
    window.UsageTracker.updateUI();
    
    // Actualizar el resumen de uso si está visible
    if (typeof showUsageSummary === 'function') {
        showUsageSummary();
    }
    
    console.log('✅ Acciones simuladas. Datos actuales:', window.UsageTracker.getUsage());
}

/**
 * Simula la acción de leer un email específico
 * @param {number} emailId - ID del email a leer
 */
function simulateReadEmail(emailId = 1) {
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`📨 Simulando lectura del email ID: ${emailId} por el usuario ${userId}`);
    
    // Verificar que el sistema está inicializado
    if (!window.UsageTracker) {
        console.error('❌ Error: UsageTracker no está inicializado');
        return;
    }
    
    // Registrar la acción en el sistema de seguimiento
    window.UsageTracker.trackEmail();
    
    // Actualizar la UI
    window.UsageTracker.updateUI();
    
    // Actualizar el resumen de uso si está visible
    if (typeof showUsageSummary === 'function') {
        showUsageSummary();
    }
    
    // Simular llamada a la función toggleEmailRead si existe
    if (typeof toggleEmailRead === 'function') {
        try {
            // Intentar llamar a la función real (solo si estamos en el dashboard)
            toggleEmailRead(emailId);
            console.log(`✅ Email ${emailId} marcado como leído mediante toggleEmailRead()`);
        } catch (e) {
            console.log(`ℹ️ La función toggleEmailRead() no está disponible en este contexto`);
        }
    } else {
        console.log(`✅ Email ${emailId} registrado en el sistema de uso`);
    }
}

/**
 * Simula la reproducción de una llamada específica
 * @param {number} callId - ID de la llamada a reproducir
 */
function simulatePlayCall(callId = 1) {
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`📞 Simulando reproducción de la llamada ID: ${callId} por el usuario ${userId}`);
    
    // Verificar que el sistema está inicializado
    if (!window.UsageTracker) {
        console.error('❌ Error: UsageTracker no está inicializado');
        return;
    }
    
    // Registrar la acción en el sistema de seguimiento
    window.UsageTracker.trackCall();
    
    // Actualizar la UI
    window.UsageTracker.updateUI();
    
    // Actualizar el resumen de uso si está visible
    if (typeof showUsageSummary === 'function') {
        showUsageSummary();
    }
    
    // Simular llamada a la función playCallRecording si existe
    if (typeof playCallRecording === 'function') {
        try {
            // Intentar llamar a la función real (solo si estamos en el dashboard)
            playCallRecording(callId);
            console.log(`✅ Llamada ${callId} reproducida mediante playCallRecording()`);
        } catch (e) {
            console.log(`ℹ️ La función playCallRecording() no está disponible en este contexto`);
        }
    } else {
        console.log(`✅ Llamada ${callId} registrada en el sistema de uso`);
    }
}

/**
 * Simula el cambio de plan para el usuario actual
 * @param {string} plan - Nombre del plan ('basic', 'professional', 'premium')
 */
function simulateChangePlan(plan) {
    if (!['basic', 'professional', 'premium'].includes(plan)) {
        console.error('❌ Plan no válido. Usar: basic, professional o premium');
        return;
    }
    
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`💳 Cambiando plan del usuario ${userId} a ${plan}...`);
    
    if (window.UsageTracker) {
        window.UsageTracker.changePlan(plan);
        window.UsageTracker.updateUI();
        console.log(`✅ Plan actualizado a ${plan}. Nuevos límites:`, window.UsageTracker.getCurrentPlanLimits());
    }
}

/**
 * Simula una rotación completa de usuarios con sus acciones
 */
function simulateAllUsers() {
    console.log('🔄 Iniciando simulación de múltiples usuarios...');
    
    // Para cada usuario de prueba
    TEST_USERS.forEach((user, index) => {
        // Simular inicio de sesión
        simulateUserLogin(user);
        
        // Simular diferentes cantidades de acciones según el usuario
        const calls = (index + 1) * 5;
        const emails = (index + 1) * 10;
        const userCount = index + 2;
        
        // Simular acciones
        simulateUserActions(calls, emails, userCount);
        
        console.log(`✅ Simulación completada para ${user.name}\n----------------------------`);
        
        // Pequeña pausa visual entre usuarios (solo para la consola)
        console.log('\n');
    });
    
    console.log('🎉 Simulación de todos los usuarios completada!');
}

/**
 * Reinicia los datos de uso para el usuario actual
 */
function resetCurrentUserData() {
    const userId = window.UsageTracker?.getCurrentUserId() || 'desconocido';
    console.log(`🔄 Reiniciando datos de uso para el usuario ${userId}...`);
    
    if (!window.UsageTracker) {
        console.error('❌ Error: UsageTracker no está inicializado');
        return;
    }
    
    // Reiniciar datos
    window.UsageTracker.initialize(true); // Forzar reinicio
    window.UsageTracker.updateUI();
    
    console.log(`✅ Datos reiniciados para el usuario ${userId}. Valores actuales:`, window.UsageTracker.getUsage());
}

// Añadir un elemento para mostrar el usuario actual
function addUserInfoElement() {
    // Verificar si ya existe
    if (document.querySelector('#user-info')) return;
    
    // Crear elemento
    const userInfo = document.createElement('div');
    userInfo.id = 'user-info';
    userInfo.style.position = 'fixed';
    userInfo.style.top = '10px';
    userInfo.style.right = '20px';
    userInfo.style.backgroundColor = 'rgba(0,0,0,0.7)';
    userInfo.style.color = 'white';
    userInfo.style.padding = '8px 12px';
    userInfo.style.borderRadius = '4px';
    userInfo.style.fontSize = '12px';
    userInfo.style.zIndex = '9999';
    userInfo.textContent = 'Usuario: (no identificado)';
    
    // Añadir al DOM
    document.body.appendChild(userInfo);
}

/**
 * Crea un panel de control para las pruebas
 */
function createTestControlPanel() {
    // Verificar si ya existe
    if (document.querySelector('#test-control-panel')) return;
    
    // Crear panel
    const panel = document.createElement('div');
    panel.id = 'test-control-panel';
    panel.style.position = 'fixed';
    panel.style.left = '20px';
    panel.style.bottom = '20px';
    panel.style.backgroundColor = 'white';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    panel.style.padding = '15px';
    panel.style.zIndex = '9998';
    panel.style.width = '300px';
    panel.style.maxHeight = '80vh';
    panel.style.overflowY = 'auto';
    
    // Título
    const title = document.createElement('h5');
    title.textContent = 'Panel de Control de Pruebas';
    title.style.marginBottom = '15px';
    title.style.borderBottom = '1px solid #eee';
    title.style.paddingBottom = '8px';
    panel.appendChild(title);
    
    // Sección de usuarios
    const userSection = document.createElement('div');
    userSection.style.marginBottom = '15px';
    
    const userSectionTitle = document.createElement('h6');
    userSectionTitle.textContent = 'Cambiar Usuario';
    userSectionTitle.style.marginBottom = '10px';
    userSection.appendChild(userSectionTitle);
    
    // Botones de usuarios
    TEST_USERS.forEach(user => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-primary me-2 mb-2';
        btn.textContent = user.name;
        btn.onclick = () => simulateUserLogin(user);
        userSection.appendChild(btn);
    });
    
    panel.appendChild(userSection);
    
    // Sección de acciones
    const actionSection = document.createElement('div');
    actionSection.style.marginBottom = '15px';
    
    const actionSectionTitle = document.createElement('h6');
    actionSectionTitle.textContent = 'Simular Acciones';
    actionSectionTitle.style.marginBottom = '10px';
    actionSection.appendChild(actionSectionTitle);
    
    // Botones de acciones
    const actionBtns = [
        { text: 'Leer Email', action: () => simulateReadEmail(Math.floor(Math.random() * 10) + 1) },
        { text: 'Reproducir Llamada', action: () => simulatePlayCall(Math.floor(Math.random() * 5) + 1) },
        { text: '5 Acciones Aleatorias', action: () => simulateUserActions(5, 5, 2) }
    ];
    
    actionBtns.forEach(btn => {
        const button = document.createElement('button');
        button.className = 'btn btn-sm btn-outline-success me-2 mb-2';
        button.textContent = btn.text;
        button.onclick = btn.action;
        actionSection.appendChild(button);
    });
    
    panel.appendChild(actionSection);
    
    // Sección de planes
    const planSection = document.createElement('div');
    planSection.style.marginBottom = '15px';
    
    const planSectionTitle = document.createElement('h6');
    planSectionTitle.textContent = 'Cambiar Plan';
    planSectionTitle.style.marginBottom = '10px';
    planSection.appendChild(planSectionTitle);
    
    // Botones de planes
    const plans = ['basic', 'professional', 'premium'];
    plans.forEach(plan => {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm btn-outline-${plan === 'premium' ? 'warning' : (plan === 'professional' ? 'primary' : 'secondary')} me-2`;
        btn.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
        btn.onclick = () => simulateChangePlan(plan);
        planSection.appendChild(btn);
    });
    
    panel.appendChild(planSection);
    
    // Sección de utilidades
    const utilSection = document.createElement('div');
    
    const utilSectionTitle = document.createElement('h6');
    utilSectionTitle.textContent = 'Utilidades';
    utilSectionTitle.style.marginBottom = '10px';
    utilSection.appendChild(utilSectionTitle);
    
    // Botones de utilidades
    const utilBtns = [
        { text: 'Reiniciar Datos', action: resetCurrentUserData, class: 'danger' },
        { text: 'Simular Todos los Usuarios', action: simulateAllUsers, class: 'info' },
        { text: 'Mostrar Resumen', action: () => {
            if (typeof showUsageSummary === 'function') {
                showUsageSummary();
            } else {
                alert('La función showUsageSummary no está disponible');
            }
        }, class: 'primary' }
    ];
    
    utilBtns.forEach(btn => {
        const button = document.createElement('button');
        button.className = `btn btn-sm btn-${btn.class} me-2 mb-2`;
        button.textContent = btn.text;
        button.onclick = btn.action;
        utilSection.appendChild(button);
    });
    
    panel.appendChild(utilSection);
    
    // Botón para minimizar/maximizar
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn btn-sm btn-light position-absolute';
    toggleBtn.style.top = '10px';
    toggleBtn.style.right = '10px';
    toggleBtn.innerHTML = '&minus;';
    toggleBtn.style.width = '24px';
    toggleBtn.style.height = '24px';
    toggleBtn.style.padding = '0';
    toggleBtn.style.lineHeight = '1';
    
    let isMinimized = false;
    const panelContent = [userSection, actionSection, planSection, utilSection];
    
    toggleBtn.onclick = () => {
        if (isMinimized) {
            // Maximizar
            panelContent.forEach(section => section.style.display = 'block');
            toggleBtn.innerHTML = '&minus;';
            panel.style.height = 'auto';
        } else {
            // Minimizar
            panelContent.forEach(section => section.style.display = 'none');
            toggleBtn.innerHTML = '&plus;';
            panel.style.height = 'auto';
        }
        isMinimized = !isMinimized;
    };
    
    panel.appendChild(toggleBtn);
    
    // Añadir al DOM
    document.body.appendChild(panel);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando script de prueba del sistema de seguimiento de uso...');
    
    // Añadir elementos de UI
    addUserInfoElement();
    createTestControlPanel();
    
    // Inicializar el sistema de seguimiento si existe
    if (window.UsageTracker) {
        window.UsageTracker.initialize();
        
        // Mostrar el resumen de uso si existe la función
        if (typeof showUsageSummary === 'function') {
            showUsageSummary();
        }
        
        // Mostrar información del usuario actual
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (userData.name) {
            const userInfoElement = document.querySelector('#user-info');
            if (userInfoElement) {
                userInfoElement.textContent = `Usuario actual: ${userData.name} (${userData.id || 'desconocido'})`;
            }
        } else {
            // Si no hay usuario, simular uno por defecto
            simulateUserLogin(TEST_USERS[0]);
        }
    } else {
        console.error('❌ Error: UsageTracker no está disponible');
    }
    
    console.log('✅ Script de prueba inicializado correctamente');
});

console.log(`🧪 Script de prueba para múltiples usuarios cargado.\n\nComandos disponibles:\n- simulateUserLogin(user) - Simula inicio de sesión\n- simulateUserActions(calls, emails, users) - Simula acciones\n- simulateChangePlan(plan) - Cambia el plan\n- simulateAllUsers() - Simula todos los usuarios\n- resetCurrentUserData() - Reinicia datos del usuario actual\n\nEjemplo: simulateUserLogin(TEST_USERS[0])`);
