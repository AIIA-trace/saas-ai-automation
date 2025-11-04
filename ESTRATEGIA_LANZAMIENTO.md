# 🚀 ESTRATEGIA DE LANZAMIENTO - ANÁLISIS COMPLETO

## 📋 RESUMEN EJECUTIVO

**RECOMENDACIÓN:** Primero migración de URLs, luego pagos y alta de autónomo.

**RAZÓN:** Stripe, Google y otros servicios requieren URLs definitivas. Cambiarlas después genera problemas técnicos y legales.

---

## 🔍 ANÁLISIS DETALLADO

### 1️⃣ OPCIÓN A: URLs PRIMERO → PAGOS DESPUÉS ✅ **RECOMENDADA**

#### **Flujo:**
1. **Día 1-2:** Migración de URLs (render.com → dominio propio)
2. **Día 3:** Alta como autónomo
3. **Día 4-5:** Configuración de Stripe con URLs definitivas
4. **Día 6:** Lanzamiento público

#### **Ventajas:**
- ✅ **Stripe requiere URLs definitivas** para:
  - Webhook endpoints (notificaciones de pago)
  - URLs de éxito/cancelación
  - Política de privacidad y términos (URLs públicas)
  - Verificación de dominio
- ✅ **Google OAuth requiere URLs autorizadas**:
  - Redirect URIs deben coincidir exactamente
  - Cambiarlas después requiere re-verificación (1-2 semanas)
- ✅ **Microsoft Graph API** igual que Google
- ✅ **Coherencia legal**: Políticas con URLs correctas desde inicio
- ✅ **SEO**: URLs definitivas desde día 1
- ✅ **Sin migraciones dobles**: Evitas actualizar todo después

#### **Desventajas:**
- ⚠️ Web pública 2-3 días sin pagos activos
- ⚠️ Usuarios podrían registrarse en trial antes de Stripe
- **Solución:** Banner "Próximamente pagos" o limitar registros

---

### 2️⃣ OPCIÓN B: PAGOS PRIMERO → URLs DESPUÉS ❌ **NO RECOMENDADA**

#### **Desventajas críticas:**
- ❌ **Stripe**: Actualizar webhooks, URLs, políticas (24-48h)
- ❌ **Google OAuth**: Re-verificación (1-2 semanas)
- ❌ **Microsoft**: Mismo problema
- ❌ **Riesgo de downtime** durante migración
- ❌ **Doble trabajo**: Configurar todo dos veces

---

## 🎯 PLAN RECOMENDADO: OPCIÓN A

### **FASE 1: MIGRACIÓN DE URLs (Día 1-2)**

#### **1.1 Preparación del dominio**
- Comprar dominio: `aiiatrace.com` o `susanbot.com`
- Configurar DNS en Cloudflare
- Apuntar a Render.com
- Esperar propagación DNS (2-24h)

#### **1.2 Actualizar URLs en código**
```
Frontend: api-config.js
Backend: .env (FRONTEND_URL, BACKEND_URL)
Políticas legales: Todas las URLs
```

#### **1.3 Actualizar OAuth (CRÍTICO)**
**Google Cloud Console:**
- Authorized redirect URIs
- Authorized JavaScript origins

**Microsoft Azure:**
- Redirect URIs
- Web platform configuration

**Tiempo:** 2-4 horas

---

### **FASE 2: ALTA COMO AUTÓNOMO (Día 3)**

#### **Requisitos:**
- DNI/NIE
- Cuenta bancaria
- Dirección fiscal
- Epígrafe IAE: 631 (Servicios informáticos)

#### **Proceso:**
1. Alta en Hacienda (Modelo 036/037)
2. Alta en Seguridad Social (RETA)
3. Obtener certificado digital (si no tienes)

**Tiempo:** 1 día (online) o 3-5 días (presencial)

**Coste mensual:**
- Cuota autónomos: ~80€ (tarifa plana primer año)
- Gestoría (opcional): 40-80€/mes

---

### **FASE 3: CONFIGURACIÓN STRIPE (Día 4-5)**

#### **3.1 Crear cuenta Stripe**
**Documentación requerida:**
- ✅ DNI/NIE
- ✅ Datos fiscales (autónomo)
- ✅ Cuenta bancaria
- ✅ **URLs definitivas** (ya migradas)
- ✅ Política de privacidad (URL pública)
- ✅ Términos de servicio (URL pública)

#### **3.2 Configurar productos y precios**
```
Plan Básico: 29€/mes
Plan Profesional: 79€/mes
Plan Enterprise: 199€/mes
```

#### **3.3 Configurar webhooks**
```
URL: https://api.aiiatrace.com/api/stripe/webhook
Eventos:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

#### **3.4 URLs de pago**
```
Success URL: https://app.aiiatrace.com/dashboard?payment=success
Cancel URL: https://app.aiiatrace.com/pricing?payment=cancelled
```

**Tiempo:** 4-6 horas

---

### **FASE 4: TESTING (Día 5-6)**

#### **4.1 Test de pagos**
- Modo test de Stripe
- Tarjetas de prueba
- Webhooks funcionando
- Actualización de planes en BD

#### **4.2 Test de OAuth**
- Google login con nuevas URLs
- Microsoft login con nuevas URLs
- Permisos de email funcionando

#### **4.3 Test de funcionalidad**
- Registro de usuarios
- Envío/recepción de emails
- Llamadas telefónicas
- Dashboard completo

**Tiempo:** 1 día

---

### **FASE 5: LANZAMIENTO (Día 7)**

#### **5.1 Checklist pre-lanzamiento**
- [ ] URLs definitivas funcionando
- [ ] Stripe en modo producción
- [ ] OAuth verificado
- [ ] Políticas legales actualizadas
- [ ] Autónomo dado de alta
- [ ] Facturación automática configurada
- [ ] Soporte técnico preparado

#### **5.2 Lanzamiento suave**
- Invitar primeros 10-20 usuarios beta
- Monitorizar errores 24-48h
- Ajustar según feedback

#### **5.3 Lanzamiento público**
- Anuncio en redes sociales
- Email marketing
- SEO activo

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### **URLs que Stripe necesita:**
1. **Webhook URL** (backend): Para notificaciones de pago
2. **Success URL** (frontend): Después de pago exitoso
3. **Cancel URL** (frontend): Si usuario cancela
4. **Privacy Policy URL**: Obligatorio por ley
5. **Terms of Service URL**: Obligatorio por ley
6. **Refund Policy URL**: Recomendado

### **URLs que Google OAuth necesita:**
1. **Authorized redirect URIs**: Exactas, sin wildcards
2. **Authorized JavaScript origins**: Dominio principal

### **URLs que Microsoft Graph necesita:**
1. **Redirect URIs**: Exactas
2. **Logout URL**: Opcional pero recomendado

---

## 💰 COSTES ESTIMADOS

### **Inicial (una vez):**
- Dominio: 10-15€/año
- Certificado SSL: Gratis (Let's Encrypt)
- Alta autónomo: Gratis

### **Mensual:**
- Hosting Render: 0€ (plan gratuito) o 7$/mes (básico)
- Autónomo: ~80€/mes (tarifa plana)
- Gestoría: 40-80€/mes (opcional)
- Stripe: 1.5% + 0.25€ por transacción

**Total mensual:** ~120-160€

---

## 📅 CALENDARIO PROPUESTO

| Día | Tarea | Tiempo | Responsable |
|-----|-------|--------|-------------|
| 1 | Comprar dominio + DNS | 2h | Tú |
| 1-2 | Migrar URLs en código | 4h | Yo (IA) |
| 2 | Actualizar OAuth Google/Microsoft | 2h | Tú |
| 2 | Testing URLs | 2h | Ambos |
| 3 | Alta autónomo online | 4h | Tú |
| 4 | Crear cuenta Stripe | 2h | Tú |
| 4-5 | Configurar productos/webhooks | 4h | Yo (IA) |
| 5 | Testing pagos | 4h | Ambos |
| 6 | Testing completo | 8h | Ambos |
| 7 | Lanzamiento beta | - | Ambos |
| 10 | Lanzamiento público | - | Ambos |

**Total:** 10 días desde hoy

---

## ✅ CONCLUSIÓN

**ORDEN ÓPTIMO:**
1. ✅ Migración de URLs (Día 1-2)
2. ✅ Alta autónomo (Día 3)
3. ✅ Stripe con URLs definitivas (Día 4-5)
4. ✅ Testing (Día 5-6)
5. ✅ Lanzamiento (Día 7+)

**RAZÓN:** Evitas reconfigurar Stripe, Google y Microsoft. Todo queda bien desde el principio.

---

## 📞 PRÓXIMOS PASOS INMEDIATOS

1. **Decidir nombre de dominio**: aiiatrace.com vs susanbot.com
2. **Comprar dominio**: Namecheap, GoDaddy, o Cloudflare
3. **Confirmar plan**: ¿Seguimos con este orden?

¿Procedemos con la migración de URLs mañana?
