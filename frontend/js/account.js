// Módulo de gestión de cuenta de usuario
class AccountManager {
    constructor() {
        this.userProfile = {
            id: null,
            name: '',
            email: '',
            phone: '',
            company: '',
            role: '',
            avatar: '',
            timezone: 'Europe/Madrid',
            language: 'es',
            createdAt: null,
            lastLogin: null
        };
        this.securitySettings = {
            twoFactorEnabled: false,
            passwordLastChanged: null,
            loginNotifications: true,
            sessionTimeout: 30
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUserProfile();
        this.loadSecuritySettings();
    }

    // Cargar perfil de usuario desde el backend
    async loadUserProfile() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.userProfile = { ...this.userProfile, ...data.profile };
                this.updateProfileUI();
            } else {
                console.error('Error cargando perfil');
                this.loadMockProfile();
            }
        } catch (error) {
            console.error('Error:', error);
            this.loadMockProfile();
        }
    }

    // Cargar configuración de seguridad
    async loadSecuritySettings() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/security`, {
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.securitySettings = { ...this.securitySettings, ...data.security };
                this.updateSecurityUI();
            } else {
                console.error('Error cargando configuración de seguridad');
                this.updateSecurityUI();
            }
        } catch (error) {
            console.error('Error:', error);
            this.updateSecurityUI();
        }
    }

    // Cargar perfil mock para desarrollo
    loadMockProfile() {
        this.userProfile = {
            id: 1,
            name: 'Usuario Demo',
            email: 'usuario@ejemplo.com',
            phone: '+34 600 123 456',
            company: 'Mi Empresa SL',
            role: 'Administrador',
            avatar: '',
            timezone: 'Europe/Madrid',
            language: 'es',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        };
        this.updateProfileUI();
    }

    // Actualizar UI del perfil
    updateProfileUI() {
        // Información básica
        document.getElementById('profileName').value = this.userProfile.name || '';
        document.getElementById('profileEmail').value = this.userProfile.email || '';
        document.getElementById('profilePhone').value = this.userProfile.phone || '';
        document.getElementById('profileCompany').value = this.userProfile.company || '';
        document.getElementById('profileTimezone').value = this.userProfile.timezone || 'Europe/Madrid';
        document.getElementById('profileLanguage').value = this.userProfile.language || 'es';

        // Información de solo lectura
        const roleElement = document.getElementById('userRole');
        if (roleElement) {
            roleElement.textContent = this.userProfile.role || 'Usuario';
        }

        const createdAtElement = document.getElementById('userCreatedAt');
        if (createdAtElement && this.userProfile.createdAt) {
            createdAtElement.textContent = new Date(this.userProfile.createdAt).toLocaleDateString('es-ES');
        }

        const lastLoginElement = document.getElementById('userLastLogin');
        if (lastLoginElement && this.userProfile.lastLogin) {
            lastLoginElement.textContent = this.formatTimestamp(this.userProfile.lastLogin);
        }

        // Avatar
        this.updateAvatarUI();
    }

    // Actualizar UI de seguridad
    updateSecurityUI() {
        document.getElementById('twoFactorEnabled').checked = this.securitySettings.twoFactorEnabled;
        document.getElementById('loginNotifications').checked = this.securitySettings.loginNotifications;
        document.getElementById('sessionTimeout').value = this.securitySettings.sessionTimeout;

        const passwordLastChangedElement = document.getElementById('passwordLastChanged');
        if (passwordLastChangedElement && this.securitySettings.passwordLastChanged) {
            passwordLastChangedElement.textContent = this.formatTimestamp(this.securitySettings.passwordLastChanged);
        } else if (passwordLastChangedElement) {
            passwordLastChangedElement.textContent = 'Nunca';
        }
    }

    // Actualizar UI del avatar
    updateAvatarUI() {
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(element => {
            if (this.userProfile.avatar) {
                element.innerHTML = `<img src="${this.userProfile.avatar}" alt="Avatar" class="rounded-circle" width="40" height="40">`;
            } else {
                const initials = this.getInitials(this.userProfile.name);
                element.innerHTML = `<div class="avatar-initials">${initials}</div>`;
            }
        });
    }

    // Obtener iniciales del nombre
    getInitials(name) {
        if (!name) return 'U';
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    // Formatear timestamp
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Ahora mismo';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Eventos
    bindEvents() {
        // Formulario de perfil
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }

        // Formulario de cambio de contraseña
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }

        // Configuración de seguridad
        const securityForm = document.getElementById('securityForm');
        if (securityForm) {
            securityForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSecuritySettings();
            });
        }

        // Upload de avatar
        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        // Botón de eliminar avatar
        const removeAvatarBtn = document.getElementById('removeAvatar');
        if (removeAvatarBtn) {
            removeAvatarBtn.addEventListener('click', () => this.removeAvatar());
        }

        // Configurar 2FA
        const setup2FABtn = document.getElementById('setup2FA');
        if (setup2FABtn) {
            setup2FABtn.addEventListener('click', () => this.setup2FA());
        }

        // Descargar datos
        const downloadDataBtn = document.getElementById('downloadUserData');
        if (downloadDataBtn) {
            downloadDataBtn.addEventListener('click', () => this.downloadUserData());
        }

        // Eliminar cuenta
        const deleteAccountBtn = document.getElementById('deleteAccount');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.deleteAccount());
        }
    }

    // Guardar perfil
    async saveProfile() {
        const saveBtn = document.querySelector('#profileForm button[type="submit"]');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            saveBtn.disabled = true;
        }

        try {
            const formData = new FormData(document.getElementById('profileForm'));
            const profileData = Object.fromEntries(formData.entries());

            const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                const data = await response.json();
                this.userProfile = { ...this.userProfile, ...data.profile };
                this.updateProfileUI();
                toastr.success('Perfil actualizado correctamente');
            } else {
                toastr.error('Error actualizando el perfil');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error actualizando el perfil');
        } finally {
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
                saveBtn.disabled = false;
            }
        }
    }

    // Cambiar contraseña
    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            toastr.error('Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 8) {
            toastr.error('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        const saveBtn = document.querySelector('#passwordForm button[type="submit"]');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cambiando...';
            saveBtn.disabled = true;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/change-password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response.ok) {
                document.getElementById('passwordForm').reset();
                this.securitySettings.passwordLastChanged = new Date().toISOString();
                this.updateSecurityUI();
                toastr.success('Contraseña cambiada correctamente');
            } else {
                const error = await response.json();
                toastr.error(error.message || 'Error cambiando la contraseña');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error cambiando la contraseña');
        } finally {
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-key"></i> Cambiar Contraseña';
                saveBtn.disabled = false;
            }
        }
    }

    // Guardar configuración de seguridad
    async saveSecuritySettings() {
        const saveBtn = document.querySelector('#securityForm button[type="submit"]');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            saveBtn.disabled = true;
        }

        try {
            const formData = new FormData(document.getElementById('securityForm'));
            const securityData = {
                twoFactorEnabled: formData.get('twoFactorEnabled') === 'on',
                loginNotifications: formData.get('loginNotifications') === 'on',
                sessionTimeout: parseInt(formData.get('sessionTimeout'))
            };

            const response = await fetch(`${API_BASE_URL}/api/user/security`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(securityData)
            });

            if (response.ok) {
                this.securitySettings = { ...this.securitySettings, ...securityData };
                toastr.success('Configuración de seguridad actualizada');
            } else {
                toastr.error('Error actualizando la configuración');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error actualizando la configuración');
        } finally {
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Guardar Configuración';
                saveBtn.disabled = false;
            }
        }
    }

    // Manejar upload de avatar
    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            toastr.error('Por favor selecciona una imagen válida');
            return;
        }

        // Validar tamaño (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toastr.error('La imagen debe ser menor a 2MB');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch(`${API_BASE_URL}/api/user/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                this.userProfile.avatar = data.avatarUrl;
                this.updateAvatarUI();
                toastr.success('Avatar actualizado correctamente');
            } else {
                toastr.error('Error subiendo el avatar');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error subiendo el avatar');
        }
    }

    // Eliminar avatar
    async removeAvatar() {
        if (!confirm('¿Estás seguro de que quieres eliminar tu avatar?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/avatar`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                }
            });

            if (response.ok) {
                this.userProfile.avatar = '';
                this.updateAvatarUI();
                toastr.success('Avatar eliminado correctamente');
            } else {
                toastr.error('Error eliminando el avatar');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error eliminando el avatar');
        }
    }

    // Configurar 2FA
    async setup2FA() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/2fa/setup`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.show2FASetupModal(data.qrCode, data.secret);
            } else {
                toastr.error('Error configurando 2FA');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error configurando 2FA');
        }
    }

    // Mostrar modal de configuración 2FA
    show2FASetupModal(qrCode, secret) {
        const modal = new bootstrap.Modal(document.getElementById('setup2FAModal'));
        document.getElementById('qrCodeImage').src = qrCode;
        document.getElementById('secretKey').textContent = secret;
        modal.show();
    }

    // Descargar datos del usuario
    async downloadUserData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/export`, {
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `datos_usuario_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toastr.success('Datos descargados correctamente');
            } else {
                toastr.error('Error descargando los datos');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error descargando los datos');
        }
    }

    // Eliminar cuenta
    async deleteAccount() {
        const confirmation = prompt('Para eliminar tu cuenta, escribe "ELIMINAR CUENTA":');
        if (confirmation !== 'ELIMINAR CUENTA') {
            toastr.info('Eliminación cancelada');
            return;
        }

        if (!confirm('¿Estás completamente seguro? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/user/delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                }
            });

            if (response.ok) {
                toastr.success('Cuenta eliminada correctamente');
                setTimeout(() => {
                    authService.logout();
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                toastr.error('Error eliminando la cuenta');
            }
        } catch (error) {
            console.error('Error:', error);
            toastr.error('Error eliminando la cuenta');
        }
    }

    // Obtener información del usuario
    getUserInfo() {
        return this.userProfile;
    }

    // Verificar si el usuario tiene permisos de administrador
    isAdmin() {
        return this.userProfile.role === 'Administrador' || this.userProfile.role === 'Admin';
    }
}

// Instancia global
const accountManager = new AccountManager();
