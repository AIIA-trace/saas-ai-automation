/**
 * Gestor de Disclaimers - Se encarga de mostrar/ocultar los disclaimers de datos de prueba
 */

class DisclaimerHandler {
    constructor() {
        this.disclaimers = document.querySelectorAll('.test-data-disclaimer');
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        
        // Verificar si hay datos reales al inicio
        this.checkRealData();
        
        // Configurar observadores para detectar cuando se cargan datos reales
        this.setupObservers();
    }

    /**
     * Verifica si hay datos reales cargados
     */
    checkRealData() {
        // Verificar emails reales
        const hasRealEmails = localStorage.getItem('has_real_emails') === 'true';
        if (hasRealEmails) {
            this.hideDisclaimers('emails');
        }
        
        // Verificar llamadas reales
        const hasRealCalls = localStorage.getItem('has_real_calls') === 'true';
        if (hasRealCalls) {
            this.hideDisclaimers('calls');
        }
    }

    /**
     * Configura observadores para detectar cambios en las tablas
     */
    setupObservers() {
        // Observar eventos personalizados para cuando se cargan datos reales
        document.addEventListener('realEmailsLoaded', () => {
            console.log('Datos reales de emails detectados - Ocultando disclaimer');
            localStorage.setItem('has_real_emails', 'true');
            this.hideDisclaimers('emails');
        });

        document.addEventListener('realCallsLoaded', () => {
            console.log('Datos reales de llamadas detectados - Ocultando disclaimer');
            localStorage.setItem('has_real_calls', 'true');
            this.hideDisclaimers('calls');
        });

        // Sobrescribir funciones de carga para detectar cuando se cargan datos reales
        const originalLoadEmailsData = window.loadEmailsData || function(){};
        window.loadEmailsData = function(...args) {
            const result = originalLoadEmailsData.apply(this, args);
            
            // Verificar si los datos provienen de una API real y no son datos de prueba
            if (args.length > 0 && args[0] && !args[0].isTestData) {
                const event = new CustomEvent('realEmailsLoaded');
                document.dispatchEvent(event);
            }
            
            return result;
        };

        const originalLoadCallsData = window.loadCallsData;
        if (originalLoadCallsData) {
            window.loadCallsData = function(...args) {
                const result = originalLoadCallsData.apply(this, args);
                
                // Verificar respuesta de la API
                setTimeout(() => {
                    const callRows = document.querySelectorAll('#calls-table tbody tr');
                    const isApiData = localStorage.getItem('calls_data_source') === 'api';
                    
                    if (callRows.length > 0 && isApiData) {
                        const event = new CustomEvent('realCallsLoaded');
                        document.dispatchEvent(event);
                    }
                }, 500);
                
                return result;
            };
        }
    }

    /**
     * Oculta los disclaimers por tipo
     * @param {string} type - 'emails' o 'calls'
     */
    hideDisclaimers(type) {
        const tabContent = type === 'emails' ? 
            document.querySelector('#emails-content') : 
            document.querySelector('#calls-content');
            
        if (tabContent) {
            const disclaimer = tabContent.querySelector('.test-data-disclaimer');
            if (disclaimer) {
                // Animación suave para ocultar el disclaimer
                disclaimer.style.transition = 'all 0.3s ease';
                disclaimer.style.maxHeight = disclaimer.scrollHeight + 'px';
                
                setTimeout(() => {
                    disclaimer.style.maxHeight = '0px';
                    disclaimer.style.opacity = '0';
                    disclaimer.style.padding = '0';
                    disclaimer.style.margin = '0';
                    
                    // Eliminar completamente después de la transición
                    setTimeout(() => {
                        disclaimer.remove();
                    }, 300);
                }, 100);
            }
        }
    }

    /**
     * Forzar la ocultación de todos los disclaimers
     */
    hideAll() {
        this.hideDisclaimers('emails');
        this.hideDisclaimers('calls');
    }

    /**
     * Fuerza la aparición de todos los disclaimers (solo para pruebas)
     */
    showAll() {
        localStorage.removeItem('has_real_emails');
        localStorage.removeItem('has_real_calls');
        location.reload();
    }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.disclaimerHandler = new DisclaimerHandler();
});

// Exponer para uso global
window.disclaimerHandler = window.disclaimerHandler || {};
