document.addEventListener('DOMContentLoaded', function() {
    // Eliminar las aspas (X) que aparecen junto a los planes de precios
    const pricingElements = document.querySelectorAll('.pricing-card');
    
    // Eliminar cualquier elemento que pueda estar generando las aspas
    pricingElements.forEach(card => {
        const xMarks = card.querySelectorAll('.x-mark, .close-icon, .plan-selector');
        if (xMarks.length > 0) {
            xMarks.forEach(mark => mark.remove());
        }
    });
    
    // También eliminar elementos que tengan estilos CSS que generen aspas
    const style = document.createElement('style');
    style.textContent = `
        .x-mark, .close-icon, .plan-selector, [class*="x-"], [class*="close"] {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
});
