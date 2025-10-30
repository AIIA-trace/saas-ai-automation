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

        // Habilitar pegar imágenes desde el portapapeles
        setupImagePaste(quill, editorContainer);

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

    /**
     * Configurar pegado de imágenes desde el portapapeles
     * @param {Object} quill - Instancia de Quill
     * @param {HTMLElement} editorContainer - Contenedor del editor
     */
    function setupImagePaste(quill, editorContainer) {
        if (!editorContainer) return;

        editorContainer.addEventListener('paste', function(e) {
            // Verificar si hay archivos en el portapapeles
            const clipboardData = e.clipboardData || window.clipboardData;
            const items = clipboardData.items;

            if (!items) return;

            // Buscar imágenes en el portapapeles
            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                // Si es una imagen
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault(); // Prevenir el pegado por defecto

                    const blob = item.getAsFile();
                    if (!blob) continue;

                    // Convertir imagen a Base64
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const base64Image = event.target.result;

                        // Insertar imagen en el editor
                        const range = quill.getSelection(true);
                        quill.insertEmbed(range.index, 'image', base64Image);
                        quill.setSelection(range.index + 1);
                    };
                    reader.readAsDataURL(blob);

                    break; // Solo procesar la primera imagen
                }
            }
        });

        // También permitir arrastrar y soltar imágenes
        editorContainer.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const files = e.dataTransfer.files;
            if (!files || files.length === 0) return;

            // Procesar solo la primera imagen
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                if (file.type.indexOf('image') !== -1) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const base64Image = event.target.result;

                        // Insertar imagen en el editor
                        const range = quill.getSelection(true) || { index: quill.getLength() };
                        quill.insertEmbed(range.index, 'image', base64Image);
                        quill.setSelection(range.index + 1);
                    };
                    reader.readAsDataURL(file);

                    break; // Solo procesar la primera imagen
                }
            }
        });

        // Prevenir comportamiento por defecto de dragover
        editorContainer.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
    }

})();
