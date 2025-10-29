/**
 * Sistema de autocompletado de emails
 * Muestra sugerencias de contactos mientras el usuario escribe
 */

class EmailAutocomplete {
  constructor(inputElement, options = {}) {
    this.input = inputElement;
    this.options = {
      minChars: 2,
      debounceMs: 300,
      maxSuggestions: 10,
      ...options
    };
    
    this.suggestionsContainer = null;
    this.debounceTimer = null;
    this.selectedIndex = -1;
    this.suggestions = [];
    
    this.init();
  }

  init() {
    // Crear contenedor de sugerencias
    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = 'email-autocomplete-suggestions';
    this.suggestionsContainer.style.display = 'none';
    this.input.parentNode.style.position = 'relative';
    this.input.parentNode.appendChild(this.suggestionsContainer);

    // Event listeners
    this.input.addEventListener('input', (e) => this.handleInput(e));
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.input.addEventListener('blur', () => {
      // Delay para permitir clic en sugerencia
      setTimeout(() => this.hideSuggestions(), 200);
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.suggestionsContainer.contains(e.target)) {
        this.hideSuggestions();
      }
    });
  }

  handleInput(e) {
    const value = e.target.value.trim();
    
    // Limpiar timer anterior
    clearTimeout(this.debounceTimer);

    if (value.length < this.options.minChars) {
      this.hideSuggestions();
      return;
    }

    // Debounce
    this.debounceTimer = setTimeout(() => {
      this.fetchSuggestions(value);
    }, this.options.debounceMs);
  }

  async fetchSuggestions(query) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/email/contacts/suggestions?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.contacts.length > 0) {
        this.suggestions = data.contacts;
        this.showSuggestions();
      } else {
        this.hideSuggestions();
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      this.hideSuggestions();
    }
  }

  showSuggestions() {
    this.suggestionsContainer.innerHTML = '';
    this.selectedIndex = -1;

    this.suggestions.forEach((contact, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.innerHTML = `
        <div class="autocomplete-name">${this.escapeHtml(contact.name)}</div>
        <div class="autocomplete-email">${this.escapeHtml(contact.email)}</div>
      `;
      
      item.addEventListener('click', () => {
        this.selectSuggestion(contact);
      });

      item.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        this.updateSelection();
      });

      this.suggestionsContainer.appendChild(item);
    });

    this.suggestionsContainer.style.display = 'block';
  }

  hideSuggestions() {
    this.suggestionsContainer.style.display = 'none';
    this.selectedIndex = -1;
  }

  handleKeydown(e) {
    if (this.suggestionsContainer.style.display === 'none') return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
        this.updateSelection();
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection();
        break;
      
      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0) {
          this.selectSuggestion(this.suggestions[this.selectedIndex]);
        }
        break;
      
      case 'Escape':
        this.hideSuggestions();
        break;
    }
  }

  updateSelection() {
    const items = this.suggestionsContainer.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  selectSuggestion(contact) {
    this.input.value = contact.email;
    this.hideSuggestions();
    
    // Trigger change event
    const event = new Event('change', { bubbles: true });
    this.input.dispatchEvent(event);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this.suggestionsContainer) {
      this.suggestionsContainer.remove();
    }
    clearTimeout(this.debounceTimer);
  }
}

// Auto-inicializar en campos de email cuando se carga el DOM
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar en modal de compose
  const composeToInput = document.getElementById('compose-to');
  if (composeToInput) {
    new EmailAutocomplete(composeToInput);
  }

  // Inicializar en modal de reply
  const replyToInput = document.getElementById('reply-to');
  if (replyToInput) {
    new EmailAutocomplete(replyToInput);
  }
});

// Exportar para uso manual
window.EmailAutocomplete = EmailAutocomplete;
