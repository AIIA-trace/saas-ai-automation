/**
 * Datos de demostración para el dashboard
 * Estos datos se mostrarán como ejemplos hasta que se carguen los datos reales
 */

// Datos de ejemplo para llamadas
const demoCallsData = [
    {
        id: 1001,
        date: '22/07/2025',
        time: '09:15',
        phone: '612345678',
        contactType: 'Cliente',
        classification: 'consulta',
        urgency: 'normal',
        confidence: 85,
        summary: 'Consulta sobre facturación mensual y descuentos aplicables',
        details: 'El cliente pregunta por los descuentos disponibles para su plan actual y opciones de facturación',
        duration: '2:35',
        managed: false
    },
    {
        id: 1002,
        date: '22/07/2025',
        time: '10:30',
        phone: '698765432',
        contactType: 'Proveedor',
        classification: 'incidencia',
        urgency: 'alta',
        confidence: 92,
        summary: 'Problema con el servicio de entrega urgente',
        details: 'Reporta retraso en la entrega programada para hoy. Necesita confirmación de nueva fecha',
        duration: '3:42',
        managed: true
    },
    {
        id: 1003,
        date: '22/07/2025',
        time: '11:45',
        phone: '634567890',
        contactType: 'Potencial',
        classification: 'ventas',
        urgency: 'normal',
        confidence: 78,
        summary: 'Interesado en el plan Premium para su empresa',
        details: 'Solicita información detallada sobre precios y características del plan Premium para 10 usuarios',
        duration: '4:15',
        managed: false
    },
    {
        id: 1004,
        date: '22/07/2025',
        time: '13:20',
        phone: '678901234',
        contactType: 'Cliente',
        classification: 'soporte',
        urgency: 'urgente',
        confidence: 95,
        summary: 'No puede acceder a su cuenta de usuario',
        details: 'Error al intentar iniciar sesión. Ha probado restablecer contraseña sin éxito',
        duration: '5:08',
        managed: false
    },
    {
        id: 1005,
        date: '22/07/2025',
        time: '15:40',
        phone: '645678901',
        contactType: 'Cliente',
        classification: 'consulta',
        urgency: 'baja',
        confidence: 88,
        summary: 'Información sobre horarios de atención en festivos',
        details: 'Pregunta por disponibilidad del servicio durante el próximo puente festivo',
        duration: '1:50',
        managed: true
    }
];

// Datos de ejemplo para emails
const demoEmailsData = [
    {
        id: 2001,
        sender: 'maria.lopez@empresa.com',
        senderType: 'Cliente',
        subject: 'Solicitud de ampliación de servicio',
        preview: 'Buenos días, me gustaría ampliar el servicio contratado para incluir 5 usuarios más en nuestra cuenta. ¿Podrían indicarme el proceso y el coste adicional?',
        date: '22/07/2025',
        time: '08:30',
        read: true,
        important: true,
        spam: false
    },
    {
        id: 2002,
        sender: 'carlos.martinez@proveedor.es',
        senderType: 'Proveedor',
        subject: 'Actualización de precios 2025',
        preview: 'Estimado cliente, le informamos que a partir del próximo mes habrá una actualización en nuestra lista de precios. Adjuntamos el nuevo catálogo con los cambios detallados.',
        date: '22/07/2025',
        time: '09:45',
        read: false,
        important: false,
        spam: false
    },
    {
        id: 2003,
        sender: 'soporte@plataforma.com',
        senderType: 'Sistema',
        subject: 'Mantenimiento programado',
        preview: 'Le informamos que el próximo domingo de 02:00 a 05:00 realizaremos labores de mantenimiento en nuestros servidores. Durante este periodo el servicio podría experimentar interrupciones.',
        date: '22/07/2025',
        time: '10:15',
        read: false,
        important: true,
        spam: false
    },
    {
        id: 2004,
        sender: 'newsletter@marketing.net',
        senderType: '',
        subject: '¡Ofertas exclusivas de verano!',
        preview: 'Descubra nuestras increíbles ofertas de verano con descuentos de hasta el 40% en todos nuestros servicios premium. ¡Oferta por tiempo limitado!',
        date: '22/07/2025',
        time: '11:30',
        read: true,
        important: false,
        spam: true
    },
    {
        id: 2005,
        sender: 'ana.garcia@cliente.org',
        senderType: 'Cliente',
        subject: 'Problema con la factura #F-2025-1234',
        preview: 'Hola, he detectado un error en la factura que me enviaron ayer. El importe no corresponde con el servicio contratado. Adjunto los detalles para su revisión.',
        date: '22/07/2025',
        time: '12:50',
        read: false,
        important: true,
        spam: false
    }
];

// Función para cargar datos de demostración en la tabla de llamadas
function loadDemoCallsData() {
    console.log('📞 Cargando datos de demostración para llamadas...');
    
    const callsTableBody = document.getElementById('calls-table-body');
    if (!callsTableBody) return;
    
    // Limpiar tabla
    callsTableBody.innerHTML = '';
    
    // Generar filas con datos de demostración
    demoCallsData.forEach(call => {
        const callRow = createCallRow(call);
        callsTableBody.appendChild(callRow);
    });
    
    // Actualizar contador
    if (typeof updateCallsCount === 'function') {
        updateCallsCount();
    }
    
    console.log('✅ Datos de demostración de llamadas cargados correctamente');
}

// Función para cargar datos de demostración en la tabla de emails
function loadDemoEmailsData() {
    console.log('📧 Cargando datos de demostración para emails...');
    
    const emailsTableBody = document.getElementById('emails-table-body');
    if (!emailsTableBody) return;
    
    // Limpiar tabla
    emailsTableBody.innerHTML = '';
    
    // Generar filas con datos de demostración
    demoEmailsData.forEach(email => {
        const emailRow = createEmailRow(email);
        emailsTableBody.appendChild(emailRow);
    });
    
    // Actualizar contador
    if (typeof updateEmailsCount === 'function') {
        updateEmailsCount();
    }
    
    console.log('✅ Datos de demostración de emails cargados correctamente');
}

// Función para inicializar los datos de demostración
function initDemoData() {
    // Verificar si ya hay datos reales cargados
    const callsTableBody = document.getElementById('calls-table-body');
    const emailsTableBody = document.getElementById('emails-table-body');
    
    if (callsTableBody && callsTableBody.children.length <= 1) {
        loadDemoCallsData();
    }
    
    if (emailsTableBody && emailsTableBody.children.length <= 1) {
        loadDemoEmailsData();
    }
    
    // Configurar reemplazo automático cuando se carguen datos reales
    const originalLoadCallsData = window.loadCallsData;
    const originalLoadEmailsData = window.loadEmailsData;
    
    if (originalLoadCallsData) {
        window.loadCallsData = function() {
            // Eliminar la clase de demostración si existe
            const callsTable = document.getElementById('calls-table');
            if (callsTable) callsTable.classList.remove('demo-data');
            
            // Llamar a la función original
            return originalLoadCallsData.apply(this, arguments);
        };
    }
    
    if (originalLoadEmailsData) {
        window.loadEmailsData = function() {
            // Eliminar la clase de demostración si existe
            const emailsTable = document.getElementById('emails-table');
            if (emailsTable) emailsTable.classList.remove('demo-data');
            
            // Llamar a la función original
            return originalLoadEmailsData.apply(this, arguments);
        };
    }
}

// Exportar funciones
window.loadDemoCallsData = loadDemoCallsData;
window.loadDemoEmailsData = loadDemoEmailsData;
window.initDemoData = initDemoData;
