#!/usr/bin/env node

/**
 * Script de diagnóstico completo para Azure Text-to-Speech
 * Verifica configuración, conectividad y diferentes tipos de servicios
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

class AzureTTSDiagnostic {
    constructor() {
        this.subscriptionKey = process.env.AZURE_SPEECH_KEY;
        this.region = process.env.AZURE_SPEECH_REGION || 'westeurope';
        
        console.log('🔍 DIAGNÓSTICO AZURE TTS INICIADO');
        console.log('================================');
        console.log(`📍 Región configurada: ${this.region}`);
        console.log(`🔑 Clave configurada: ${this.subscriptionKey ? 'SÍ (' + this.subscriptionKey.substring(0, 8) + '...)' : 'NO'}`);
        console.log('');
    }

    // Test 1: Verificar configuración básica
    async testBasicConfig() {
        console.log('🧪 TEST 1: Configuración Básica');
        console.log('--------------------------------');
        
        if (!this.subscriptionKey) {
            console.log('❌ AZURE_SPEECH_KEY no configurada');
            return false;
        }
        
        if (!this.region) {
            console.log('❌ AZURE_SPEECH_REGION no configurada');
            return false;
        }
        
        console.log('✅ Variables de entorno configuradas correctamente');
        return true;
    }

    // Test 2: Verificar endpoint y conectividad
    async testConnectivity() {
        console.log('\n🌐 TEST 2: Conectividad del Endpoint');
        console.log('------------------------------------');
        
        const endpoint = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
        console.log(`🎯 Endpoint: ${endpoint}`);
        
        return new Promise((resolve) => {
            const options = {
                hostname: `${this.region}.tts.speech.microsoft.com`,
                port: 443,
                path: '/cognitiveservices/v1',
                method: 'HEAD',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                },
                timeout: 5000
            };

            const req = https.request(options, (res) => {
                console.log(`📡 Respuesta HTTP: ${res.statusCode}`);
                console.log(`📋 Headers recibidos:`, res.headers);
                
                if (res.statusCode === 200 || res.statusCode === 405) {
                    console.log('✅ Endpoint accesible');
                    resolve(true);
                } else {
                    console.log(`❌ Endpoint no accesible - Status: ${res.statusCode}`);
                    resolve(false);
                }
            });

            req.on('error', (error) => {
                console.log(`❌ Error de conectividad: ${error.message}`);
                resolve(false);
            });

            req.on('timeout', () => {
                console.log('❌ Timeout de conectividad');
                req.destroy();
                resolve(false);
            });

            req.setTimeout(5000);
            req.end();
        });
    }

    // Test 3: Verificar autenticación con token
    async testTokenAuth() {
        console.log('\n🔐 TEST 3: Autenticación con Token');
        console.log('----------------------------------');
        
        const tokenEndpoint = `https://${this.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
        console.log(`🎫 Token endpoint: ${tokenEndpoint}`);
        
        return new Promise((resolve) => {
            const options = {
                hostname: `${this.region}.api.cognitive.microsoft.com`,
                port: 443,
                path: '/sts/v1.0/issueToken',
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                    'Content-Length': 0
                },
                timeout: 10000
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`📡 Status: ${res.statusCode}`);
                    
                    if (res.statusCode === 200) {
                        console.log('✅ Autenticación exitosa - Token obtenido');
                        console.log(`🎫 Token: ${data.substring(0, 50)}...`);
                        resolve({ success: true, token: data });
                    } else {
                        console.log(`❌ Error de autenticación - Status: ${res.statusCode}`);
                        console.log(`📄 Respuesta: ${data}`);
                        resolve({ success: false, error: data });
                    }
                });
            });

            req.on('error', (error) => {
                console.log(`❌ Error en autenticación: ${error.message}`);
                resolve({ success: false, error: error.message });
            });

            req.on('timeout', () => {
                console.log('❌ Timeout en autenticación');
                req.destroy();
                resolve({ success: false, error: 'timeout' });
            });

            req.setTimeout(10000);
            req.end();
        });
    }

    // Test 4: Listar voces disponibles
    async testVoicesList() {
        console.log('\n🎤 TEST 4: Voces Disponibles');
        console.log('----------------------------');
        
        const endpoint = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
        console.log(`📋 Endpoint voces: ${endpoint}`);
        
        return new Promise((resolve) => {
            const options = {
                hostname: `${this.region}.tts.speech.microsoft.com`,
                port: 443,
                path: '/cognitiveservices/voices/list',
                method: 'GET',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey
                },
                timeout: 10000
            };

            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`📡 Status: ${res.statusCode}`);
                    
                    if (res.statusCode === 200) {
                        try {
                            const voices = JSON.parse(data);
                            const spanishVoices = voices.filter(v => v.Locale.startsWith('es-'));
                            
                            console.log(`✅ ${voices.length} voces disponibles total`);
                            console.log(`🇪🇸 ${spanishVoices.length} voces en español disponibles:`);
                            
                            spanishVoices.slice(0, 5).forEach(voice => {
                                console.log(`   - ${voice.Name} (${voice.DisplayName}) - ${voice.VoiceType}`);
                            });
                            
                            if (spanishVoices.length > 5) {
                                console.log(`   ... y ${spanishVoices.length - 5} más`);
                            }
                            
                            resolve({ success: true, voices: spanishVoices });
                        } catch (error) {
                            console.log(`❌ Error parseando voces: ${error.message}`);
                            resolve({ success: false, error: error.message });
                        }
                    } else {
                        console.log(`❌ Error obteniendo voces - Status: ${res.statusCode}`);
                        console.log(`📄 Respuesta: ${data}`);
                        resolve({ success: false, error: data });
                    }
                });
            });

            req.on('error', (error) => {
                console.log(`❌ Error listando voces: ${error.message}`);
                resolve({ success: false, error: error.message });
            });

            req.on('timeout', () => {
                console.log('❌ Timeout listando voces');
                req.destroy();
                resolve({ success: false, error: 'timeout' });
            });

            req.setTimeout(10000);
            req.end();
        });
    }

    // Test 5: Síntesis de audio simple
    async testSimpleTTS() {
        console.log('\n🔊 TEST 5: Síntesis de Audio Simple');
        console.log('-----------------------------------');
        
        const testText = 'Hola, este es un test de Azure TTS.';
        const voice = 'es-ES-DarioNeural';
        
        const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='es-ES'>
            <voice xml:lang='es-ES' name='${voice}'>
                <![CDATA[${testText}]]>
            </voice>
        </speak>`;
        
        console.log(`🎯 Texto: "${testText}"`);
        console.log(`🎤 Voz: ${voice}`);
        console.log(`📝 SSML generado:`);
        console.log(ssml);
        
        return new Promise((resolve) => {
            const postData = ssml;
            const options = {
                hostname: `${this.region}.tts.speech.microsoft.com`,
                port: 443,
                path: '/cognitiveservices/v1',
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'riff-8khz-8bit-mono-mulaw',
                    'User-Agent': 'Azure-TTS-Diagnostic/1.0',
                    'Connection': 'Keep-Alive',
                    'Accept': 'audio/*',
                    'Content-Length': Buffer.byteLength(postData, 'utf8')
                },
                timeout: 15000
            };

            console.log(`📡 Enviando petición a: https://${options.hostname}${options.path}`);
            console.log(`📋 Headers:`, options.headers);

            const req = https.request(options, (res) => {
                console.log(`📡 Status HTTP: ${res.statusCode}`);
                console.log(`📋 Response Headers:`, res.headers);
                
                let audioData = Buffer.alloc(0);
                let chunkCount = 0;
                
                res.on('data', (chunk) => {
                    chunkCount++;
                    audioData = Buffer.concat([audioData, chunk]);
                    console.log(`📦 Chunk ${chunkCount} recibido: ${chunk.length} bytes`);
                });
                
                res.on('end', () => {
                    console.log(`🏁 Respuesta completa: ${audioData.length} bytes totales`);
                    
                    if (res.statusCode === 200 && audioData.length > 0) {
                        console.log('✅ Síntesis exitosa!');
                        
                        // Guardar archivo de prueba
                        const outputFile = path.join(__dirname, 'test-azure-tts.wav');
                        fs.writeFileSync(outputFile, audioData);
                        console.log(`💾 Audio guardado en: ${outputFile}`);
                        
                        resolve({ success: true, audioSize: audioData.length });
                    } else {
                        console.log(`❌ Síntesis falló - Status: ${res.statusCode}, Size: ${audioData.length}`);
                        
                        if (audioData.length > 0) {
                            console.log(`📄 Contenido de error: ${audioData.toString().substring(0, 200)}`);
                        }
                        
                        resolve({ success: false, status: res.statusCode, data: audioData.toString() });
                    }
                });
            });

            req.on('error', (error) => {
                console.log(`❌ Error en síntesis: ${error.message}`);
                resolve({ success: false, error: error.message });
            });

            req.on('timeout', () => {
                console.log('❌ Timeout en síntesis');
                req.destroy();
                resolve({ success: false, error: 'timeout' });
            });

            req.setTimeout(15000);
            req.write(postData);
            req.end();
        });
    }

    // Test 6: Verificar diferentes regiones
    async testDifferentRegions() {
        console.log('\n🌍 TEST 6: Prueba de Diferentes Regiones');
        console.log('----------------------------------------');
        
        const regions = ['westeurope', 'eastus', 'westus2', 'southeastasia', 'uksouth'];
        const results = {};
        
        for (const region of regions) {
            console.log(`\n🔍 Probando región: ${region}`);
            
            const result = await new Promise((resolve) => {
                const options = {
                    hostname: `${region}.tts.speech.microsoft.com`,
                    port: 443,
                    path: '/cognitiveservices/voices/list',
                    method: 'HEAD',
                    headers: {
                        'Ocp-Apim-Subscription-Key': this.subscriptionKey
                    },
                    timeout: 5000
                };

                const req = https.request(options, (res) => {
                    const accessible = res.statusCode === 200 || res.statusCode === 405;
                    console.log(`   ${accessible ? '✅' : '❌'} ${region}: Status ${res.statusCode}`);
                    resolve({ region, accessible, status: res.statusCode });
                });

                req.on('error', (error) => {
                    console.log(`   ❌ ${region}: Error - ${error.message}`);
                    resolve({ region, accessible: false, error: error.message });
                });

                req.on('timeout', () => {
                    console.log(`   ❌ ${region}: Timeout`);
                    req.destroy();
                    resolve({ region, accessible: false, error: 'timeout' });
                });

                req.setTimeout(5000);
                req.end();
            });
            
            results[region] = result;
        }
        
        return results;
    }

    // Ejecutar todos los tests
    async runAllTests() {
        console.log('🚀 INICIANDO DIAGNÓSTICO COMPLETO DE AZURE TTS\n');
        
        const results = {
            config: await this.testBasicConfig(),
            connectivity: await this.testConnectivity(),
            auth: await this.testTokenAuth(),
            voices: await this.testVoicesList(),
            synthesis: await this.testSimpleTTS(),
            regions: await this.testDifferentRegions()
        };
        
        console.log('\n📊 RESUMEN DE RESULTADOS');
        console.log('========================');
        console.log(`✅ Configuración: ${results.config ? 'OK' : 'FALLO'}`);
        console.log(`✅ Conectividad: ${results.connectivity ? 'OK' : 'FALLO'}`);
        console.log(`✅ Autenticación: ${results.auth.success ? 'OK' : 'FALLO'}`);
        console.log(`✅ Lista de voces: ${results.voices.success ? 'OK' : 'FALLO'}`);
        console.log(`✅ Síntesis TTS: ${results.synthesis.success ? 'OK' : 'FALLO'}`);
        
        console.log('\n🎯 RECOMENDACIONES:');
        
        if (!results.config) {
            console.log('❌ Configura las variables AZURE_SPEECH_KEY y AZURE_SPEECH_REGION');
        }
        
        if (!results.connectivity) {
            console.log('❌ Verifica tu conexión a internet y firewall');
        }
        
        if (!results.auth.success) {
            console.log('❌ Verifica tu clave de Azure Speech Service en el portal de Azure');
            console.log('   - Puede que la clave sea incorrecta');
            console.log('   - Puede que el servicio esté deshabilitado');
            console.log('   - Puede que hayas excedido la cuota');
        }
        
        if (!results.voices.success) {
            console.log('❌ El servicio no puede listar voces - problema con el recurso Azure');
        }
        
        if (!results.synthesis.success) {
            console.log('❌ La síntesis TTS falla - revisa configuración del servicio Azure');
            
            if (results.synthesis.status === 401) {
                console.log('   🔑 Error 401: Clave de autenticación inválida');
            } else if (results.synthesis.status === 403) {
                console.log('   🚫 Error 403: Acceso denegado - verifica permisos del recurso');
            } else if (results.synthesis.status === 429) {
                console.log('   ⏱️ Error 429: Cuota excedida - verifica límites en Azure portal');
            }
        }
        
        console.log('\n🌐 ENLACES ÚTILES:');
        console.log('- Portal Azure: https://portal.azure.com');
        console.log('- Speech Services: https://portal.azure.com/#blade/HubsExtension/BrowseResourceBlade/resourceType/Microsoft.CognitiveServices%2Faccounts');
        console.log('- Estado servicios Azure: https://status.azure.com/');
        console.log('- Documentación TTS: https://docs.microsoft.com/azure/cognitive-services/speech-service/');
        
        return results;
    }
}

// Ejecutar diagnóstico si se llama directamente
if (require.main === module) {
    const diagnostic = new AzureTTSDiagnostic();
    diagnostic.runAllTests().catch(console.error);
}

module.exports = AzureTTSDiagnostic;
