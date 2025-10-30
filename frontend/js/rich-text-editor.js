/**
 * rich-text-editor.js
 * 
 * Editor de texto enriquecido usando Quill.js para composición de emails
 */

(function() {
    'use strict';

    // Instancias de editores activos
    const editors = {};

    /**
     * Inicializar editor de texto enriquecido en un elemento
     * @param {string} elementId - ID del elemento donde se montará el editor
     * @param {Object} options - Opciones de configuración
     * @returns {Object} Instancia del editor Quill
     */
    window.initRichTextEditor = function(elementId, options = {}) {
        const container = document.getElementById(elementId);
        if (!container) {
            console.error(`Elemento ${elementId} no encontrado`);
            return null;
        }

        // Si ya existe un editor en este elemento, destruirlo primero
        if (editors[elementId]) {
            editors[elementId] = null;
        }

        // Configuración por defecto
        const defaultOptions = {
            theme: 'snow',
            placeholder: options.placeholder || 'Escribe tu mensaje aquí...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link', 'image'],
                    ['clean']
                ]
            }
        };

        // Merge opciones
        const config = { ...defaultOptions, ...options };

        // Crear editor
        const quill = new Quill(`#${elementId}`, config);

        // Guardar instancia
        editors[elementId] = quill;

        // Configurar altura mínima
        const editorContainer = container.querySelector('.ql-editor');
        if (editorContainer) {
            editorContainer.style.minHeight = options.minHeight || '200px';
        }

        return quill;
    };

    /**
     * Obtener contenido HTML del editor
     * @param {string} elementId - ID del elemento del editor
     * @returns {string} Contenido HTML
     */
    window.getRichTextContent = function(elementId) {
        const editor = editors[elementId];
        if (!editor) {
            console.error(`Editor ${elementId} no encontrado`);
            return '';
        }

        return editor.root.innerHTML;
    };

    /**
     * Establecer contenido HTML en el editor
     * @param {string} elementId - ID del elemento del editor
     * @param {string} html - Contenido HTML a establecer
     */
    window.setRichTextContent = function(elementId, html) {
        const editor = editors[elementId];
        if (!editor) {
            console.error(`Editor ${elementId} no encontrado`);
            return;
        }

        editor.root.innerHTML = html;
    };

    /**
     * Limpiar contenido del editor
     * @param {string} elementId - ID del elemento del editor
     */
    window.clearRichTextEditor = function(elementId) {
        const editor = editors[elementId];
        if (!editor) {
            console.error(`Editor ${elementId} no encontrado`);
            return;
        }

        editor.setText('');
    };

    /**
     * Destruir editor
     * @param {string} elementId - ID del elemento del editor
     */
    window.destroyRichTextEditor = function(elementId) {
        if (editors[elementId]) {
            editors[elementId] = null;
            delete editors[elementId];
        }
    };

    /**
     * Obtener instancia del editor
     * @param {string} elementId - ID del elemento del editor
     * @returns {Object} Instancia de Quill
     */
    window.getRichTextEditor = function(elementId) {
        return editors[elementId] || null;
    };

})();
