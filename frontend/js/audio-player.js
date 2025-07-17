/**
 * Audio Player para la demostración de IA Receptionist
 * Permite reproducir conversaciones de ejemplo con voz femenina o masculina
 */
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del reproductor
    const playButton = document.querySelector('.play-button');
    const voiceOptions = document.querySelectorAll('.voice-option');
    const progressFill = document.querySelector('.progress-fill');
    const currentTimeDisplay = document.querySelector('.current-time');
    const totalTimeDisplay = document.querySelector('.total-time');
    const audioWave = document.querySelector('.audio-wave');
    const conversationBubble = document.querySelector('.conversation-bubble');
    
    // Elementos de audio
    const audioFemale = document.getElementById('audio-female');
    const audioMale = document.getElementById('audio-male');
    
    // Audio activo (por defecto femenino)
    let activeAudio = audioFemale;
    let isPlaying = false;
    
    // Textos de conversación para actualizar el bubble
    const conversationTexts = [
        { time: 0, text: '"Buenos días, IA Receptionist. ¿En qué puedo ayudarle hoy?"', speaker: 'IA' },
        { time: 4, text: '"Hola, necesito agendar una cita para mañana con el Dr. García"', speaker: 'Cliente' },
        { time: 8, text: '"Por supuesto. ¿A qué hora le gustaría programar la cita?"', speaker: 'IA' },
        { time: 12, text: '"¿Tiene disponibilidad a las 10 de la mañana?"', speaker: 'Cliente' },
        { time: 16, text: '"Déjeme verificar... Sí, tenemos un espacio disponible a las 10:00. ¿Desea confirmar esta cita?"', speaker: 'IA' },
        { time: 22, text: '"Sí, perfecto. Muchas gracias."', speaker: 'Cliente' },
        { time: 25, text: '"Excelente. Su cita ha sido agendada para mañana a las 10:00 con el Dr. García. Le enviaré una confirmación por correo electrónico. ¿Hay algo más en lo que pueda ayudarle?"', speaker: 'IA' },
        { time: 33, text: '"No, eso es todo. Gracias."', speaker: 'Cliente' },
        { time: 36, text: '"Gracias por contactar con IA Receptionist. ¡Que tenga un excelente día!"', speaker: 'IA' }
    ];
    
    // Función para formatear el tiempo en minutos:segundos
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' + secs : secs}`;
    }
    
    // Inicializar el reproductor
    function initPlayer() {
        // Establecer la duración total cuando los metadatos están disponibles
        activeAudio.addEventListener('loadedmetadata', function() {
            totalTimeDisplay.textContent = formatTime(activeAudio.duration);
        });
        
        // Actualizar la barra de progreso y el tiempo actual durante la reproducción
        activeAudio.addEventListener('timeupdate', function() {
            const currentTime = activeAudio.currentTime;
            const duration = activeAudio.duration || 1;
            const progressPercent = (currentTime / duration) * 100;
            
            progressFill.style.width = `${progressPercent}%`;
            currentTimeDisplay.textContent = formatTime(currentTime);
            
            // Actualizar el texto de la conversación según el tiempo
            updateConversationText(currentTime);
        });
        
        // Cuando el audio termina
        activeAudio.addEventListener('ended', function() {
            isPlaying = false;
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            audioWave.classList.remove('playing');
            progressFill.style.width = '0%';
            currentTimeDisplay.textContent = '0:00';
            
            // Restablecer el texto de la conversación al inicial
            updateConversationText(0);
        });
    }
    
    // Actualizar el texto de la conversación según el tiempo de reproducción
    function updateConversationText(currentTime) {
        // Encontrar el texto correspondiente al tiempo actual
        let textToShow = conversationTexts[0]; // Texto por defecto
        
        for (let i = conversationTexts.length - 1; i >= 0; i--) {
            if (currentTime >= conversationTexts[i].time) {
                textToShow = conversationTexts[i];
                break;
            }
        }
        
        // Actualizar el contenido del bubble
        const conversationTitle = document.querySelector('.conversation-title');
        const conversationText = document.querySelector('.conversation-bubble p');
        
        conversationTitle.textContent = textToShow.speaker === 'IA' ? 'IA Receptionist dice:' : 'Cliente dice:';
        conversationText.textContent = textToShow.text;
    }
    
    // Cambiar entre reproducción y pausa
    function togglePlay() {
        if (isPlaying) {
            activeAudio.pause();
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            audioWave.classList.remove('playing');
        } else {
            activeAudio.play();
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
            audioWave.classList.add('playing');
        }
        
        isPlaying = !isPlaying;
    }
    
    // Cambiar entre voces (femenina/masculina)
    function changeVoice(voice) {
        // Detener la reproducción actual
        if (isPlaying) {
            activeAudio.pause();
            isPlaying = false;
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            audioWave.classList.remove('playing');
        }
        
        // Cambiar el audio activo
        activeAudio = voice === 'female' ? audioFemale : audioMale;
        
        // Reiniciar el progreso
        progressFill.style.width = '0%';
        currentTimeDisplay.textContent = '0:00';
        
        // Reiniciar el texto de la conversación
        updateConversationText(0);
        
        // Inicializar el nuevo reproductor
        initPlayer();
    }
    
    // Event listeners
    playButton.addEventListener('click', togglePlay);
    
    // Cambiar entre voces
    voiceOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Quitar la clase activa de todas las opciones
            voiceOptions.forEach(opt => opt.classList.remove('active'));
            
            // Añadir la clase activa a la opción seleccionada
            this.classList.add('active');
            
            // Cambiar la voz
            const voice = this.getAttribute('data-voice');
            changeVoice(voice);
        });
    });
    
    // Permitir hacer clic en la barra de progreso para saltar a un punto específico
    const progressBar = document.querySelector('.progress-bar');
    progressBar.addEventListener('click', function(e) {
        const progressBarWidth = this.clientWidth;
        const clickPosition = e.offsetX;
        const clickPercent = (clickPosition / progressBarWidth);
        
        activeAudio.currentTime = clickPercent * activeAudio.duration;
    });
    
    // Inicializar el reproductor con la voz femenina por defecto
    initPlayer();
});
