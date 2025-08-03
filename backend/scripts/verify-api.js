/**
 * Script para verificar datos guardados a través del API
 */
const axios = require('axios');
require('dotenv').config();

// Constantes
const API_URL = process.env.API_URL || 'https://saas-ai-automation.onrender.com';
const EMAIL = 'carlos@almiscle.com';
const PASSWORD = process.env.TEST_PASSWORD || 'password';  // Reemplaza con la contraseña real si es necesaria

async function main() {
  try {
    console.log(`🔐 Iniciando verificación de API para usuario: ${EMAIL}`);
    console.log(`🌐 Usando API URL: ${API_URL}`);
    
    // Paso 1: Iniciar sesión para obtener token
    console.log('Paso 1: Obteniendo token de autenticación...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    });
    
    if (loginResponse.data && loginResponse.data.token) {
      const token = loginResponse.data.token;
      console.log('✅ Token obtenido correctamente');
      
      // Paso 2: Obtener perfil con el token
      console.log('\nPaso 2: Obteniendo datos de perfil...');
      const profileResponse = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (profileResponse.data && profileResponse.data.success) {
        console.log('✅ Datos de perfil obtenidos correctamente');
        
        // Mostrar datos de cliente
        const clientData = profileResponse.data.client;
        console.log('\n----------------------------------------');
        console.log('DATOS BÁSICOS DEL CLIENTE:');
        console.log('----------------------------------------');
        console.log(`ID: ${clientData.id}`);
        console.log(`Email: ${clientData.email || EMAIL}`);
        console.log(`Nombre de empresa: ${clientData.companyName || 'No configurado'}`);
        console.log(`Nombre de contacto: ${clientData.contactName || 'No configurado'}`);
        console.log(`Teléfono: ${clientData.phone || 'No configurado'}`);
        console.log(`Sitio web: ${clientData.website || 'No configurado'}`);
        console.log(`Industria: ${clientData.industry || 'No configurada'}`);
        console.log(`Dirección: ${clientData.address || 'No configurada'}`);
        console.log(`Zona horaria: ${clientData.timezone || 'No configurada'}`);
        console.log(`Idioma: ${clientData.language || 'No configurado'}`);
        console.log('----------------------------------------');
        
        // Paso 3: Obtener configuración completa
        console.log('\nPaso 3: Obteniendo configuración completa...');
        const configResponse = await axios.get(`${API_URL}/api/client`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (configResponse.data && configResponse.data.success) {
          console.log('✅ Configuración completa obtenida correctamente');
          
          // Mostrar configuración del bot si existe
          if (configResponse.data.botConfig) {
            console.log('\n----------------------------------------');
            console.log('CONFIGURACIÓN DEL BOT:');
            console.log('----------------------------------------');
            console.log(JSON.stringify(configResponse.data.botConfig, null, 2));
          } else {
            console.log('\n❌ No se encontró configuración del bot');
          }
          
          // Mostrar configuración de email si existe
          if (configResponse.data.emailConfig) {
            console.log('\n----------------------------------------');
            console.log('CONFIGURACIÓN DE EMAIL:');
            console.log('----------------------------------------');
            // Redactar contraseñas por seguridad
            const emailConfig = { ...configResponse.data.emailConfig };
            if (emailConfig.imapPassword) emailConfig.imapPassword = '[REDACTADO]';
            if (emailConfig.smtpPassword) emailConfig.smtpPassword = '[REDACTADO]';
            console.log(JSON.stringify(emailConfig, null, 2));
          } else {
            console.log('\n❌ No se encontró configuración de email');
          }
        } else {
          console.log('❌ Error al obtener configuración:', configResponse.data);
        }
      } else {
        console.log('❌ Error al obtener perfil:', profileResponse.data);
      }
    } else {
      console.log('❌ Error de autenticación:', loginResponse.data);
    }
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
  }
}

// Ejecutar
main();
