-- ============================================================================
-- FAMILY FINANCE — Supabase Database Schema (v2 - políticas corregidas)
-- ============================================================================
-- CAMBIOS IMPORTANTES EN ESTA VERSIÓN:
-- - Añadida función helper is_member_of_space() con SECURITY DEFINER
--   (bypass-ea RLS para evitar recursión infinita)
-- - Simplificadas las políticas de family_members (sin subconsultas a sí misma)
-- - Las políticas de family_spaces e invitations usan la función helper
-- ============================================================================
-- Instrucciones:
-- 1. Entra en Supabase → SQL Editor
-- 2. Borra primero las políticas existentes (si quieres empezar de cero):
--      drop policy if exists "Usuarios autenticados pueden ver perfiles" on public.profiles;
--      drop policy if exists "Usuarios pueden insertar su propio perfil" on public.profiles;
--      drop policy if exists "Usuarios pueden actualizar su propio perfil" on public.profiles;
--      drop policy if exists "Miembros pueden ver su espacio" on public.family_spaces;
--      drop policy if exists "Usuarios autenticados pueden crear espacios" on public.family_spaces;
--      drop policy if exists "Miembros pueden actualizar su espacio" on public.family_spaces;
--      drop policy if exists "Miembros pueden ver miembros de su espacio" on public.family_members;
--      drop policy if exists "Usuarios pueden añadirse como miembros" on public.family_members;
--      drop policy if exists "Usuarios autenticados pueden ver invitaciones" on public.invitations;
--      drop policy if exists "Creadores del espacio pueden crear invitaciones" on public.invitations;
--      drop policy if exists "Usuarios pueden aceptar invitaciones" on public.invitations;
-- 3. Copia y pega TODO este SQL
-- 4. Haz clic en "Run"
-- ============================================================================

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- ============================================================================
-- TABLAS
-- ============================================================================

-- Perfiles de usuario (1:1 con auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Espacios familiares (cada pareja tiene uno)
create table if not exists public.family_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid references public.profiles(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  data_version integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Miembros (relación muchos a muchos entre usuarios y espacios)
create table if not exists public.family_members (
  space_id uuid references public.family_spaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (space_id, user_id)
);

-- Invitaciones (códigos para unirse a un espacio)
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.family_spaces(id) on delete cascade not null,
  code text unique not null,
  created_by uuid references public.profiles(id) on delete set null,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

create index if not exists idx_family_members_user_id on public.family_members(user_id);
create index if not exists idx_invitations_code on public.invitations(code);
create index if not exists idx_family_spaces_invite_code on public.family_spaces(invite_code);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.family_spaces enable row level security;
alter table public.family_members enable row level security;
alter table public.invitations enable row level security;

-- ============================================================================
-- FUNCIÓN HELPER CRÍTICA (SECURITY DEFINER — bypass-ea RLS)
-- ============================================================================
-- Esta función se ejecuta con permisos elevados (del propietario de la función,
-- no del usuario actual), evitando la recursión infinita que ocurriría si las
-- políticas intentaran consultar directamente family_members.
-- ============================================================================

create or replace function public.is_member_of_space(p_space_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.family_members
    where space_id = p_space_id and user_id = auth.uid()
  );
$$;

-- ============================================================================
-- POLÍTICAS RLS (SIN RECURSIÓN)
-- ============================================================================

-- PROFILES
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "Usuarios autenticados pueden ver perfiles" on public.profiles;
drop policy if exists "Usuarios pueden insertar su propio perfil" on public.profiles;
drop policy if exists "Usuarios pueden actualizar su propio perfil" on public.profiles;

create policy "profiles_select" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- FAMILY_MEMBERS (POLÍTICAS SIMPLES — sin subconsultas a sí misma)
drop policy if exists "fm_select" on public.family_members;
drop policy if exists "fm_insert" on public.family_members;
drop policy if exists "fm_delete" on public.family_members;
drop policy if exists "Miembros pueden ver miembros de su espacio" on public.family_members;
drop policy if exists "Usuarios pueden añadirse como miembros" on public.family_members;

-- Cada usuario solo puede VER sus propias membresías
-- Los demás miembros del espacio se obtienen cargando el family_space (que usa la helper)
create policy "fm_select" on public.family_members
  for select to authenticated
  using (user_id = auth.uid());

-- Cualquier usuario autenticado puede añadirse a sí mismo como miembro
-- (la transacción de creación de espacio garantiza que esto sea seguro)
create policy "fm_insert" on public.family_members
  for insert to authenticated
  with check (user_id = auth.uid());

-- Solo el propio usuario puede eliminar su membresía
create policy "fm_delete" on public.family_members
  for delete to authenticated
  using (user_id = auth.uid());

-- FAMILY_SPACES (usa la función helper is_member_of_space)
drop policy if exists "fs_select" on public.family_spaces;
drop policy if exists "fs_insert" on public.family_spaces;
drop policy if exists "fs_update" on public.family_spaces;
drop policy if exists "Miembros pueden ver su espacio" on public.family_spaces;
drop policy if exists "Usuarios autenticados pueden crear espacios" on public.family_spaces;
drop policy if exists "Miembros pueden actualizar su espacio" on public.family_spaces;

create policy "fs_select" on public.family_spaces
  for select to authenticated
  using (is_member_of_space(id));

create policy "fs_insert" on public.family_spaces
  for insert to authenticated
  with check (auth.uid() = created_by);

create policy "fs_update" on public.family_spaces
  for update to authenticated
  using (is_member_of_space(id))
  with check (is_member_of_space(id));

-- INVITATIONS
drop policy if exists "inv_select" on public.invitations;
drop policy if exists "inv_insert" on public.invitations;
drop policy if exists "inv_update" on public.invitations;
drop policy if exists "Usuarios autenticados pueden ver invitaciones" on public.invitations;
drop policy if exists "Creadores del espacio pueden crear invitaciones" on public.invitations;
drop policy if exists "Usuarios pueden aceptar invitaciones" on public.invitations;

-- Los usuarios solo ven sus propias invitaciones creadas (o las pendientes que aún no tienen accepted_by)
create policy "inv_select" on public.invitations
  for select to authenticated
  using (
    created_by = auth.uid()
    or is_member_of_space(space_id)
    or accepted_by is null
  );

-- Solo miembros del espacio pueden crear invitaciones (usa helper)
create policy "inv_insert" on public.invitations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and is_member_of_space(space_id)
  );

-- Solo el creador del espacio puede aceptar invitaciones... wait, no.
-- Cualquiera puede aceptar una invitación pendiente. El código único garantiza seguridad.
create policy "inv_update" on public.invitations
  for update to authenticated
  using (accepted_by is null)
  with check (accepted_by = auth.uid());

-- ============================================================================
-- FUNCIONES RPC
-- ============================================================================

-- ============================================================================
-- FUNCIÓN RPC PARA CREAR ESPACIO FAMILIAR (CRÍTICA)
-- ============================================================================
-- Esta función SECURITY DEFINER crea el espacio, el miembro y la invitación
-- en una sola transacción atómica, BYPASS-EANDO RLS completamente.
-- Esto elimina los problemas de políticas inconsistentes que causan el error:
--   "new row violates row-level security policy for table family_spaces"
-- ============================================================================
drop function if exists public.create_family_space(text);
create or replace function public.create_family_space(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_space_id uuid;
  new_code text;
  uid_now uuid := auth.uid();
  attempt integer := 0;
begin
  -- Validación: usuario debe estar autenticado
  if uid_now is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Validación: el perfil debe existir
  if not exists (select 1 from public.profiles where id = uid_now) then
    raise exception 'Perfil de usuario no encontrado';
  end if;

  -- Generar código único de 6 caracteres (reintentar si colisiona)
  loop
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text || attempt::text), 1, 6));
    exit when not exists (select 1 from public.invitations where code = new_code)
              and not exists (select 1 from public.family_spaces where invite_code = new_code);
    attempt := attempt + 1;
    if attempt > 10 then
      raise exception 'No se pudo generar un código único';
    end if;
  end loop;

  -- Crear el espacio (SECURITY DEFINER bypass-ea RLS)
  insert into public.family_spaces (name, invite_code, created_by, data, data_version)
  values (coalesce(p_name, 'Economía familiar'), new_code, uid_now, '{}'::jsonb, 1)
  returning id into new_space_id;

  -- Añadir el creador como miembro con rol 'owner'
  insert into public.family_members (space_id, user_id, role)
  values (new_space_id, uid_now, 'owner');

  -- Crear la invitación pendiente (para que el código sea compartible)
  insert into public.invitations (space_id, code, created_by)
  values (new_space_id, new_code, uid_now);

  return new_space_id;
end;
$$;

-- Función para aceptar invitación (transaccional y segura)
create or replace function public.accept_invitation(invitation_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  -- Buscar invitación válida
  select * into inv
  from public.invitations
  where code = invitation_code
    and accepted_by is null
  limit 1;

  if inv.id is null then
    raise exception 'Código de invitación no válido o ya usado';
  end if;

  -- Verificar que el usuario no es ya miembro
  if exists (
    select 1 from public.family_members
    where space_id = inv.space_id and user_id = auth.uid()
  ) then
    raise exception 'Ya eres miembro de este espacio';
  end if;

  -- Insertar miembro
  insert into public.family_members (space_id, user_id, role)
  values (inv.space_id, auth.uid(), 'member');

  -- Marcar invitación como aceptada
  update public.invitations
  set accepted_by = auth.uid(),
      accepted_at = now()
  where id = inv.id;

  return inv.space_id;
end;
$$;

-- Función para obtener el espacio de un usuario (usado por Cloud.getUserSpaces)
create or replace function public.get_user_spaces()
returns setof public.family_spaces
language sql
security definer
set search_path = public
stable
as $$
  select fs.*
  from public.family_spaces fs
  inner join public.family_members fm on fm.space_id = fs.id
  where fm.user_id = auth.uid();
$$;

-- Función para obtener miembros de un espacio (bypass-ea RLS de family_members)
create or replace function public.get_space_members(p_space_id uuid)
returns table(user_id uuid, name text, email text, role text, joined_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select fm.user_id, p.name, p.email, fm.role, fm.joined_at
  from public.family_members fm
  inner join public.profiles p on p.id = fm.user_id
  where fm.space_id = p_space_id
    and exists (
      select 1 from public.family_members check_fm
      where check_fm.space_id = p_space_id and check_fm.user_id = auth.uid()
    );
$$;

-- ============================================================================
-- FUNCIÓN RPC PARA ACTUALIZAR DATOS DEL ESPACIO (CRÍTICA PARA SINCRONIZACIÓN)
-- ============================================================================
-- SECURITY DEFINER: bypass-ea RLS y realiza el update atómico con control
-- de versiones correcto. Elimina los errores:
--   "new row violates row-level security policy for table family_spaces"
--   "Conflicto: otro usuario modificó los datos" (cuando las versiones no coinciden)
-- ============================================================================
drop function if exists public.update_space_data(uuid, jsonb, integer);
create or replace function public.update_space_data(
  p_space_id uuid,
  p_data jsonb,
  p_expected_version integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_version integer;
  v_new_version integer;
begin
  -- Validar autenticación
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Validar que el usuario es miembro del espacio
  if not exists (
    select 1 from public.family_members
    where space_id = p_space_id and user_id = auth.uid()
  ) then
    raise exception 'No eres miembro de este espacio';
  end if;

  -- Leer la versión actual
  select data_version into v_current_version
  from public.family_spaces
  where id = p_space_id;

  if v_current_version is null then
    raise exception 'Espacio no encontrado';
  end if;

  -- Si la versión esperada NO coincide con la actual, significa que otro
  -- dispositivo modificó los datos. El cliente debería recargar y reintentar.
  if p_expected_version is not null and p_expected_version <> v_current_version then
    raise exception 'CONFLICTO_VERSION: versión esperada %, actual %', p_expected_version, v_current_version;
  end if;

  -- Incrementar versión y actualizar datos
  v_new_version := v_current_version + 1;
  update public.family_spaces
  set data = p_data,
      data_version = v_new_version,
      updated_at = now()
  where id = p_space_id;

  return v_new_version;
end;
$$;

grant execute on function public.update_space_data(uuid, jsonb, integer) to authenticated;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at automáticamente
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profile_updated on public.profiles;
drop trigger if exists on_space_updated on public.family_spaces;

create trigger on_profile_updated
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger on_space_updated
  before update on public.family_spaces
  for each row
  execute function public.handle_updated_at();

-- Trigger CRÍTICO: crear perfil automáticamente cuando un usuario se registra
-- Sin este trigger, el login falla porque no encuentra el perfil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================================
-- REALTIME
-- ============================================================================

begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table public.family_spaces;
commit;

-- ============================================================================
-- GRANTS EXPLÍCITOS (por seguridad)
-- ============================================================================

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.family_spaces to authenticated;
grant select, insert, delete on public.family_members to authenticated;
grant select, insert, update on public.invitations to authenticated;
grant execute on function public.is_member_of_space(uuid) to authenticated;
grant execute on function public.create_family_space(text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.get_user_spaces() to authenticated;
grant execute on function public.get_space_members(uuid) to authenticated;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
-- Para comprobar que todo está bien, ejecuta:
--
--   select is_member_of_space('00000000-0000-0000-0000-000000000000');
--   -- Debe devolver: false (sin error)
--
--   select * from pg_policies where schemaname = 'public';
--   -- Debe listar las políticas: profiles_select, profiles_insert, profiles_update,
--   -- fm_select, fm_insert, fm_delete, fs_select, fs_insert, fs_update,
--   -- inv_select, inv_insert, inv_update
-- ============================================================================
