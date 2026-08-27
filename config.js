// ============================================================================
// FAMILY FINANCE — Configuration
// ============================================================================
// Para habilitar el modo nube (Supabase) y que las cuentas funcionen entre
// dispositivos, completa los valores a continuación:
//
// CÓMO OBTENER LAS CREDENCIALES CORRECTAS:
// 1. Entra en tu proyecto en https://supabase.com/dashboard
// 2. En el menú de la izquierda, haz clic en "Project Settings" (icono de rueda dentada)
// 3. Haz clic en "API" (dentro de "Configuration")
// 4. Copia EXACTAMENTE estos dos valores:
//    - "Project URL" (ej: https://abcdefgh.supabase.co)
//    - "Project API keys" → "anon" → "public" (empieza por "eyJ...")
//
// ⚠️ ERRORES COMUNES:
// - NO pongas "/rest/v1/" al final de la URL
// - NO uses la clave "service_role" (es secreta)
// - NO uses "sb_publishable_..." (esa es la Management API, NO la anon key)
// - La anon key SIEMPRE empieza por "eyJ" y tiene ~200 caracteres
//
// Si dejas estos valores vacíos, la app funcionará en modo demo (solo local)
// ============================================================================

window.FF_CONFIG = {
  // URL de tu proyecto Supabase
  // CORRECTO: https://abcdefgh.supabase.co
  // INCORRECTO: https://abcdefgh.supabase.co/rest/v1/
  supabaseUrl: 'https://bbarapgatlqndxlbdyld.supabase.co',

  // Clave pública ANON de tu proyecto Supabase
  // Debe empezar por "eyJ" y tener ~200 caracteres
  // NO uses "sb_publishable_..." ni la clave "service_role"
  supabaseAnonKey: 'sb_publishable_TFfOq18G2T7ii7N4V7gdTg_hc7X0nyN' // ← PEGA AQUÍ tu anon key de Supabase (Settings → API → Project API keys → anon public)
};
