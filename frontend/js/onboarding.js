/**
 * Onboarding Module
 * Handles the initial setup process for new users
 */

class OnboardingService {
  constructor() {
    this.initialized = false;
    this.setupComplete = false;
  }
  
  /**
   * Initialize the onboarding process
   */
  initialize() {
    if (this.initialized) return;
    
    // Check if user has completed setup
    const setupComplete = localStorage.getItem('setup_complete');
    this.setupComplete = setupComplete === 'true';
    
    if (!this.setupComplete) {
      // Wait 2 seconds before showing the popup
      setTimeout(() => {
        this.showWelcomePopup();
      }, 2000);
    }
    
    this.initialized = true;
  }
  
  /**
   * Show the welcome popup
   */
  showWelcomePopup() {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(backdrop);
    
    // Create modal HTML
    const modalHtml = `
      <div class="modal fade show" id="welcomeModal" tabindex="-1" role="dialog" aria-labelledby="welcomeModalLabel" style="display: block;">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title" id="welcomeModalLabel">Welcome to IA Receptionist!</h5>
            </div>
            <div class="modal-body">
              <div class="text-center mb-4">
                <i class="fas fa-robot fa-4x text-primary mb-3"></i>
                <h4>Your AI assistant is ready to be configured</h4>
                <p class="lead">It will only take about 5 minutes to set up your AI bot</p>
              </div>
              
              <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Setting up your bot now will help you get the most out of our service right away.
              </div>
            </div>
            <div class="modal-footer justify-content-center">
              <button type="button" class="btn btn-primary btn-lg px-4" id="startSetupBtn">
                <i class="fas fa-cog me-2"></i> Start Setup
              </button>
              <button type="button" class="btn btn-outline-secondary btn-lg px-4" id="laterBtn">
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Add event listeners
    document.getElementById('startSetupBtn').addEventListener('click', () => {
      this.closeWelcomePopup();
      this.startSetupProcess();
    });
    
    document.getElementById('laterBtn').addEventListener('click', () => {
      this.closeWelcomePopup();
    });
  }
  
  /**
   * Close the welcome popup
   */
  closeWelcomePopup() {
    const modal = document.getElementById('welcomeModal');
    if (modal) {
      modal.parentNode.removeChild(modal);
    }
    
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.parentNode.removeChild(backdrop);
    }
  }
  
  /**
   * Start the setup process
   */
  startSetupProcess() {
    // Redirect to company setup page
    window.location.href = 'company-setup.html';
  }
  
  /**
   * Mark setup as complete
   */
  markSetupComplete() {
    localStorage.setItem('setup_complete', 'true');
    this.setupComplete = true;
  }
}

// Create and export singleton instance
const onboardingService = new OnboardingService();
window.onboardingService = onboardingService;
