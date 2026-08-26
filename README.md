# Family Finance 💰

**Aplicación de gestión inteligente de economía familiar para parejas.**

Una aplicación web moderna diseñada para que dos personas que forman una pareja puedan gestionar conjuntamente su economía familiar, con sincronización en tiempo real.

![Estado](https://img.shields.io/badge/estado-MVP-blue)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)

## ✨ Características Principales

- **👥 Economía compartida**: Dos usuarios gestionan la misma economía familiar
- **⚡ Sincronización en tiempo real**: Los cambios aparecen instantáneamente para ambos usuarios
- **📊 Dashboard visual**: Métricas clave, gráficos y Health Score 0-100
- **🤖 Asistente IA**: Recomendaciones personalizadas y accionables
- **📱 Responsive**: Funciona perfectamente en móvil, tablet y escritorio
- **🌙 Dark Mode**: Tema oscuro diseñado específicamente
- **💰 Control financiero**: Gastos, ingresos, presupuestos, objetivos, deudas, patrimonio
- **📅 Calendario financiero**: Anticipa pagos y eventos
- **🔒 Seguridad**: Cifrado de contraseñas, sesiones seguras

## 🚀 Demo Rápida

Abre `index.html` en tu navegador y pulsa **"✨ Explorar con datos de demostración"** para ver la app funcionando inmediatamente con:

- Usuarios demo: `daniel@demo.es` / `demo1234` y `maria@demo.es` / `demo1234`
- 8 meses de datos históricos
- Transacciones, presupuestos, objetivos, suscripciones
- IA activa con recomendaciones

## 🔄 Sincronización Realtime

Para probar la sincronización entre usuarios:

1. Abre `index.html` en una pestaña → entra como Daniel
2. Abre otra pestaña del mismo archivo → cambia a María (Ajustes → "↺ Cambiar de usuario")
3. Añade un gasto como Daniel → aparecerá instantáneamente en la pestaña de María

## 📦 Estructura del Proyecto

```
family-finance/
├── index.html          # Página principal (entry point)
├── chunk1.html         # HTML head + CSS (estilos iOS/minimalista)
├── chunk2.js           # Core: DB, Auth, Family Space, Financial Engine
├── chunk3.js           # Estado, router, auth, onboarding
├── chunk4.js           # Shell, Dashboard, gráficos
├── chunk5.js           # Vistas principales
├── chunk6.js           # Modales (gastos, ingresos, etc.)
├── chunk7.js           # Export/import, plantillas, init
├── vercel.json         # Configuración de despliegue
└── README.md           # Este archivo
```

## 🛠️ Stack Tecnológico

### Demo actual (funciona offline)
- HTML5 + JavaScript vanilla
- localStorage para persistencia
- BroadcastChannel para sincronización entre pestañas
- SVG para gráficos
- CSS3 con variables (dark mode)

### Producción recomendada
- Next.js 15 + TypeScript
- PostgreSQL + Drizzle ORM
- NextAuth v5 para autenticación
- Supabase/Postgres LISTEN-NOTIFY para realtime
- Tailwind CSS + shadcn/ui
- OpenAI/Anthropic API para IA

## 🚀 Despliegue en Vercel

### Método 1: GitHub + Vercel (recomendado)

1. **Sube el código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Family Finance MVP"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/family-finance.git
   git push -u origin main
   ```

2. **Despliega en Vercel:**
   - Ve a [vercel.com](https://vercel.com) e inicia sesión
   - Click en "Add New Project"
   - Importa tu repositorio de GitHub
   - Framework Preset: `Other`
   - Build Command: (dejar vacío)
   - Output Directory: `.`
   - Click en "Deploy"

### Método 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## 📱 Uso en Móvil

Una vez desplegada en Vercel:

1. Abre el enlace de Vercel en tu móvil
2. En Safari (iOS) o Chrome (Android), usa "Añadir a pantalla de inicio"
3. La app se comportará como una PWA nativa

## 🔐 Seguridad

- Contraseñas cifradas con SHA-256 + salt
- Sesiones con expiración configurable
- Validación de entrada en todos los formularios
- Sanitización de HTML
- Headers de seguridad configurados

## 💡 Próximas Mejoras

- [ ] Backend con Next.js + PostgreSQL
- [ ] Autenticación OAuth (Google, Apple, Microsoft)
- [ ] Realtime con WebSockets
- [ ] IA con LLM real (OpenAI/Anthropic)
- [ ] Open Banking integration
- [ ] Export/Import (CSV, Excel, PDF)
- [ ] Multi-moneda
- [ ] Notificaciones push

## 📄 Licencia

MIT License - ver archivo LICENSE para más detalles.

## 🤝 Contribución

Este es un proyecto personal. Para sugerencias o issues, abre un issue en GitHub.

## 🌐 Configuración de Supabase (Sincronización entre dispositivos)

**Sin Supabase**: La app funciona en modo demo local (datos solo en un navegador).

**Con Supabase**: Las cuentas se sincronizan entre dispositivos (recomendado para producción).

### Paso 1: Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita
2. Click en **"New Project"**
   - Name: `family-finance` (o el que prefieras)
   - Database Password: genera una contraseña segura y guárdala
   - Region: elige la más cercana a ti
3. Espera ~2 minutos a que el proyecto se inicialice

### Paso 2: Configurar la base de datos

1. En el panel de Supabase, ve a **"SQL Editor"** (icono de base de datos en el sidebar)
2. Click en **"New Query"**
3. Abre el archivo `supabase-setup.sql` de este repositorio
4. Copia TODO el contenido del archivo
5. Pégalo en el SQL Editor de Supabase
6. Click en **"Run"** (o Ctrl+Enter)

Si todo va bien, verás un mensaje de éxito. Las tablas y políticas están creadas.

### Paso 3: Desactivar confirmación de email (recomendado para probar)

Por defecto, Supabase requiere confirmar el email al registrarse. Para simplificar las pruebas:

1. Ve a **"Authentication"** → **"Providers"** → **"Email"**
2. Desmarca **"Confirm email"**
3. Click en **"Save"**

⚠️ **Para producción**: Deja la confirmación activada por seguridad.

### Paso 4: Obtener credenciales

1. Ve a **"Project Settings"** → **"API"**
2. Copia estos dos valores:
   - **Project URL**: algo como `https://xyz.supabase.co`
   - **anon public key**: una cadena larga que empieza por `eyJ...`

### Paso 5: Configurar la app

1. Abre el archivo `config.js` en este repositorio
2. Pega tus credenciales:

```javascript
window.FF_CONFIG = {
  supabaseUrl: 'https://xyz.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

3. Guarda el archivo y haz commit:

```bash
git add config.js
git commit -m "Config: añadir credenciales de Supabase"
git push origin main
```

Vercel detectará el push y redesplegará automáticamente (~30 segundos).

### Paso 6: Probar la app

1. Abre la URL de Vercel en tu navegador
2. Verás una pantalla de carga mientras se conecta a Supabase
3. Crea una cuenta con tu email y contraseña
4. Completa el onboarding (6 pasos rápidos)
5. Verás un código de invitación: compártelo con tu pareja
6. Tu pareja se registra en otro dispositivo y usa "Unirme" con el código
7. ¡Listo! Ambos ven y modifican los mismos datos en tiempo real

## 🧪 Pruebas de Sincronización entre Dispositivos

Para verificar que el realtime funciona:

1. **Dispositivo 1**: Abre la app y haz login como Usuario 1
2. **Dispositivo 2**: Abre la app en otro navegador/dispositivo y haz login como Usuario 2
3. En el dispositivo 1, añade un gasto de €50 en Restaurantes
4. En el dispositivo 2, verás aparecer el gasto automáticamente (sin recargar)

## 🔒 Seguridad con Supabase

- **Autenticación**: Supabase Auth con JWT y refresh tokens
- **Autorización**: Row Level Security (RLS) en PostgreSQL
- **Datos sensibles**: Encriptación at-rest (Supabase gestionado)
- **Validación**: Validaciones SQL en servidor + cliente
- **Rate limiting**: Configurado en Supabase (por defecto)

## 💰 Precios

- **Supabase**: Plan gratuito incluye 500MB de base de datos, 2GB de transferencia y 50,000 usuarios activos mensuales (más que suficiente para una pareja)
- **Vercel**: Plan gratuito con despliegues ilimitados y 100GB de bandwidth

## 🆘 Soporte

Si tienes problemas:

1. **La app no carga**: Verifica que `config.js` tenga las credenciales correctas
2. **Error de RLS**: Ejecuta de nuevo `supabase-setup.sql` en el SQL Editor
3. **No recibo cambios en tiempo real**: Verifica que Realtime esté habilitado en Supabase
4. **Problemas de login**: Asegúrate de haber desactivado "Confirm email" en Supabase

Para más ayuda, abre un issue en GitHub.

---

**Desarrollado con ❤️ para gestionar mejor la economía familiar.**
