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
//    - "Project API keys" → "Publishable key" (formato nuevo 2025: sb_publishable_xxxxx)
//      O BIEN la "anon key" legacy (formato antiguo: eyJxxxxx) — ambas funcionan
//
// ⚠️ ERRORES COMUNES:
// - NO pongas "/rest/v1/" al final de la URL
// - NO uses la "Secret key" (esa es solo para backend, nunca para el cliente)
// - La "Publishable key" (sb_publishable_...) SÍ es válida para el cliente
// - La "anon key" legacy (eyJ...) también es válida
//
// Si dejas estos valores vacíos, la app funcionará en modo demo (solo local)
// ============================================================================

window.FF_CONFIG = {
  // URL de tu proyecto Supabase
  // CORRECTO: https://abcdefgh.supabase.co
  // INCORRECTO: https://abcdefgh.supabase.co/rest/v1/
  supabaseUrl: 'https://bbarapgatlqndxlbdyld.supabase.co',

  // Clave pública de tu proyecto Supabase
  // Puede ser:
  //   - Formato nuevo 2025: "sb_publishable_xxxxx" (Publishable key)
  //   - Formato legacy: "eyJ..." (~200 chars, anon key)
  // Ambas funcionan igual. Copia la que aparezca como "Publishable" o "anon"
  // en Settings → API → Project API keys
  supabaseAnonKey: 'sb_publishable_TFfOq18G2T7ii7N4V7gdTg_hc7X0nyN'
};
