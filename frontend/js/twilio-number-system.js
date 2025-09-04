// ==========================================
// SISTEMA DE NÚMEROS TWILIO AUTOMÁTICO
// ==========================================

/**
 * Configurar event listeners para el sistema de números Twilio
 */
function setupTwilioNumberSystem() {
    console.log('🔧 Configurando sistema de números Twilio...');
    
    // Event listener para el switch de activación del bot
    const callBotActiveSwitch = document.getElementById('call_bot_active');
    if (callBotActiveSwitch) {
        callBotActiveSwitch.addEventListener('change', handleCallBotToggle);
        console.log('✅ Event listener configurado para call_bot_active switch');
    }
    
    // Event listener para copiar número Twilio
    const copyTwilioBtn = document.getElementById('copy-twilio-number');
    if (copyTwilioBtn) {
        copyTwilioBtn.addEventListener('click', copyTwilioNumber);
        console.log('✅ Event listener configurado para copy-twilio-number');
    }
    
    // Verificar estado inicial y mostrar número si ya existe
    checkExistingTwilioNumber();
}

/**
 * Manejar el toggle del switch de activación del bot de llamadas
 */
async function handleCallBotToggle(event) {
    const isEnabled = event.target.checked;
    const twilioSection = document.getElementById('twilio-number-section');
    
    console.log('🔄 Bot de llamadas toggle:', isEnabled);
    
    if (isEnabled) {
        // Mostrar sección de número Twilio
        twilioSection.style.display = 'block';
        
        // Verificar si ya tiene un número asignado
        const existingNumber = await checkUserTwilioNumber();
        
        if (existingNumber) {
            // Mostrar número existente
            displayTwilioNumber(existingNumber);
        } else {
            // Comprar nuevo número automáticamente
            await purchaseNewTwilioNumber();
        }
    } else {
        // Ocultar sección de número Twilio
        twilioSection.style.display = 'none';
    }
}

/**
 * Verificar si el usuario ya tiene un número Twilio asignado
 */
async function checkUserTwilioNumber() {
    try {
        console.log('🔍 Verificando número Twilio existente...');
        
        const token = localStorage.getItem('authToken');
        const baseUrl = window.API_CONFIG?.baseUrl || 'https://saas-ai-automation.onrender.com';
        
        const response = await fetch(`${baseUrl}/api/twilio/my-numbers`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('📞 Números Twilio del usuario:', data);
            
            if (data.numbers && data.numbers.length > 0) {
                return data.numbers[0].phoneNumber;
            }
        } else {
            console.log('⚠️ Error al verificar números:', response.status, response.statusText);
        }
        
        return null;
    } catch (error) {
        console.error('❌ Error verificando número Twilio:', error);
        return null;
    }
}

/**
 * Comprar nuevo número Twilio automáticamente
 */
async function purchaseNewTwilioNumber() {
    const numberInput = document.getElementById('assigned_twilio_number');
    const copyBtn = document.getElementById('copy-twilio-number');
    
    try {
        console.log('💰 Comprando nuevo número Twilio...');
        
        // Mostrar estado de carga
        numberInput.value = 'Comprando número...';
        numberInput.className = 'form-control fw-bold text-warning';
        copyBtn.disabled = true;
        
        const token = localStorage.getItem('authToken');
        const baseUrl = window.API_CONFIG?.baseUrl || 'https://saas-ai-automation.onrender.com';
        
        const response = await fetch(`${baseUrl}/api/twilio/purchase-number`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                countryCode: 'US',
                areaCode: null
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('✅ Número Twilio comprado exitosamente:', data.phoneNumber);
            displayTwilioNumber(data.phoneNumber);
            
            toastr.success(`Número asignado: ${data.phoneNumber}`, '¡Número Twilio Comprado!');
        } else {
            // Si ya tiene un número, no es un error real
            if (data.error && data.error.includes('already has')) {
                console.log('ℹ️ Usuario ya tiene número asignado');
                // Intentar obtener el número existente
                const existingNumber = await checkUserTwilioNumber();
                if (existingNumber) {
                    displayTwilioNumber(existingNumber);
                    return;
                }
            }
            throw new Error(data.error || 'Error comprando número Twilio');
        }
        
    } catch (error) {
        console.error('❌ Error comprando número Twilio:', error);
        
        numberInput.value = 'Error comprando número';
        numberInput.className = 'form-control fw-bold text-danger';
        
        toastr.error(error.message, 'Error Comprando Número');
    }
}

/**
 * Mostrar número Twilio en la interfaz
 */
function displayTwilioNumber(phoneNumber) {
    const numberInput = document.getElementById('assigned_twilio_number');
    const copyBtn = document.getElementById('copy-twilio-number');
    const placeholders = document.querySelectorAll('.twilio-number-placeholder');
    
    // Mostrar número en el campo
    numberInput.value = phoneNumber;
    numberInput.className = 'form-control fw-bold text-success';
    copyBtn.disabled = false;
    
    // Actualizar placeholders en las instrucciones
    placeholders.forEach(placeholder => {
        placeholder.textContent = phoneNumber;
    });
    
    console.log('✅ Número Twilio mostrado en interfaz:', phoneNumber);
}

/**
 * Copiar número Twilio al portapapeles
 */
async function copyTwilioNumber() {
    const numberInput = document.getElementById('assigned_twilio_number');
    const phoneNumber = numberInput.value;
    
    try {
        await navigator.clipboard.writeText(phoneNumber);
        
        const copyBtn = document.getElementById('copy-twilio-number');
        const icon = copyBtn.querySelector('i');
        const originalClass = icon.className;
        
        icon.className = 'fas fa-check text-success';
        copyBtn.classList.add('btn-success');
        copyBtn.classList.remove('btn-outline-secondary');
        
        setTimeout(() => {
            icon.className = originalClass;
            copyBtn.classList.remove('btn-success');
            copyBtn.classList.add('btn-outline-secondary');
        }, 2000);
        
        toastr.success('Número copiado al portapapeles', 'Copiado');
        console.log('✅ Número Twilio copiado:', phoneNumber);
        
    } catch (error) {
        console.error('❌ Error copiando número:', error);
        toastr.error('Error copiando número', 'Error');
    }
}

/**
 * Verificar número existente al cargar la página
 */
async function checkExistingTwilioNumber() {
    const callBotActiveSwitch = document.getElementById('call_bot_active');
    
    // Si el bot está activo, mostrar siempre la sección
    if (callBotActiveSwitch && callBotActiveSwitch.checked) {
        const twilioSection = document.getElementById('twilio-number-section');
        twilioSection.style.display = 'block';
        
        const existingNumber = await checkUserTwilioNumber();
        
        if (existingNumber) {
            displayTwilioNumber(existingNumber);
            console.log('✅ Número Twilio existente cargado:', existingNumber);
        } else {
            // Solo comprar si realmente no tiene número
            await purchaseNewTwilioNumber();
        }
    }
}

// Inicializar el sistema cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema de números Twilio...');
    setupTwilioNumberSystem();
});
