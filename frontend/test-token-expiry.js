// Script para probar el manejo de tokens expirados
console.log('🧪 Iniciando prueba de token expirado...');

// 1. Limpiar tokens existentes
localStorage.removeItem('auth_token');
localStorage.removeItem('authToken');
localStorage.removeItem('user_data');
localStorage.removeItem('api_key');
localStorage.removeItem('auth_timestamp');
console.log('🧹 Tokens limpiados');

// 2. Establecer un token JWT expirado (exp: 1640995200 = 1 enero 2022)
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxNjQwOTk1MjAwfQ.invalid_signature';

localStorage.setItem('auth_token', expiredToken);
localStorage.setItem('authToken', expiredToken);
localStorage.setItem('user_data', JSON.stringify({
    id: '123',
    email: 'test@example.com',
    role: 'user'
}));

console.log('⚠️ Token expirado establecido:', expiredToken.substring(0, 50) + '...');

// 3. Verificar que TokenValidator detecta la expiración
if (window.TokenValidator) {
    const tokenInfo = window.TokenValidator.getCurrentTokenInfo();
    console.log('📊 Info del token:', tokenInfo);
    console.log('❌ Token válido:', tokenInfo ? tokenInfo.isValid : 'No se pudo obtener info');
} else {
    console.log('❌ TokenValidator no disponible');
}

// 4. Redirigir al dashboard para probar
console.log('🔄 Redirigiendo al dashboard en 2 segundos...');
setTimeout(() => {
    window.location.href = 'dashboard.html';
}, 2000);
