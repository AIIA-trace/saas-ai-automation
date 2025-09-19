/**
 * Debug script to check voice configuration in database
 */

const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function debugVoiceConfig() {
  try {
    console.log('=== DEBUGGING VOICE CONFIGURATION IN DATABASE ===\n');
    
    // Get all clients and their voice configurations
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        companyName: true,
        callConfig: true
      }
    });
    
    console.log(`Found ${clients.length} clients in database:\n`);
    
    for (const client of clients) {
      console.log(`📋 Cliente ID: ${client.id}`);
      console.log(`🏢 Empresa: ${client.companyName}`);
      console.log(`🎵 Voice ID: ${client.callConfig?.voiceId || 'NO CONFIGURADO'}`);
      console.log(`🌍 Language: ${client.callConfig?.language || 'NO CONFIGURADO'}`);
      console.log(`💬 Greeting: ${client.callConfig?.greeting?.substring(0, 50) || 'NO CONFIGURADO'}...`);
      console.log(`📞 Provider: ${client.callConfig?.provider || 'NO CONFIGURADO'}`);
      console.log('---');
    }
    
    // Test voice mapping
    console.log('\n=== TESTING VOICE MAPPING ===');
    
    const voiceMapping = {
      'lola': 'en-US-LolaMultilingualNeural',
      'dario': 'es-ES-DarioNeural'
    };
    
    function mapVoiceToAzure(voiceId, language = 'es-ES') {
      if (!voiceId) {
        return 'es-ES-DarioNeural'; // Default fallback
      }

      const normalizedVoiceId = voiceId.toLowerCase();
      
      if (normalizedVoiceId.includes('-') && normalizedVoiceId.includes('neural')) {
        console.log(`🎵 Voice already in Azure format: ${voiceId}`);
        return voiceId;
      }
      
      const mappedVoice = voiceMapping[normalizedVoiceId];
      if (mappedVoice) {
        console.log(`🎵 Voice mapped: "${voiceId}" → "${mappedVoice}"`);
        return mappedVoice;
      }
      
      console.warn(`⚠️ No mapping found for voice "${voiceId}", using default: es-ES-DarioNeural`);
      return 'es-ES-DarioNeural';
    }
    
    // Test each client's voice configuration
    for (const client of clients) {
      if (client.callConfig?.voiceId) {
        console.log(`\n🔍 Testing voice mapping for client ${client.id}:`);
        console.log(`Raw voice from DB: "${client.callConfig.voiceId}"`);
        const mappedVoice = mapVoiceToAzure(client.callConfig.voiceId, client.callConfig.language);
        console.log(`Final Azure voice: "${mappedVoice}"`);
        
        if (client.callConfig.voiceId === 'lola' && mappedVoice !== 'en-US-LolaMultilingualNeural') {
          console.log('❌ ERROR: Lola voice not mapping correctly!');
        } else if (client.callConfig.voiceId === 'lola') {
          console.log('✅ SUCCESS: Lola voice mapping correctly!');
        }
      }
    }
    
  } catch (error) {
    console.error('Error debugging voice config:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugVoiceConfig();
