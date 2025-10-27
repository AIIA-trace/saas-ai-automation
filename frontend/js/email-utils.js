/**
 * email-utils.js
 * 
 * Funciones auxiliares para manejo de emails
 */

(function() {
    'use strict';

    /**
     * Formatear fecha de email
     */
    window.formatEmailDate = function(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                // Hoy: mostrar hora
                return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                return 'Ayer';
            } else if (diffDays < 7) {
                return date.toLocaleDateString('es-ES', { weekday: 'short' });
            } else {
                return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            }
        } catch (error) {
            return dateString;
        }
    };

    /**
     * Obtener icono según tipo de archivo
     */
    window.getFileIcon = function(mimeType) {
        if (!mimeType) return 'fas fa-file';

        if (mimeType.startsWith('image/')) return 'fas fa-file-image';
        if (mimeType.startsWith('video/')) return 'fas fa-file-video';
        if (mimeType.startsWith('audio/')) return 'fas fa-file-audio';
        if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
        if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fas fa-file-powerpoint';
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return 'fas fa-file-archive';
        if (mimeType.includes('text/')) return 'fas fa-file-alt';

        return 'fas fa-file';
    };

    /**
     * Formatear tamaño de archivo
     */
    window.formatFileSize = function(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    /**
     * Descargar adjunto
     */
    window.downloadAttachment = async function(emailId, attachmentId, filename) {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
            const API_BASE_URL = window.API_CONFIG?.BASE_URL || 'https://saas-ai-automation.onrender.com';

            console.log(`📎 Descargando adjunto: ${filename}`);

            const response = await fetch(`${API_BASE_URL}/api/email/${emailId}/attachment/${attachmentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al descargar adjunto');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            console.log(`✅ Adjunto descargado: ${filename}`);
        } catch (error) {
            console.error('❌ Error descargando adjunto:', error);
            alert('Error al descargar el archivo');
        }
    };

})();
