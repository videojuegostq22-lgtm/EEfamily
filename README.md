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

---

**Desarrollado con ❤️ para gestionar mejor la economía familiar.**
