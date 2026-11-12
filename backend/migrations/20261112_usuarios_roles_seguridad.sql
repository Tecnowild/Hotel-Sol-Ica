-- Run this script manually in the Supabase SQL Editor after reviewing it.
-- It is intentionally not executed by the application.
begin;

do $$
begin
    if to_regclass('public.usuario') is null
       or to_regclass('public.usuario_rol') is null
       or to_regclass('public.rol') is null then
        raise exception 'Se requieren las tablas public.usuario, public.usuario_rol y public.rol.';
    end if;

    if exists (
        select 1
        from public.usuario_rol
        where estado::text = '1' and vigente::text = '1'
        group by id_usuario
        having count(*) > 1
    ) then
        raise exception 'Hay usuarios con más de un rol vigente. Corrige esas asignaciones antes de aplicar esta migración.';
    end if;
end;
$$;

do $$
declare
    tipo_id_usuario text;
begin
    select format_type(atttypid, atttypmod)
      into tipo_id_usuario
      from pg_attribute
     where attrelid = 'public.usuario'::regclass
       and attname = 'id_usuario'
       and not attisdropped;

    execute format(
        'create table if not exists public.usuario_credencial (
            id_usuario %s primary key references public.usuario(id_usuario) on delete cascade,
            clave_hash text not null
        )',
        tipo_id_usuario
    );
end;
$$;

alter table public.usuario_credencial enable row level security;
revoke all on table public.usuario_credencial from anon, authenticated;
grant select, insert, update, delete on table public.usuario_credencial to service_role;

create unique index if not exists usuario_rol_un_rol_vigente_por_usuario
    on public.usuario_rol (id_usuario)
    where estado::text = '1' and vigente::text = '1';

create or replace function public.validar_limites_roles_usuario()
returns trigger
language plpgsql
as $$
declare
    id_rol_admin public.rol.id_rol%type;
    administradores integer;
    rol_anterior_es_admin boolean := false;
begin
    perform pg_advisory_xact_lock(73510412);

    select id_rol
      into id_rol_admin
      from public.rol
     where upper(trim(n_rol)) = 'ADMINISTRADOR'
       and estado::text = '1'
     limit 1;

    if tg_op = 'UPDATE' then
        rol_anterior_es_admin :=
            old.estado::text = '1'
            and old.vigente::text = '1'
            and old.id_rol = id_rol_admin;
    elsif tg_op = 'DELETE' then
        rol_anterior_es_admin :=
            old.estado::text = '1'
            and old.vigente::text = '1'
            and old.id_rol = id_rol_admin;
    end if;

    if tg_op = 'DELETE' then
        if rol_anterior_es_admin then
            select count(distinct ur.id_usuario)
              into administradores
              from public.usuario_rol ur
              join public.usuario u on u.id_usuario = ur.id_usuario
             where ur.estado::text = '1'
               and ur.vigente::text = '1'
               and ur.id_rol = id_rol_admin
               and u.estado::text = '1'
               and ur.id_usuario <> old.id_usuario;

            if administradores = 0 then
                raise exception 'No se puede quitar el último administrador activo.';
            end if;
        end if;
        return old;
    end if;

    if new.estado::text = '1' and new.vigente::text = '1' then
        if exists (
            select 1
              from public.usuario_rol ur
             where ur.id_usuario = new.id_usuario
               and ur.estado::text = '1'
               and ur.vigente::text = '1'
               and ur.id_usuariorol is distinct from new.id_usuariorol
        ) then
            raise exception 'Cada usuario puede tener un solo rol vigente.';
        end if;

        if new.id_rol = id_rol_admin then
            select count(distinct ur.id_usuario)
              into administradores
              from public.usuario_rol ur
              join public.usuario u on u.id_usuario = ur.id_usuario
             where ur.estado::text = '1'
               and ur.vigente::text = '1'
               and ur.id_rol = id_rol_admin
               and u.estado::text = '1'
               and ur.id_usuario <> new.id_usuario;

            if administradores >= 3 then
                raise exception 'No se permiten más de 3 administradores activos.';
            end if;
        end if;
    end if;

    if rol_anterior_es_admin and (
        new.estado::text <> '1'
        or new.vigente::text <> '1'
        or new.id_rol <> id_rol_admin
    ) then
        select count(distinct ur.id_usuario)
          into administradores
          from public.usuario_rol ur
          join public.usuario u on u.id_usuario = ur.id_usuario
         where ur.estado::text = '1'
           and ur.vigente::text = '1'
           and ur.id_rol = id_rol_admin
           and u.estado::text = '1'
           and ur.id_usuario <> old.id_usuario;

        if administradores = 0 then
            raise exception 'No se puede quitar el último administrador activo.';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists usuario_rol_limites_roles on public.usuario_rol;
create trigger usuario_rol_limites_roles
before insert or update or delete on public.usuario_rol
for each row execute function public.validar_limites_roles_usuario();

create or replace function public.proteger_ultimo_administrador()
returns trigger
language plpgsql
as $$
declare
    id_rol_admin public.rol.id_rol%type;
    asignacion_admin boolean;
    administradores integer;
begin
    if old.estado::text <> '1' and new.estado::text = '1' then
        perform pg_advisory_xact_lock(73510412);

        select id_rol
          into id_rol_admin
          from public.rol
         where upper(trim(n_rol)) = 'ADMINISTRADOR'
           and estado::text = '1'
         limit 1;

        select exists (
            select 1
              from public.usuario_rol ur
             where ur.id_usuario = new.id_usuario
               and ur.id_rol = id_rol_admin
               and ur.estado::text = '1'
               and ur.vigente::text = '1'
        ) into asignacion_admin;

        if asignacion_admin then
            select count(distinct ur.id_usuario)
              into administradores
              from public.usuario_rol ur
              join public.usuario u on u.id_usuario = ur.id_usuario
             where ur.estado::text = '1'
               and ur.vigente::text = '1'
               and ur.id_rol = id_rol_admin
               and u.estado::text = '1'
               and ur.id_usuario <> new.id_usuario;

            if administradores >= 3 then
                raise exception 'No se permiten más de 3 administradores activos.';
            end if;
        end if;

        return new;
    end if;

    if old.estado::text <> '1' or new.estado::text = '1' then
        return new;
    end if;

    perform pg_advisory_xact_lock(73510412);

    select id_rol
      into id_rol_admin
      from public.rol
     where upper(trim(n_rol)) = 'ADMINISTRADOR'
       and estado::text = '1'
     limit 1;

    select exists (
        select 1
          from public.usuario_rol ur
         where ur.id_usuario = old.id_usuario
           and ur.id_rol = id_rol_admin
           and ur.estado::text = '1'
           and ur.vigente::text = '1'
    ) into asignacion_admin;

    if not asignacion_admin then
        return new;
    end if;

    select count(distinct ur.id_usuario)
      into administradores
      from public.usuario_rol ur
      join public.usuario u on u.id_usuario = ur.id_usuario
     where ur.estado::text = '1'
       and ur.vigente::text = '1'
       and ur.id_rol = id_rol_admin
       and u.estado::text = '1'
       and ur.id_usuario <> old.id_usuario;

    if administradores = 0 then
        raise exception 'No se puede dar de baja al último administrador activo.';
    end if;

    return new;
end;
$$;

drop trigger if exists usuario_proteger_ultimo_administrador on public.usuario;
create trigger usuario_proteger_ultimo_administrador
before update of estado on public.usuario
for each row execute function public.proteger_ultimo_administrador();

commit;
