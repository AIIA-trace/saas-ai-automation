# ANÁLISIS COMPLETO DE MAPEO DE CAMPOS - BOT CONFIGURATION

## ESTRUCTURA DEL BACKEND (GET /api/config/bot)

```javascript
{
  botConfig: {
    botName: string,
    botPersonality: string,
    welcomeMessage: string,
    businessHours: string,
    workingHours: { opening: string, closing: string },
    workingDays: { monday: boolean, ... },
    callConfig: {
      enabled: boolean,
      recordCalls: boolean,
      transcribeCalls: boolean,
      voiceId: string,
      language: string,
      greeting: string
    },
    aiConfig: { temperature: number, ... },
    faqs: array,
    contextFiles: object
  },
  companyInfo: {
    name: string,           // ← clientConfig.companyName
    description: string,    // ← clientConfig.companyDescription  
    sector: string,         // ← clientConfig.industry
    address: string,        // ← clientConfig.address
    phone: string,          // ← clientConfig.phone
    email: string,          // ← clientConfig.email
    website: string         // ← clientConfig.website
  },
  emailConfig: {
    enabled: boolean,
    provider: string,
    outgoingEmail: string,
    recipientEmail: string,
    forwardRules: string,
    autoReply: boolean,
    autoReplyMessage: string,
    language: string,
    emailSignature: string,
    emailConsent: boolean,
    imapServer: string,
    imapPort: number,
    smtpServer: string,
    smtpPort: number,
    useSSL: boolean
  },
  clientInfo: {
    contactName: string,
    language: string
  }
}
```

## MAPEO DE CAMPOS - FRONTEND vs BACKEND

### 📋 INFORMACIÓN DE EMPRESA

| **Campo Frontend (ID)** | **Valor Backend (GET)** | **Campo Backend (PUT)** | **Estado** |
|------------------------|-------------------------|------------------------|------------|
| `company_name` | `companyInfo.name` | `companyName` | ✅ OK |
| `company_description` | `companyInfo.description` | `companyDescription` | ✅ OK |
| `industry` | `companyInfo.sector` | `companySector` | ⚠️ MAPEO |
| `address` | `companyInfo.address` | `companyAddress` | ✅ OK |
| `main_phone` | `companyInfo.phone` | `companyPhone` | ✅ OK |
| `contact_email` | `companyInfo.email` | `companyEmail` | ✅ OK |
| `website` | `companyInfo.website` | `companyWebsite` | ✅ OK |

### 📞 CONFIGURACIÓN DE LLAMADAS

| **Campo Frontend (ID)** | **Valor Backend (GET)** | **Campo Backend (PUT)** | **Estado** |
|------------------------|-------------------------|------------------------|------------|
| `call_bot_active` | `botConfig.callConfig.enabled` | `callConfig.enabled` | ✅ OK |
| `call_recording` | `botConfig.callConfig.recordCalls` | `callConfig.recordCalls` | ✅ OK |
| `call_transcription` | `botConfig.callConfig.transcribeCalls` | `callConfig.transcribeCalls` | ✅ OK |
| `voice_type` | `botConfig.callConfig.voiceId` | `callConfig.voiceId` | ✅ OK |
| `call_language` | `botConfig.callConfig.language` | `callConfig.language` | ✅ OK |
| `call_greeting` | `botConfig.callConfig.greeting` | `callConfig.greeting` | ✅ OK |

### 📧 CONFIGURACIÓN DE EMAIL

| **Campo Frontend (ID)** | **Valor Backend (GET)** | **Campo Backend (PUT)** | **Estado** |
|------------------------|-------------------------|------------------------|------------|
| `email_bot_active` | `emailConfig.enabled` | `emailConfig.enabled` | ✅ OK |
| `email_provider` | `emailConfig.provider` | `emailConfig.provider` | ✅ OK |
| `outgoing_email` | `emailConfig.outgoingEmail` | `emailConfig.outgoingEmail` | ✅ OK |
| `recipient_email` | `emailConfig.recipientEmail` | `emailConfig.recipientEmail` | ✅ OK |
| `forward_rules` | `emailConfig.forwardRules` | `emailConfig.forwardRules` | ✅ OK |
| `auto_reply` | `emailConfig.autoReply` | `emailConfig.autoReply` | ✅ OK |
| `auto_reply_message` | `emailConfig.autoReplyMessage` | `emailConfig.autoReplyMessage` | ✅ OK |
| `email_language` | `emailConfig.language` | `emailConfig.language` | ✅ OK |
| `email_signature` | `emailConfig.emailSignature` | `emailConfig.emailSignature` | ✅ OK |
| `email_consent` | `emailConfig.emailConsent` | `emailConfig.emailConsent` | ✅ OK |
| `imap_server` | `emailConfig.imapServer` | `emailConfig.imapServer` | ✅ OK |
| `imap_port` | `emailConfig.imapPort` | `emailConfig.imapPort` | ✅ OK |
| `smtp_server` | `emailConfig.smtpServer` | `emailConfig.smtpServer` | ✅ OK |
| `smtp_port` | `emailConfig.smtpPort` | `emailConfig.smtpPort` | ✅ OK |
| `use_ssl` | `emailConfig.useSSL` | `emailConfig.useSSL` | ✅ OK |

### 🤖 CONFIGURACIÓN GENERAL DEL BOT

| **Campo Frontend (ID)** | **Valor Backend (GET)** | **Campo Backend (PUT)** | **Estado** |
|------------------------|-------------------------|------------------------|------------|
| `bot_name` | `botConfig.botName` | `botName` | ✅ OK |
| `bot_personality` | `botConfig.botPersonality` | `botPersonality` | ✅ OK |
| `welcome_message` | `botConfig.welcomeMessage` | `welcomeMessage` | ✅ OK |
| `business_hours` | `botConfig.businessHours` | `businessHours` | ✅ OK |

### 🕒 HORARIOS DE TRABAJO

| **Campo Frontend (ID)** | **Valor Backend (GET)** | **Campo Backend (PUT)** | **Estado** |
|------------------------|-------------------------|------------------------|------------|
| `opening_hour` | `botConfig.workingHours.opening` | `workingHours.opening` | ✅ OK |
| `closing_hour` | `botConfig.workingHours.closing` | `workingHours.closing` | ✅ OK |
| `monday` | `botConfig.workingDays.monday` | `workingDays.monday` | ✅ OK |
| `tuesday` | `botConfig.workingDays.tuesday` | `workingDays.tuesday` | ✅ OK |
| `wednesday` | `botConfig.workingDays.wednesday` | `workingDays.wednesday` | ✅ OK |
| `thursday` | `botConfig.workingDays.thursday` | `workingDays.thursday` | ✅ OK |
| `friday` | `botConfig.workingDays.friday` | `workingDays.friday` | ✅ OK |
| `saturday` | `botConfig.workingDays.saturday` | `workingDays.saturday` | ✅ OK |
| `sunday` | `botConfig.workingDays.sunday` | `workingDays.sunday` | ✅ OK |

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. ❌ PROBLEMA CRÍTICO EN loadBotConfiguration()
**Línea problemática:** Acceso incorrecto a campos de empresa
```javascript
// ❌ INCORRECTO (antes):
safeSetValue('main_phone', botConfig.company.phone);

// ✅ CORRECTO (después):
safeSetValue('main_phone', botConfig.companyInfo.phone);
```

### 2. ⚠️ MAPEO INCONSISTENTE
- **Frontend:** `industry` 
- **Backend GET:** `companyInfo.sector`
- **Backend PUT:** `companySector`

## ✅ CORRECCIONES NECESARIAS

1. **loadBotConfiguration():** Usar `botConfig.companyInfo.*` en lugar de `botConfig.company.*`
2. **Verificar mapeo de `industry` ↔ `sector`**
3. **Confirmar que todos los campos de email se cargan correctamente**
4. **Verificar campos de horarios de trabajo**

## 🎯 ESTADO ACTUAL

- **saveUnifiedConfig():** ✅ CORREGIDO - Envía estructura correcta
- **loadBotConfiguration():** ⚠️ PARCIALMENTE CORREGIDO - Necesita verificación completa
- **Mapeo de campos:** ⚠️ REQUIERE VERIFICACIÓN COMPLETA
