begin;

alter table public.apertura_caja
    add column if not exists fondo_siguiente numeric(14, 2);

update public.apertura_caja
   set fondo_siguiente = (regexp_match(
       observacion,
       'Fondo para siguiente turno:\s*S/\s*([0-9]+([.][0-9]+)?)'
   ))[1]::numeric
 where fondo_siguiente is null
   and observacion ~* 'Fondo para siguiente turno:\s*S/\s*[0-9]+([.][0-9]+)?';

do $$
begin
    if exists (
        select 1
          from public.apertura_caja
         where estado::text = '1'
           and situacion::text = 'A'
         group by id_caja
        having count(*) > 1
    ) then
        raise exception 'Hay cajas con más de un turno abierto. Corrige esas aperturas antes de aplicar esta migración.';
    end if;

    if not exists (
        select 1
          from pg_constraint
         where conname = 'apertura_caja_fondo_siguiente_no_negativo'
           and conrelid = 'public.apertura_caja'::regclass
    ) then
        alter table public.apertura_caja
            add constraint apertura_caja_fondo_siguiente_no_negativo
            check (fondo_siguiente is null or fondo_siguiente >= 0);
    end if;
end;
$$;

create unique index if not exists apertura_caja_un_turno_abierto_por_caja
    on public.apertura_caja (id_caja)
    where estado::text = '1' and situacion::text = 'A';

update public.caja c
   set aperturada = case when exists (
       select 1
         from public.apertura_caja a
        where a.id_caja = c.id_caja
          and a.estado::text = '1'
          and a.situacion::text = 'A'
   ) then '1' else '0' end
 where c.estado::text = '1';

create or replace function public.abrir_turno_caja(
    p_id_caja bigint,
    p_id_usuario bigint,
    p_monto_inicial numeric,
    p_turno text,
    p_observacion text default null
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
    v_caja public.caja%rowtype;
    v_anterior public.apertura_caja%rowtype;
    v_apertura public.apertura_caja%rowtype;
    v_saldo_anterior numeric(14, 2);
    v_diferencia numeric(14, 2);
    v_numero bigint;
    v_nota text;
begin
    if p_id_caja is null or p_id_caja < 1
       or p_id_usuario is null or p_id_usuario < 1
       or p_monto_inicial is null or p_monto_inicial < 0
       or p_turno is null
       or p_turno not in ('Mañana', 'Tarde', 'Noche') then
        raise exception 'Los datos de apertura de caja no son válidos.';
    end if;

    if not exists (
        select 1 from public.usuario
         where id_usuario = p_id_usuario and estado::text = '1'
    ) then
        raise exception 'El usuario que abre la caja no existe o está inactivo.';
    end if;

    select * into v_caja
      from public.caja
     where id_caja = p_id_caja and estado::text = '1'
     for update;
    if not found then
        raise exception 'La caja seleccionada no existe o está inactiva.';
    end if;

    if exists (
        select 1 from public.apertura_caja
         where id_caja = p_id_caja
           and estado::text = '1'
           and situacion::text = 'A'
    ) then
        raise exception 'Esta caja ya tiene un turno abierto.';
    end if;

    perform pg_advisory_xact_lock(73510413);
    select coalesce(max(substring(numero_turno from '^[^0-9]*([0-9]+)$')::bigint), 0) + 1
      into v_numero
      from public.apertura_caja
     where numero_turno ~ '^[^0-9]*[0-9]+$';

    select * into v_anterior
      from public.apertura_caja
     where id_caja = p_id_caja
       and estado::text = '1'
       and situacion::text = 'C'
     order by f_cierre desc nulls last, id_aperturacaja desc
     limit 1;

    if found then
        v_saldo_anterior := coalesce(
            v_anterior.fondo_siguiente,
            (regexp_match(
                v_anterior.observacion,
                'Fondo para siguiente turno:\s*S/\s*([0-9]+([.][0-9]+)?)'
            ))[1]::numeric,
            v_anterior.monto_declarado,
            v_anterior.monto_sistema,
            0
        );
        v_diferencia := round(p_monto_inicial - v_saldo_anterior, 2);
    else
        v_saldo_anterior := null;
        v_diferencia := null;
    end if;

    v_nota := concat_ws(
        ' ',
        format('Turno operativo: %s.', p_turno),
        nullif(trim(coalesce(p_observacion, '')), ''),
        case when v_diferencia is null then null
             else format(
                 'Fondo anterior reportado: S/ %s. Diferencia de apertura: S/ %s.',
                 to_char(v_saldo_anterior, 'FM999999999990.00'),
                 to_char(v_diferencia, 'FM999999999990.00')
             )
        end
    );

    insert into public.apertura_caja (
        id_caja,
        id_usuario,
        numero_turno,
        f_apertura,
        f_cierre,
        monto_inicial,
        total_ingresos,
        total_egresos,
        monto_sistema,
        monto_declarado,
        diferencia,
        situacion,
        observacion,
        fondo_siguiente,
        usucre,
        pccre,
        feccre,
        estado
    ) values (
        p_id_caja,
        p_id_usuario,
        'T' || lpad(v_numero::text, 4, '0'),
        clock_timestamp(),
        null,
        round(p_monto_inicial, 2),
        0,
        0,
        round(p_monto_inicial, 2),
        0,
        0,
        'A',
        coalesce(nullif(v_nota, ''), 'Apertura de caja desde el módulo de pagos'),
        null,
        'WEB',
        'PC-WEB',
        clock_timestamp(),
        '1'
    )
    returning * into v_apertura;

    update public.caja
       set aperturada = '1',
           usumod = 'WEB',
           pcmod = 'PC-WEB',
           fecmod = clock_timestamp()
     where id_caja = p_id_caja;

    return to_jsonb(v_apertura)
        || jsonb_build_object(
            'turno_nombre', p_turno,
            'saldo_anterior', v_saldo_anterior
        );
end;
$$;

create or replace function public.cerrar_turno_caja(
    p_id_aperturacaja bigint,
    p_id_usuario bigint,
    p_monto_declarado numeric,
    p_conteo_metodos jsonb,
    p_fondo_siguiente numeric,
    p_observacion text default null
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
    v_apertura public.apertura_caja%rowtype;
    v_caja public.caja%rowtype;
    v_metodo record;
    v_metodo_efectivo_id text;
    v_es_efectivo boolean;
    v_esperado numeric(14, 2);
    v_contado numeric(14, 2);
    v_esperado_cliente numeric(14, 2);
    v_contado_text text;
    v_esperado_text text;
    v_clave text;
    v_nombre text;
    v_ingresos numeric(14, 2);
    v_egresos numeric(14, 2);
    v_sistema numeric(14, 2);
    v_declarado numeric(14, 2);
    v_fondo_siguiente numeric(14, 2);
    v_arqueo jsonb := '[]'::jsonb;
    v_cantidad_esperada integer := 0;
    v_cantidad_recibida integer;
    v_detalle text := '';
    v_observacion text;
    v_cerrada public.apertura_caja%rowtype;
begin
    if p_id_aperturacaja is null or p_id_aperturacaja < 1
       or p_id_usuario is null or p_id_usuario < 1
       or p_monto_declarado is null or p_monto_declarado < 0
       or p_fondo_siguiente is null or p_fondo_siguiente < 0
       or jsonb_typeof(p_conteo_metodos) <> 'array' then
        raise exception 'Los datos de cierre de caja no son válidos.';
    end if;

    if not exists (
        select 1 from public.usuario
         where id_usuario = p_id_usuario and estado::text = '1'
    ) then
        raise exception 'El usuario que cierra la caja no existe o está inactivo.';
    end if;

    select * into v_apertura
      from public.apertura_caja
     where id_aperturacaja = p_id_aperturacaja
       and estado::text = '1'
     for update;
    if not found then
        raise exception 'La apertura de caja no existe o está inactiva.';
    end if;
    if coalesce(v_apertura.situacion::text, '') <> 'A' then
        raise exception 'Esta caja ya está cerrada.';
    end if;

    select * into v_caja
      from public.caja
     where id_caja = v_apertura.id_caja
     for update;
    if not found then
        raise exception 'No se encontró la caja asociada al turno.';
    end if;

    if exists (
        select 1
          from public.movimiento_caja m
          left join public.tipo_movimiento_caja t
            on t.id_tipomovimiento = m.id_tipomovimiento
         where m.id_aperturacaja = p_id_aperturacaja
           and m.estado::text = '1'
           and (
               coalesce(t.signo, '') not in ('+', '-')
               or m.monto is null
               or m.monto < 0
           )
    ) then
        raise exception 'No se puede cuadrar la caja: hay un movimiento con tipo o monto inválido.';
    end if;

    select
        round(coalesce(sum(case when t.signo = '+' then m.monto else 0 end), 0), 2),
        round(coalesce(sum(case when t.signo = '-' then m.monto else 0 end), 0), 2)
      into v_ingresos, v_egresos
      from public.movimiento_caja m
      join public.tipo_movimiento_caja t
        on t.id_tipomovimiento = m.id_tipomovimiento
     where m.id_aperturacaja = p_id_aperturacaja
       and m.estado::text = '1'
       and m.afecta_efectivo::text = 'S';

    v_sistema := round(v_apertura.monto_inicial + v_ingresos - v_egresos, 2);
    select id_metodopago::text
      into v_metodo_efectivo_id
      from public.metodo_pago
     where estado::text = '1'
       and n_metodopago ilike '%efectivo%'
     order by n_metodopago
     limit 1;

    select count(*), count(distinct elemento->>'clave')
      into v_cantidad_recibida, v_cantidad_esperada
      from jsonb_array_elements(p_conteo_metodos) elemento;
    if v_cantidad_recibida = 0 or v_cantidad_recibida <> v_cantidad_esperada then
        raise exception 'El arqueo debe incluir una sola vez cada método de pago.';
    end if;
    v_cantidad_esperada := 0;

    for v_metodo in
        select id_metodopago, n_metodopago
          from public.metodo_pago
         where estado::text = '1'
         order by n_metodopago
    loop
        v_clave := v_metodo.id_metodopago::text;
        v_nombre := v_metodo.n_metodopago;
        v_es_efectivo := coalesce(v_nombre, '') ilike '%efectivo%';

        select round(coalesce(sum(
            case when t.signo = '-' then -m.monto else m.monto end
        ), 0), 2)
          into v_esperado
          from public.movimiento_caja m
          join public.tipo_movimiento_caja t
            on t.id_tipomovimiento = m.id_tipomovimiento
          left join public.concepto_caja c
            on c.id_concepto = m.id_concepto
         where m.id_aperturacaja = p_id_aperturacaja
           and m.estado::text = '1'
           and m.id_metodopago = v_metodo.id_metodopago
           and not concat_ws(' ', v_nombre, c.n_concepto, c.descripcion)
               ~* '(cr[eé]dito|cortes[ií]a|cuenta por cobrar)'
           and (not v_es_efectivo or m.afecta_efectivo::text = 'S');

        if v_es_efectivo and v_metodo_efectivo_id = v_clave then
            v_esperado := round(v_esperado + v_apertura.monto_inicial, 2);
        end if;

        select elemento->>'contado', elemento->>'esperado'
          into v_contado_text, v_esperado_text
          from jsonb_array_elements(p_conteo_metodos) elemento
         where elemento->>'clave' = v_clave;
        if not found or v_contado_text !~ '^[0-9]+([.][0-9]+)?$'
           or v_esperado_text !~ '^-?[0-9]+([.][0-9]+)?$' then
            raise exception 'El conteo de % no es válido. Actualiza el arqueo.', v_nombre;
        end if;
        v_contado := round(v_contado_text::numeric, 2);
        v_esperado_cliente := round(v_esperado_text::numeric, 2);
        if abs(v_esperado_cliente - v_esperado) >= 0.01 then
            raise exception 'Los movimientos cambiaron durante el arqueo. Actualiza el arqueo antes de cerrar.';
        end if;
        if v_es_efectivo and v_metodo_efectivo_id = v_clave then
            v_declarado := v_contado;
        end if;

        v_arqueo := v_arqueo || jsonb_build_array(jsonb_build_object(
            'id_metodopago', v_metodo.id_metodopago,
            'clave', v_clave,
            'metodo', v_nombre,
            'esperado', v_esperado,
            'contado', v_contado
        ));
        v_cantidad_esperada := v_cantidad_esperada + 1;
        v_detalle := concat_ws(
            ' | ',
            nullif(v_detalle, ''),
            format('%s: esperado S/ %s, contado S/ %s',
                v_nombre,
                to_char(v_esperado, 'FM999999999990.00'),
                to_char(v_contado, 'FM999999999990.00'))
        );
    end loop;

    if v_metodo_efectivo_id is null then
        v_clave := 'efectivo';
        v_nombre := 'Efectivo';
        v_esperado := round(v_apertura.monto_inicial, 2);
        select elemento->>'contado', elemento->>'esperado'
          into v_contado_text, v_esperado_text
          from jsonb_array_elements(p_conteo_metodos) elemento
         where elemento->>'clave' = v_clave;
        if not found or v_contado_text !~ '^[0-9]+([.][0-9]+)?$'
           or v_esperado_text !~ '^-?[0-9]+([.][0-9]+)?$' then
            raise exception 'El conteo de efectivo no es válido. Actualiza el arqueo.';
        end if;
        v_contado := round(v_contado_text::numeric, 2);
        if abs(round(v_esperado_text::numeric, 2) - v_esperado) >= 0.01 then
            raise exception 'Los movimientos cambiaron durante el arqueo. Actualiza el arqueo antes de cerrar.';
        end if;
        v_declarado := v_contado;
        v_arqueo := v_arqueo || jsonb_build_array(jsonb_build_object(
            'id_metodopago', null,
            'clave', v_clave,
            'metodo', v_nombre,
            'esperado', v_esperado,
            'contado', v_contado
        ));
        v_cantidad_esperada := v_cantidad_esperada + 1;
        v_detalle := concat_ws(
            ' | ',
            nullif(v_detalle, ''),
            format('Efectivo: esperado S/ %s, contado S/ %s',
                to_char(v_esperado, 'FM999999999990.00'),
                to_char(v_contado, 'FM999999999990.00'))
        );
    end if;

    for v_metodo in
        select
            'sin-metodo' as clave,
            round(sum(case when t.signo = '-' then -m.monto else m.monto end), 2) as esperado
          from public.movimiento_caja m
          join public.tipo_movimiento_caja t
            on t.id_tipomovimiento = m.id_tipomovimiento
          left join public.concepto_caja c
            on c.id_concepto = m.id_concepto
         where m.id_aperturacaja = p_id_aperturacaja
           and m.estado::text = '1'
           and not concat_ws(' ', c.n_concepto, c.descripcion)
               ~* '(cr[eé]dito|cortes[ií]a|cuenta por cobrar)'
           and not exists (
               select 1 from public.metodo_pago mp
                where mp.id_metodopago = m.id_metodopago
                  and mp.estado::text = '1'
           )
        having count(*) > 0
    loop
        select elemento->>'contado', elemento->>'esperado'
          into v_contado_text, v_esperado_text
          from jsonb_array_elements(p_conteo_metodos) elemento
         where elemento->>'clave' = v_metodo.clave;
        if not found or v_contado_text !~ '^[0-9]+([.][0-9]+)?$'
           or v_esperado_text !~ '^-?[0-9]+([.][0-9]+)?$' then
            raise exception 'El conteo del método % no es válido. Actualiza el arqueo.', v_metodo.clave;
        end if;
        v_contado := round(v_contado_text::numeric, 2);
        v_esperado := round(v_metodo.esperado, 2);
        if abs(round(v_esperado_text::numeric, 2) - v_esperado) >= 0.01 then
            raise exception 'Los movimientos cambiaron durante el arqueo. Actualiza el arqueo antes de cerrar.';
        end if;
        v_nombre := 'Método no identificado';
        v_arqueo := v_arqueo || jsonb_build_array(jsonb_build_object(
            'id_metodopago', null,
            'clave', v_metodo.clave,
            'metodo', v_nombre,
            'esperado', v_esperado,
            'contado', v_contado
        ));
        v_cantidad_esperada := v_cantidad_esperada + 1;
        v_detalle := concat_ws(
            ' | ',
            nullif(v_detalle, ''),
            format('%s: esperado S/ %s, contado S/ %s',
                v_nombre,
                to_char(v_esperado, 'FM999999999990.00'),
                to_char(v_contado, 'FM999999999990.00'))
        );
    end loop;

    if jsonb_array_length(p_conteo_metodos) <> v_cantidad_esperada then
        raise exception 'El arqueo no coincide con los métodos de pago disponibles. Actualiza el arqueo.';
    end if;
    if v_declarado is null or round(p_monto_declarado, 2) <> v_declarado then
        raise exception 'El efectivo declarado debe coincidir con el efectivo contado.';
    end if;
    if p_fondo_siguiente > v_declarado then
        raise exception 'El fondo para el siguiente turno no puede superar el efectivo contado.';
    end if;

    v_fondo_siguiente := round(p_fondo_siguiente, 2);
    v_observacion := concat_ws(
        ' — ',
        nullif(v_apertura.observacion, ''),
        coalesce(nullif(trim(coalesce(p_observacion, '')), ''), 'Cierre de caja'),
        v_detalle,
        format('Fondo para siguiente turno: S/ %s.', to_char(v_fondo_siguiente, 'FM999999999990.00')),
        format('Retiro a caja fuerte: S/ %s.', to_char(v_declarado - v_fondo_siguiente, 'FM999999999990.00'))
    );

    update public.apertura_caja
       set id_usuariocierre = p_id_usuario,
           f_cierre = clock_timestamp(),
           total_ingresos = v_ingresos,
           total_egresos = v_egresos,
           monto_sistema = v_sistema,
           monto_declarado = v_declarado,
           diferencia = round(v_declarado - v_sistema, 2),
           fondo_siguiente = v_fondo_siguiente,
           situacion = 'C',
           observacion = v_observacion,
           usumod = 'WEB',
           pcmod = 'PC-WEB',
           fecmod = clock_timestamp()
     where id_aperturacaja = p_id_aperturacaja
    returning * into v_cerrada;

    update public.caja
       set aperturada = '0',
           usumod = 'WEB',
           pcmod = 'PC-WEB',
           fecmod = clock_timestamp()
     where id_caja = v_apertura.id_caja;

    return to_jsonb(v_cerrada)
        || jsonb_build_object(
            'arqueo', v_arqueo,
            'fondo_siguiente', v_fondo_siguiente
        );
end;
$$;

create or replace function public.registrar_pago_caja(
    p_id_aperturacaja bigint,
    p_id_usuario bigint,
    p_id_recepcion bigint,
    p_id_metodopago bigint,
    p_id_concepto bigint,
    p_id_tipomovimiento bigint,
    p_monto numeric,
    p_documento text default null,
    p_descripcion text default null
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
    v_apertura public.apertura_caja%rowtype;
    v_concepto public.concepto_caja%rowtype;
    v_tipo public.tipo_movimiento_caja%rowtype;
    v_recepcion public.recepcion%rowtype;
    v_movimiento public.movimiento_caja%rowtype;
    v_monto numeric(14, 2);
    v_ingresos numeric(14, 2);
    v_egresos numeric(14, 2);
    v_saldo_anterior numeric(14, 2);
    v_saldo_pendiente numeric(14, 2);
    v_total_pagado numeric(14, 2);
    v_numero bigint;
begin
    if p_id_aperturacaja is null or p_id_aperturacaja < 1
       or p_id_usuario is null or p_id_usuario < 1
       or p_id_metodopago is null or p_id_metodopago < 1
       or p_id_concepto is null or p_id_concepto < 1
       or p_id_tipomovimiento is null or p_id_tipomovimiento < 1
       or p_monto is null or p_monto <= 0 then
        raise exception 'Selecciona una caja, concepto, tipo de movimiento y método de pago válidos, con un importe mayor a cero.';
    end if;
    v_monto := round(p_monto, 2);
    if v_monto <= 0 then
        raise exception 'El monto del pago debe ser mayor a un céntimo.';
    end if;

    if not exists (
        select 1 from public.usuario
         where id_usuario = p_id_usuario and estado::text = '1'
    ) then
        raise exception 'El usuario que registra el movimiento no existe o está inactivo.';
    end if;

    select * into v_apertura
      from public.apertura_caja
     where id_aperturacaja = p_id_aperturacaja
       and estado::text = '1'
     for update;
    if not found or coalesce(v_apertura.situacion::text, '') <> 'A' then
        raise exception 'La caja seleccionada no está abierta.';
    end if;

    select * into v_concepto
      from public.concepto_caja
     where id_concepto = p_id_concepto and estado::text = '1';
    if not found then
        raise exception 'El concepto de caja no existe o está inactivo.';
    end if;
    select * into v_tipo
      from public.tipo_movimiento_caja
     where id_tipomovimiento = p_id_tipomovimiento
       and estado::text = '1';
    if not found or v_concepto.id_tipomovimiento <> p_id_tipomovimiento
       or v_tipo.signo::text not in ('+', '-') then
        raise exception 'El tipo de movimiento no corresponde al concepto seleccionado.';
    end if;
    if v_concepto.afecta_efectivo::text not in ('S', 'N') then
        raise exception 'El concepto no indica si el movimiento afecta al efectivo.';
    end if;
    if not exists (
        select 1 from public.metodo_pago
         where id_metodopago = p_id_metodopago
           and estado::text = '1'
    ) then
        raise exception 'El método de pago no existe o está inactivo.';
    end if;

    if p_id_recepcion is not null then
        if v_tipo.signo::text <> '+' then
            raise exception 'Un egreso no se puede registrar como pago de una recepción.';
        end if;
        select * into v_recepcion
          from public.recepcion
         where id_recepcion = p_id_recepcion
           and estado::text = '1'
         for update;
        if not found then
            raise exception 'La recepción seleccionada no existe o está inactiva.';
        end if;
        v_saldo_anterior := greatest(
            0,
            round(coalesce(
                v_recepcion.totaldeuda,
                coalesce(v_recepcion.d_inicial, 0)
                    + coalesce(v_recepcion.d_asistente, 0)
                    - coalesce(v_recepcion.t_pagado, 0)
            ), 0)
        );
        if v_saldo_anterior <= 0 then
            raise exception 'La recepción seleccionada no tiene saldo pendiente.';
        end if;
        if v_monto > v_saldo_anterior then
            raise exception 'El pago supera el saldo pendiente de S/ %.',
                to_char(v_saldo_anterior, 'FM999999999990.00');
        end if;
        v_total_pagado := round(coalesce(v_recepcion.t_pagado, 0) + v_monto, 2);
        v_saldo_pendiente := greatest(0, round(v_saldo_anterior - v_monto, 2));
    end if;

    perform pg_advisory_xact_lock(73510414);
    select coalesce(max(substring(upper(numero_operacion) from '^OP-?([0-9]+)$')::bigint), 0) + 1
      into v_numero
      from public.movimiento_caja
     where numero_operacion is not null
       and upper(numero_operacion) ~ '^OP-?[0-9]+$';

    insert into public.movimiento_caja (
        id_aperturacaja,
        id_tipomovimiento,
        id_concepto,
        id_metodopago,
        id_usuario,
        id_recepcion,
        id_venta,
        numero_operacion,
        documento,
        descripcion,
        monto,
        afecta_efectivo,
        f_movimiento,
        ip,
        terminal,
        usucre,
        pccre,
        feccre,
        estado
    ) values (
        p_id_aperturacaja,
        p_id_tipomovimiento,
        p_id_concepto,
        p_id_metodopago,
        p_id_usuario,
        p_id_recepcion,
        null,
        'OP-' || lpad(v_numero::text, 6, '0'),
        nullif(trim(coalesce(p_documento, '')), ''),
        coalesce(nullif(trim(coalesce(p_descripcion, '')), ''), v_concepto.n_concepto, 'Pago registrado'),
        v_monto,
        v_concepto.afecta_efectivo,
        clock_timestamp(),
        '127.0.0.1',
        'WEB',
        'WEB',
        'PC-WEB',
        clock_timestamp(),
        '1'
    )
    returning * into v_movimiento;

    if v_concepto.afecta_efectivo::text = 'S' then
        v_ingresos := coalesce(v_apertura.total_ingresos, 0);
        v_egresos := coalesce(v_apertura.total_egresos, 0);
        if v_tipo.signo::text = '+' then
            v_ingresos := round(v_ingresos + v_monto, 2);
        else
            v_egresos := round(v_egresos + v_monto, 2);
        end if;
        update public.apertura_caja
           set total_ingresos = v_ingresos,
               total_egresos = v_egresos,
               monto_sistema = round(v_apertura.monto_inicial + v_ingresos - v_egresos, 2),
               usumod = 'WEB',
               pcmod = 'PC-WEB',
               fecmod = clock_timestamp()
         where id_aperturacaja = p_id_aperturacaja;
    end if;

    if p_id_recepcion is not null then
        update public.recepcion
           set t_pagado = v_total_pagado,
               totaldeuda = v_saldo_pendiente,
               usumod = 'WEB',
               pcmod = 'PC-WEB',
               fecmod = clock_timestamp()
         where id_recepcion = p_id_recepcion;
    end if;

    return to_jsonb(v_movimiento)
        || jsonb_build_object(
            'saldo_anterior', v_saldo_anterior,
            'saldo_pendiente', v_saldo_pendiente,
            'total_pagado', v_total_pagado
        );
end;
$$;

revoke all on function public.abrir_turno_caja(bigint, bigint, numeric, text, text) from public;
revoke all on function public.cerrar_turno_caja(bigint, bigint, numeric, jsonb, numeric, text) from public;
revoke all on function public.registrar_pago_caja(bigint, bigint, bigint, bigint, bigint, bigint, numeric, text, text) from public;
grant execute on function public.abrir_turno_caja(bigint, bigint, numeric, text, text) to anon, authenticated;
grant execute on function public.cerrar_turno_caja(bigint, bigint, numeric, jsonb, numeric, text) to anon, authenticated;
grant execute on function public.registrar_pago_caja(bigint, bigint, bigint, bigint, bigint, bigint, numeric, text, text) to anon, authenticated;

commit;
