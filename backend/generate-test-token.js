#!/usr/bin/env node

/**
 * Genera un JWT token para testing
 * Uso: node generate-test-token.js <email>
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generateToken() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('❌ Error: Debes proporcionar un email');
    console.log('');
    console.log('Uso:');
    console.log('   node generate-test-token.js <email>');
    console.log('');
    console.log('Ejemplo:');
    console.log('   node generate-test-token.js tu@email.com');
    process.exit(1);
  }
  
  try {
    // Buscar cliente por email
    const client = await prisma.client.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        companyName: true,
        subscriptionPlan: true
      }
    });
    
    if (!client) {
      console.log(`❌ No se encontró cliente con email: ${email}`);
      process.exit(1);
    }
    
    // Generar JWT token
    const token = jwt.sign(
      {
        clientId: client.id,
        email: client.email,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    console.log('🎫 === JWT TOKEN GENERADO ===');
    console.log('');
    console.log('📋 Cliente:');
    console.log(`   ID: ${client.id}`);
    console.log(`   Email: ${client.email}`);
    console.log(`   Empresa: ${client.companyName || 'No especificada'}`);
    console.log(`   Plan: ${client.subscriptionPlan || 'basic'}`);
    console.log('');
    console.log('🔑 Token JWT:');
    console.log(token);
    console.log('');
    console.log('⏰ Válido por: 24 horas');
    console.log('');
    console.log('📝 Para usar en tests:');
    console.log(`   node test-twilio-setup.js "${token}" <account-sid> <auth-token> [phone-number]`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

generateToken();
