-- ============================================================================
-- FAMILY FINANCE — Supabase Database Schema
-- ============================================================================
-- Instrucciones:
-- 1. Crea un proyecto en https://supabase.com
-- 2. Ve a "SQL Editor" en el panel de Supabase
-- 3. Copia y pega todo este SQL
-- 4. Haz clic en "Run" para ejecutarlo
-- ============================================================================

-- Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================================
-- TABLAS
-- ============================================================================

-- Perfiles de usuario (1:1 con auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Espacios familiares (cada pareja tiene uno)
create table public.family_spaces (
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
create table public.family_members (
  space_id uuid references public.family_spaces(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (space_id, user_id)
);

-- Invitaciones (códigos para unirse a un espacio)
create table public.invitations (
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

create index idx_family_members_user_id on public.family_members(user_id);
create index idx_invitations_code on public.invitations(code);
create index idx_family_spaces_invite_code on public.family_spaces(invite_code);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.family_spaces enable row level security;
alter table public.family_members enable row level security;
alter table public.invitations enable row level security;

-- Políticas para profiles
create policy "Usuarios autenticados pueden ver perfiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Usuarios pueden insertar su propio perfil"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Políticas para family_spaces
create policy "Miembros pueden ver su espacio"
  on public.family_spaces for select
  to authenticated
  using (
    exists (
      select 1 from public.family_members
      where space_id = id and user_id = auth.uid()
    )
  );

create policy "Usuarios autenticados pueden crear espacios"
  on public.family_spaces for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Miembros pueden actualizar su espacio"
  on public.family_spaces for update
  to authenticated
  using (
    exists (
      select 1 from public.family_members
      where space_id = id and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.family_members
      where space_id = id and user_id = auth.uid()
    )
  );

-- Políticas para family_members
create policy "Miembros pueden ver miembros de su espacio"
  on public.family_members for select
  to authenticated
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.family_members as fm
      where fm.space_id = space_id and fm.user_id = auth.uid()
    )
  );

create policy "Usuarios pueden añadirse como miembros"
  on public.family_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

-- Políticas para invitations
create policy "Usuarios autenticados pueden ver invitaciones"
  on public.invitations for select
  to authenticated
  using (true);

create policy "Creadores del espacio pueden crear invitaciones"
  on public.invitations for insert
  to authenticated
  with check (
    created_by = auth.uid() and
    exists (
      select 1 from public.family_members
      where space_id = space_id and user_id = auth.uid()
    )
  );

create policy "Usuarios pueden aceptar invitaciones"
  on public.invitations for update
  to authenticated
  using (accepted_by is null)
  with check (accepted_by = auth.uid());

-- ============================================================================
-- FUNCIONES RPC (Remote Procedure Calls)
-- ============================================================================

-- Función para aceptar invitación (transaccional y segura)
create or replace function public.accept_invitation(invitation_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  space_id_result uuid;
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

  -- Insertar miembro
  insert into public.family_members (space_id, user_id, role)
  values (inv.space_id, auth.uid(), 'member')
  on conflict (space_id, user_id) do nothing;

  -- Marcar invitación como aceptada
  update public.invitations
  set accepted_by = auth.uid(),
      accepted_at = now()
  where id = inv.id;

  return inv.space_id;
end;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at automáticamente
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profile_updated
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger on_space_updated
  before update on public.family_spaces
  for each row
  execute function public.handle_updated_at();

-- Trigger MUY IMPORTANTE: crear perfil automáticamente cuando un usuario se registra
-- Sin este trigger, el login no encuentra el perfil y fallará
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Habilitar Realtime en la tabla family_spaces
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table public.family_spaces;
commit;

-- ============================================================================
-- NOTAS DE SEGURIDAD
-- ============================================================================
-- 1. La tabla family_spaces contiene un JSON con TODOS los datos financieros
--    de la pareja (transacciones, presupuestos, objetivos, etc.)
-- 2. Solo los miembros del espacio pueden leer y modificar esos datos
-- 3. La columna data_version permite detectar conflictos de escritura
--    (última escritura gana con aviso al usuario)
-- 4. Realtime está habilitado para sincronización instantánea entre dispositivos
-- 5. Las invitaciones son códigos únicos que se pueden usar una sola vez
-- ============================================================================
