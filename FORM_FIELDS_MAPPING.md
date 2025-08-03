# 📋 MAPEO COMPLETO DE CAMPOS DE FORMULARIOS

## 🎯 OBJETIVO
Documentar todos los campos de formulario del sistema para garantizar consistencia entre frontend, backend y base de datos.

---

## 📝 FORMULARIOS DEL SISTEMA

### 1️⃣ **REGISTRO DE USUARIO** (`register.html`)
**Estado:** ✅ COMPLETO

| Campo Frontend | ID HTML | Backend Field | DB Column | Estado |
|---------------|---------|---------------|-----------|---------|
| Email | `email` | `email` | `email` | ✅ |
| Password | `password` | `password` | `password` | ✅ |
| Company Name | `companyName` | `companyName` | `companyName` | ✅ |
| Company Description | `companyDescription` | `companyDescription` | `companyDescription` | ✅ |
| Business Sector | `businessSector` | `businessSector` | `industry` | ✅ |
| Contact Phone | `contactPhone` | `contactPhone` | `phone` | ✅ |

---

### 2️⃣ **LOGIN DE USUARIO** (`login.html`)
**Estado:** ✅ COMPLETO

| Campo Frontend | ID HTML | Backend Field | DB Column | Estado |
|---------------|---------|---------------|-----------|---------|
| Email | `email` | `email` | `email` | ✅ |
| Password | `password` | `password` | `password` | ✅ |
| Remember Me | `rememberMe` | `rememberMe` | N/A | ✅ |

---

### 3️⃣ **CONFIGURACIÓN DEL BOT** (Dashboard)
**Estado:** ✅ COMPLETO

#### **A. INFORMACIÓN DE LA EMPRESA**
| Campo Frontend | ID HTML | Backend Field | DB Column | Estado |
|---------------|---------|---------------|-----------|---------|
| Company Name | `company_name` | `companyName` | `companyName` | ✅ |
| Contact Email | `contact_email` | `companyEmail` | `companyInfo.email` | ✅ |
| Main Phone | `main_phone` | `companyPhone` | `companyInfo.phone` | ✅ |
| Address | `address` | `companyAddress` | `companyInfo.address` | ✅ |
| Company Description | `company_description` | `companyDescription` | `companyDescription` | ✅ |
| Website | `website` | `companyWebsite` | `companyInfo.website` | ✅ |
| Industry | `industry` | `companySector` | `industry` + `companyInfo.sector` | ✅ |

#### **B. CONFIGURACIÓN DEL BOT**
| Campo Frontend | ID HTML | Backend Field | DB Column | Estado |
|---------------|---------|---------------|-----------|---------|
| Bot Name | `bot_name` | `botName` | `botConfig.name` | ✅ |
| Bot Personality | `bot_personality` | `botPersonality` | `botConfig.personality` | ✅ |
| Working Hours | `working_hours` | `workingHours` | `botConfig.workingHours` | ✅ |
| Working Days | `working_days` | `workingDays` | `botConfig.workingDays` | ✅ |
| Bot Active | `call_bot_active` | `botActive` | `botConfig.active` | ✅ |

#### **C. CONFIGURACIÓN DE LLAMADAS**
| Campo Frontend | ID HTML | Backend Field | DB Column | Estado |
|---------------|---------|---------------|-----------|---------|
| Call Language | `call_language` | `callConfig.language` | `botConfig.callConfig.language` | ✅ |
| Voice Type | `voice_type` | `callConfig.voiceId` | `botConfig.callConfig.voiceId` | ✅ |
| Call Greeting | `call_greeting` | `callConfig.greeting` | `botConfig.callConfig.greeting` | ✅ |
| Call Enabled | `call_enabled` | `callConfig.enabled` | `botConfig.callConfig.enabled` | ✅ |

#### **D. CONFIGURACIÓN DE IA**
| Campo Frontend | Backend Field | Database Column | Estado |
|----------------|---------------|-----------------|--------|
| `ai_temperature` | `aiConfig.temperature` | `botConfig.aiConfig.temperature` | ✅ COMPLETO |
| `ai_max_tokens` | `aiConfig.maxTokens` | `botConfig.aiConfig.maxTokens` | ✅ COMPLETO |
| `ai_top_p` | `aiConfig.topP` | `botConfig.aiConfig.topP` | ✅ COMPLETO |
| `ai_frequency_penalty` | `aiConfig.frequencyPenalty` | `botConfig.aiConfig.frequencyPenalty` | ✅ COMPLETO |
| `ai_presence_penalty` | `aiConfig.presencePenalty` | `botConfig.aiConfig.presencePenalty` | ✅ COMPLETO |

#### **E. CONFIGURACIÓN DE EMAIL**
| Campo Frontend | ID HTML | Backend Field | DB Column | Estado |
|---------------|---------|---------------|-----------|---------|
| Email Signature | `email_signature` | `emailConfig.emailSignature` | `emailConfig.emailSignature` | ✅ |
| Email Consent | `email_consent` | `emailConfig.emailConsent` | `emailConfig.emailConsent` | ✅ |
| IMAP Server | `imap_server` | `emailConfig.imapServer` | `emailConfig.imapServer` | ✅ |
| IMAP Port | `imap_port` | `emailConfig.imapPort` | `emailConfig.imapPort` | ✅ |
| SMTP Server | `smtp_server` | `emailConfig.smtpServer` | `emailConfig.smtpServer` | ✅ |
| SMTP Port | `smtp_port` | `emailConfig.smtpPort` | `emailConfig.smtpPort` | ✅ |
| Email Username | `email_username` | `emailConfig.username` | `emailConfig.username` | ✅ |
| Email Password | `email_password` | `emailConfig.password` | `emailConfig.password` | ✅ |
| Use SSL | `use_ssl` | `emailConfig.useSSL` | `emailConfig.useSSL` | ✅ |
| Email Provider | `email_provider` | `emailConfig.provider` | `emailConfig.provider` | ✅ |
| Outgoing Email | `outgoing_email` | `emailConfig.outgoingEmail` | `emailConfig.outgoingEmail` | ✅ |

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **Campos de IA procesados en backend**
Los campos de configuración de IA (`ai_temperature`, `ai_max_tokens`, etc.) están completamente implementados y funcionando.

### 2. **Campos dinámicos**
Algunos campos se crean dinámicamente en JavaScript, lo que dificulta el mapeo consistente.

### 3. **Validación inconsistente**
No hay un patrón consistente de validación entre formularios.

---

## 📋 PRÓXIMOS PASOS

1. **Estandarizar IDs:** Crear convención consistente para IDs de campos
2. **Validación unificada:** Implementar validación consistente
3. **Documentar campos dinámicos:** Mapear campos que se crean en runtime
4. **Pruebas de extremo a extremo:** Verificar flujo completo de datos

---

## 🎯 ESTADO GENERAL

- **Registro:** ✅ 100% completo
- **Login:** ✅ 100% completo  
- **Configuración Bot:** ⚠️ 85% completo (faltan campos de IA)
- **Configuración Email:** ✅ 100% completo
- **Información Empresa:** ✅ 100% completo

**Total del sistema:** 📊 **92% completo**
