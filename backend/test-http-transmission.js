const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test para verificar si el problema está en la transmisión HTTP
async function testHttpTransmission() {
  try {
    console.log('🧪 TESTING HTTP TRANSMISSION OF businessHoursConfig');
    
    // Simular exactamente lo que envía el frontend
    const testData = {
      companyName: "Intacon",
      companyDescription: "supare", 
      companySector: "technology",
      companyAddress: "carlos 1 ",
      companyPhone: "+34 647866656",
      companyEmail: "javisanher99@gmail.com",
      companyWebsite: "https://www.intacon.com",
      businessHoursConfig: {
        enabled: true,
        workingDays: ["tuesday"],
        openingTime: "12:00",
        closingTime: "18:00"
      },
      // Otros campos que también envía el frontend
      profile: {
        companyName: "Intacon",
        companyDescription: "supare",
        industry: "technology",
        address: "carlos 1 ",
        phone: "+34 647866656",
        email: "javisanher99@gmail.com",
        website: "https://www.intacon.com"
      },
      callConfig: {
        enabled: true,
        language: "es-ES",
        greeting: "Gracias por la información..."
      },
      emailConfig: {},
      faqs: [],
      files: []
    };
    
    console.log('📤 Datos de test preparados:');
    console.log('- businessHoursConfig existe:', !!testData.businessHoursConfig);
    console.log('- businessHoursConfig contenido:', JSON.stringify(testData.businessHoursConfig, null, 2));
    
    // Hacer petición HTTP real al endpoint
    const response = await fetch('https://saas-ai-automation.onrender.com/api/client', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiZW1haWwiOiJqYXZpc2FuaGVyOTlAZ21haWwuY29tIiwicm9sZSI6ImNsaWVudCIsImlhdCI6MTc1NDU5MzQ1MCwiZXhwIjoxNzU1MTk4MjUwfQ.3JAVq1CFQfByb0LsT-6zkn7CK0tB4N7BWynFP6Z5aRo'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📥 Respuesta del servidor:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Respuesta exitosa:', result.success);
      
      // Verificar en la base de datos
      const client = await prisma.client.findUnique({
        where: { email: 'javisanher99@gmail.com' },
        select: { businessHoursConfig: true, updatedAt: true }
      });
      
      console.log('🔍 Verificación en BD:');
      console.log('- businessHoursConfig guardado:', JSON.stringify(client.businessHoursConfig, null, 2));
      console.log('- Última actualización:', client.updatedAt);
      
      if (client.businessHoursConfig) {
        console.log('🎉 ¡SUCCESS! businessHoursConfig se guardó correctamente');
      } else {
        console.log('❌ FAILED: businessHoursConfig sigue siendo null');
      }
    } else {
      console.log('❌ Error en la respuesta:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testHttpTransmission();
