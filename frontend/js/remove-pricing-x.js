document.addEventListener('DOMContentLoaded', function() {
    // Eliminar las aspas (X) que aparecen junto a los planes de precios
    const pricingSelectors = document.querySelectorAll('.pricing-selector');
    if (pricingSelectors) {
        pricingSelectors.forEach(selector => {
            selector.remove();
        });
    }
    
    // También eliminar cualquier otro elemento que pueda estar generando las aspas
    const closeButtons = document.querySelectorAll('.pricing-close, .plan-x, .pricing-x');
    if (closeButtons) {
        closeButtons.forEach(button => {
            button.remove();
        });
    }
});
