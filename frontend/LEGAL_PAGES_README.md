# 📋 Páginas Legales y Footer - SusanBot

## ✅ Archivos Creados

### Páginas Legales Completas
1. **privacy-policy.html** - Política de Privacidad
2. **terms-of-service.html** - Términos de Servicio
3. **cookie-policy.html** - Política de Cookies
4. **gdpr.html** - Información RGPD
5. **security.html** - Seguridad

### Componentes
6. **components/footer.html** - Footer reutilizable

---

## 🎯 Propósito

Estas páginas son **OBLIGATORIAS** para:
- ✅ Verificación de Google OAuth (Gmail API)
- ✅ Verificación de Microsoft OAuth (Graph API)
- ✅ Cumplimiento RGPD/GDPR
- ✅ Cumplimiento legal en España y UE
- ✅ Confianza de usuarios

---

## 🔧 Cómo Implementar el Footer

### Opción 1: Incluir en cada página HTML (Recomendado)

Añade esto **ANTES** del cierre de `</body>` en cada página:

```html
<!-- Footer Legal -->
<div id="footer-container"></div>

<script>
    // Cargar footer dinámicamente
    fetch('/components/footer.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('footer-container').innerHTML = html;
        })
        .catch(error => console.error('Error cargando footer:', error));
</script>
```

### Opción 2: Server-Side Include (Si usas un servidor que lo soporte)

```html
<!--#include virtual="/components/footer.html" -->
```

### Opción 3: PHP Include (Si usas PHP)

```php
<?php include 'components/footer.html'; ?>
```

### Opción 4: Copiar y pegar directamente

Copia el contenido de `components/footer.html` directamente en cada página HTML antes de `</body>`.

---

## 📝 Páginas que DEBEN incluir el footer

### Páginas Públicas
- ✅ `index.html` (Landing page)
- ✅ `register.html`
- ✅ `login.html`
- ✅ `pricing.html` (si existe)
- ✅ `features.html` (si existe)

### Páginas de Dashboard
- ✅ `dashboard.html`
- ✅ Todas las páginas internas de la aplicación

### Páginas Legales (ya tienen footer incluido)
- ✅ `privacy-policy.html`
- ✅ `terms-of-service.html`
- ✅ `cookie-policy.html`
- ✅ `gdpr.html`
- ✅ `security.html`

---

## 🔗 URLs que debes configurar

### En Google Cloud Console
1. Ve a: https://console.cloud.google.com/
2. Selecciona tu proyecto
3. **APIs & Services** → **OAuth consent screen**
4. Añade estas URLs:

**Application Homepage:**
```
https://www.susanbot.com
```

**Privacy Policy URL:**
```
https://www.susanbot.com/privacy-policy.html
```

**Terms of Service URL:**
```
https://www.susanbot.com/terms-of-service.html
```

### En Microsoft Azure
1. Ve a: https://portal.azure.com/
2. **Azure Active Directory** → **App registrations**
3. Selecciona tu app
4. **Branding**:

**Privacy Statement URL:**
```
https://www.susanbot.com/privacy-policy.html
```

**Terms of Service URL:**
```
https://www.susanbot.com/terms-of-service.html
```

---

## ⚠️ IMPORTANTE: Personalizar Información

Antes de publicar, **DEBES** actualizar estos datos en TODAS las páginas:

### 1. Información de Contacto
Busca y reemplaza en todos los archivos:

```
[Tu dirección física] → Tu dirección real
[Tu teléfono] → Tu teléfono real
[Tu CIF/NIF] → Tu CIF/NIF real
```

### 2. Emails de Contacto
Verifica que estos emails estén configurados:

- **info@susanbot.com** - Información general
- **support@susanbot.com** - Soporte técnico
- **privacy@susanbot.com** - Privacidad y RGPD
- **dpo@susanbot.com** - Delegado de Protección de Datos
- **legal@susanbot.com** - Asuntos legales
- **security@susanbot.com** - Seguridad
- **billing@susanbot.com** - Facturación

### 3. Redes Sociales
Actualiza los enlaces en `components/footer.html`:

```html
<a href="#" class="text-light me-3" title="LinkedIn">
```

Cambia `#` por tus URLs reales de redes sociales.

---

## 📋 Checklist de Verificación

Antes de solicitar verificación de Google/Microsoft:

- [ ] Todas las páginas legales están publicadas en www.susanbot.com
- [ ] El footer está incluido en todas las páginas principales
- [ ] Información de contacto actualizada (dirección, teléfono, CIF)
- [ ] Emails de contacto configurados y funcionando
- [ ] URLs añadidas en Google Cloud Console
- [ ] URLs añadidas en Microsoft Azure
- [ ] Dominio www.susanbot.com configurado en Render
- [ ] SSL/HTTPS funcionando correctamente
- [ ] Todas las páginas son accesibles públicamente
- [ ] No hay errores 404 en las páginas legales

---

## 🎨 Personalización Visual

### Colores del Footer
Puedes cambiar los colores editando el CSS en `components/footer.html`:

```css
.footer {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}
```

### Agregar más enlaces
Edita las columnas en `components/footer.html` para añadir más enlaces según tus necesidades.

---

## 🔒 Divulgaciones Obligatorias

### Google OAuth
Las páginas incluyen la divulgación requerida:

> "El uso que hace SusanBot de la información recibida de las APIs de Google se ajustará a la 
> Política de Datos de Usuario de los Servicios de API de Google, incluidos los requisitos de Uso Limitado."

### Microsoft OAuth
Las páginas incluyen la divulgación requerida:

> "El uso que hace SusanBot de Microsoft Graph API cumple con los Términos de Uso de Microsoft API."

---

## 📞 Soporte

Si tienes preguntas sobre la implementación:

1. Revisa este README
2. Verifica que todos los archivos estén en su lugar
3. Prueba las páginas localmente antes de publicar
4. Contacta al equipo de desarrollo si necesitas ayuda

---

## 🚀 Próximos Pasos

1. **Implementar el footer** en todas las páginas
2. **Personalizar información** de contacto
3. **Configurar emails** de contacto
4. **Publicar en producción** (www.susanbot.com)
5. **Actualizar Google Cloud Console** con las URLs
6. **Actualizar Microsoft Azure** con las URLs
7. **Solicitar verificación** de Google OAuth
8. **Solicitar verificación** de Microsoft OAuth

---

**Fecha de creación:** 3 de noviembre de 2025  
**Versión:** 1.0  
**Autor:** Cascade AI Assistant
