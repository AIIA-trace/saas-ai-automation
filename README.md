# 🤖 SaaS AI Call & Email Automation

Sistema SaaS completo para automatización de llamadas y emails con IA.

## 🚀 Características

- **Bot de Voz**: Automatización de llamadas con IA
- **Gestión de Emails**: Respuestas automáticas inteligentes
- **Dashboard Completo**: Panel de control empresarial
- **Integración Twilio**: Manejo de números telefónicos
- **Configuración Sectorial**: Adaptado por industria

## 🛠️ Tecnologías

- **Backend**: Node.js, Express, Prisma ORM
- **Frontend**: HTML5, JavaScript, Bootstrap 5
- **Base de Datos**: PostgreSQL (Producción), SQLite (Desarrollo)
- **Integraciones**: Twilio, OpenAI, ElevenLabs, n8n

## 📦 Instalación

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push

# Frontend
cd frontend
python3 -m http.server 8000
```

## 🌐 Deploy

- **Backend**: Render.com
- **Frontend**: Netlify/Vercel
- **Base de Datos**: PostgreSQL en Render

## 📝 Variables de Entorno

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
OPENAI_API_KEY=your-key
ELEVENLABS_API_KEY=your-key
```

## 🎯 Uso

1. Registro de empresa
2. Configuración del bot
3. Integración de números
4. Monitoreo en dashboard

---
**Desarrollado para automatización empresarial completa** 🚀
