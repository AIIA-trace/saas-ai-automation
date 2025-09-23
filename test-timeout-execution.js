const WebSocket = require('ws');

// Test para verificar si el setTimeout se ejecuta correctamente
async function testTimeoutExecution() {
    console.log('🧪 Iniciando test de setTimeout...');
    
    try {
        // Conectar al WebSocket del servidor
        const ws = new WebSocket('ws://localhost:10000/websocket/twilio-stream');
        
        ws.on('open', () => {
            console.log('✅ WebSocket conectado');
            
            // Simular mensaje de conexión de Twilio
            const connectMessage = {
                event: 'connected',
                protocol: 'Call',
                version: '1.0.0'
            };
            
            console.log('📤 Enviando mensaje de conexión...');
            ws.send(JSON.stringify(connectMessage));
            
            // Simular mensaje de start con parámetros
            setTimeout(() => {
                const startMessage = {
                    event: 'start',
                    streamSid: 'test_timeout_stream_123',
                    accountSid: 'test_account',
                    callSid: 'test_call',
                    tracks: ['inbound', 'outbound'],
                    mediaFormat: {
                        encoding: 'audio/x-mulaw',
                        sampleRate: 8000,
                        channels: 1
                    },
                    customParameters: {
                        clientId: '1',
                        companyName: 'Test Company',
                        greetingPlayed: 'true'
                    }
                };
                
                console.log('📤 Enviando mensaje de start...');
                ws.send(JSON.stringify(startMessage));
                
                // Esperar 5 segundos para ver si el timeout se ejecuta
                setTimeout(() => {
                    console.log('⏰ Han pasado 5 segundos - cerrando conexión');
                    ws.close();
                }, 5000);
                
            }, 1000);
        });
        
        ws.on('message', (data) => {
            console.log('📥 Mensaje recibido del servidor:', data.toString());
        });
        
        ws.on('close', () => {
            console.log('🔌 WebSocket desconectado');
            process.exit(0);
        });
        
        ws.on('error', (error) => {
            console.error('❌ Error en WebSocket:', error.message);
            process.exit(1);
        });
        
    } catch (error) {
        console.error('❌ Error en test:', error.message);
        process.exit(1);
    }
}

testTimeoutExecution();
