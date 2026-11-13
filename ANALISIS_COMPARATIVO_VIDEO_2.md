# Análisis comparativo — Video 2: “Sistema de Hotel en ASP.NET MVC 5”

**Video de referencia:** “Sistema de Hotel en ASP.NET MVC 5”  
**Sistema analizado:** Hotel Sol Ica (`C:\Users\uriel\Desktop\Hotel-Sol-Ica`)  
**Fecha:** 13/11/2026  
**Complementa:** `ANALISIS_COMPARATIVO_HOTEL.md` (análisis del primer video)

---

## 1. Resumen ejecutivo

El sistema actual **cubre bien el back office**: caja por turnos, arqueo, consumos a la cuenta, pre-cuenta, reportería, auditoría y roles. Frente al segundo video, la brecha principal **no es la falta de módulos, sino la diferencia de criterio operativo** en cuatro puntos:

1. **El check-out libera la habitación a `DISPONIBLE`**, cuando el video la deja en **“En limpieza”** y bloqueada hasta que mantenimiento la libere.
2. **Todo consumo se registra como crédito**: no existe la opción “Cancelado” (pagado en el acto) frente a “Pendiente”. El check-out suma todo, no solo lo pendiente.
3. **No hay cargos por penalidad** (daños, vencimiento de plazo) dentro del cierre de la cuenta.
4. **No hay tablero visual de habitaciones por estado y piso** para operar la recepción; solo listas, selects y un gráfico general en el dashboard.

### Veredicto global

| Bloque del video 2 | Cobertura actual | Estado |
|---|---|---|
| Panel de control y monitoreo | Alta, salvo “en limpieza” y tiempo real | ⚠️ Parcial |
| Recepción / check-in dinámico | Media; faltan tablero por piso, observaciones y tarifa editable | ⚠️ Parcial |
| Salida / check-out y liquidación | Media; falta limpieza automática, penalidades y cobro integrado | ❌ Brecha crítica |
| Ventas a la habitación | Media; falta estado pagado/pendiente | ❌ Brecha crítica |
| Mantenimiento y configuración | Media; pisos y categorías no se administran desde la interfaz | ⚠️ Parcial |
| Seguridad y roles | Alta en la interfaz; media a nivel base de datos | ⚠️ Parcial |
| Auditoría y reportería | Alta; faltan columnas y el reporte de catálogo | ✅ Casi completo |

### Lo que ya hacemos mejor que el video

- **Caja por turnos** con apertura, cierre, arqueo, diferencias y fondo para el siguiente turno.
- **Pre-cuenta en PDF** antes del check-out.
- **Exportación a Excel y también a PDF** por rango de fechas.
- **Auditoría y trazabilidad** por usuario, tabla y acción.
- **Validación de solapamiento** de fechas antes de reservar y de hacer check-in.
- **Roles y módulos** con política definida en el backend.
- **Consulta DNI/RUC** con Factiliza.
- **Reportes** de ocupación, caja, comprobantes, ventas, clientes y tendencias.

---

## 2. Método y alcance

- No se obtuvo la transcripción del video; el análisis se basa en **el desglose funcional proporcionado** y en la verificación del código actual.
- Se revisaron las vistas, servicios, configuración de entidades, reportes y reglas de disponibilidad.
- **No se modificó código de la aplicación**; este documento es un entregable de análisis.
- Se verificó el estado actual del dashboard: los bloques con datos ficticios están dentro de contenedores `hidden` y **no se muestran**; el resumen visible usa datos reales. Esto corrige una observación del análisis anterior.

---

## 3. Comparativa bloque por bloque

### 3.1 Panel de control y monitoreo (Dashboard)

| Aspecto | Video 2 | Sistema actual | Veredicto |
|---|---|---|---|
| Total de habitaciones | Indicador visible | Se muestra en el centro del gráfico de estados | ✅ Cumple |
| Disponibles | Indicador visible | KPI “Habitaciones disponibles” + gráfico | ✅ Cumple |
| Ocupadas | Indicador visible | KPI “Habitaciones ocupadas” + gráfico; además cruza estadías activas con el estado | ✅ Cumple |
| En limpieza | Indicador visible | El estado `LIMPIEZA` existe y el gráfico lo mostraría, pero **nunca se asigna** en el flujo normal | ❌ Falta |
| Tiempo real | Actualización continua | Refresco cada 60 segundos o manual; no hay push/websocket | ⚠️ Parcial |
| Distribución visual | Colores por estado | Donut por estado con leyenda y cantidades | ✅ Cumple |
| Acción desde el tablero | Operar habitaciones desde el panel | El dashboard es informativo; las acciones están en Check-in/Check-out | ⚠️ Parcial |

**Conclusión:** el dashboard ya cuantifica el inventario y su estado. La diferencia real es que **“Limpieza” será un estado vacío hasta que el check-out lo active**. Cuando eso ocurra, el gráfico y el conteo funcionarán sin cambios adicionales.

---

### 3.2 Recepción y check-in dinámico

| Aspecto | Video 2 | Sistema actual | Veredicto |
|---|---|---|---|
| Distribución de habitaciones por estado | Tablero con colorimetría | `Reservas.jsx` muestra tarjetas solo de habitaciones **disponibles**; `CheckInOut.jsx` usa tabla y selects | ⚠️ Parcial |
| Filtro por pisos | Botones/selector por piso | Solo búsqueda de texto que incluye el nombre del piso | ❌ Falta |
| Documento del huésped | DNI, pasaporte, carné de extranjería | Catálogo `tipo_identidad`, pero la validación exige **8 a 12 dígitos numéricos**; pasaportes o carnés con letras quedan bloqueados | ⚠️ Parcial |
| Fecha de entrada y salida | Captura ambas; el video calcula por días | Se capturan ambas manualmente; el sistema calcula las noches | ⚠️ Parcial |
| Precio por noche | Se captura y puede ajustarse | Se muestra el precio de la habitación/categoría; el total es de solo lectura | ⚠️ Parcial |
| Adelantos | Sí | Sí, con caja abierta, concepto y movimiento de caja | ✅ Cumple |
| Observaciones de la estancia | Sí | No existe campo de observaciones en `recepcion` | ❌ Falta |
| Cambio a “Ocupada” | Al registrar ingreso | `registrarCheckIn` y `registrarIngresoReserva` cambian a `OCUPADA` | ✅ Cumple |
| Registro de hora/usuario del check-in | Implícito | No hay `f_checkin` ni usuario de check-in; se infiere del estado | ❌ Falta |

**Conclusión:** el registro funciona, pero la operación visual y los datos de la estancia están por debajo del video. Lo más costoso en el día a día es **no tener un tablero por piso/estado** y **no poder dejar observaciones**.

---

### 3.3 Salida, check-out y liquidación

| Aspecto | Video 2 | Sistema actual | Veredicto |
|---|---|---|---|
| Mostrar solo habitaciones ocupadas | Sí | La tabla muestra todas las recepciones activas, aunque la acción de check-out solo aparece para las ocupadas | ⚠️ Parcial |
| Costo base de la estadía | Sí | `d_inicial` (total de la estadía) | ✅ Cumple |
| Consumos pendientes | Suma solo los pendientes | Suma **todos** los consumos de `d_asistente`, sin distinguir pagados | ❌ Falta |
| Penalidades por daños o vencimiento | Campo específico | No existe cargo de penalidad; solo se podría simular creando un producto y registrándolo como consumo | ❌ Falta |
| Cobro dentro del check-out | Liquida antes de liberar | El check-out permite salir con deuda tras una confirmación; el cobro se hace en “Pagos y caja” | ❌ Falta integración |
| Cambio automático a “En limpieza” | Sí | `registrarCheckOut` pone la habitación en `DISPONIBLE` | ❌ Contradice el video |
| Bloqueo para nuevas rentas | Sí, hasta que se limpie | `disponibilidad.js` ya excluye `LIMPIEZA`, pero el estado nunca se asigna | ⚠️ Parcial |
| Reserva futura al liberar | No se detalla | El check-out ignora reservas futuras y deja `DISPONIBLE` | ❌ Bug |
| Salida anticipada o extensión | No se detalla | No hay flujo para extender, mover de habitación ni recalcular tarifa | ❌ Falta |

**Conclusión:** es la brecha más importante del video 2. El sistema **hace lo contrario** de la automatización esperada: en lugar de bloquear la habitación para limpieza, la libera de inmediato. La buena noticia es que el motor de disponibilidad **ya respeta `LIMPIEZA`**; solo falta cambiar la transición y agregar la acción “Marcar como limpia”.

---

### 3.4 Módulo de ventas integrado (tienda / consumos)

| Aspecto | Video 2 | Sistema actual | Veredicto |
|---|---|---|---|
| Venta a la habitación | Sí | `registrarConsumo` crea `venta` + `detalle_venta` asociados a la recepción | ✅ Cumple |
| Solo si la habitación está ocupada | Obligatorio | Valida que la habitación esté `OCUPADA` y que la estadía haya comenzado | ✅ Cumple |
| Productos y servicios | Catálogo | CRUD de productos/servicios con categoría, precio, marca y detalle | ✅ Cumple |
| Estado “Cancelado” (pagado en el acto) | Sí | No existe; todo consumo se carga a la cuenta | ❌ Falta |
| Estado “Pendiente” (crédito) | Sí | Es el único comportamiento actual | ⚠️ Parcial |
| Check-out suma solo pendientes | Sí | Suma todos los consumos, porque todos son crédito | ❌ Falta |
| Anulación o nota de crédito | No se detalla | No hay anulación desde la interfaz | ❌ Falta |
| Vínculo del pago con la venta | Implícito | `movimiento_caja.id_venta` existe, pero `registrarPago` lo deja en `null` y no hay pantalla para pagar una venta | ❌ Falta |
| Control de stock | No se detalla | No hay stock, mínimos ni alertas | ⚠️ Fuera de alcance |

**Conclusión:** el sistema sabe **cargar a la cuenta**, pero no sabe **cobrar en el acto**. Eso obliga a elegir entre inflar la deuda del huésped o no registrar la venta. Para el video 2, esta es una brecha funcional y de ingresos.

---

### 3.5 Mantenimiento y configuración del sistema

| Aspecto | Video 2 | Sistema actual | Veredicto |
|---|---|---|---|
| CRUD de habitaciones | Sí | Sí: `Habitaciones` con número, categoría, piso, estado, precio y detalle | ✅ Cumple |
| CRUD de pisos | Sí | La tabla `piso` existe y se usa como referencia, pero **no hay entidad ni menú para crear/editar/eliminar pisos** | ❌ Falta |
| CRUD de categorías | Sí | La tabla `categoria_habitacion` existe y se usa como referencia, pero **no se administra desde la interfaz** | ❌ Falta |
| CRUD de estados de habitación | Implícito | La tabla existe; no hay CRUD | ⚠️ Parcial |
| Inventario interno de la habitación (Wifi, TV cable, baño) | Campos que influyen en la tarifa | Solo existe `habitacion.detalle` como texto libre; no hay servicios/amenities estructurados ni reglas de tarifa | ❌ Falta |
| Precio por noche | Editable | Se edita el precio de la habitación; la categoría puede autocompletarlo | ✅ Cumple |
| Productos e inventario | Catálogo | CRUD de productos; sin stock ni fechas visibles en un reporte de catálogo | ⚠️ Parcial |

**Conclusión:** se pueden administrar habitaciones y productos, pero **no la estructura física ni tarifaria** (pisos, categorías y amenities). Hoy esos catálogos solo se cambian directamente en Supabase.

---

### 3.6 Seguridad y roles de usuario

| Aspecto | Video 2 | Sistema actual | Veredicto |
|---|---|---|---|
| Administrador con acceso irrestricto | Sí | `ADMINISTRADOR` recibe todos los módulos activos y es el único que entra a `USUARIOS` | ✅ Cumple |
| Empleado restringido a recepción, venta y salida | Sí | `RECEPCIONISTA`, `CAJERO`, `SUPERVISOR` y `OPERACIONES/LIMPIEZA` tienen módulos acotados | ⚠️ Parcial |
| Catálogos y tarifas protegidos | Sí | `RECEPCIONISTA` y `OPERACIONES/LIMPIEZA` reciben el módulo `HABITACIONES`, que incluye **Habitaciones y Servicios**; pueden editar precios y dar de baja habitaciones | ❌ Falta granularidad |
| Reportes financieros protegidos | Sí | `RECEPCIONISTA`, `CAJERO` y `SUPERVISOR` no reciben `REPORTES`; `GERENTE` sí | ✅ Cumple |
| Aplicación de la política a nivel base de datos | No se detalla | La sesión y el backend aplican la política, pero **RLS no impide consultas directas** con la clave publicable | ⚠️ Riesgo |

**Conclusión:** el esquema de roles es razonable, pero **el módulo `HABITACIONES` mezcla operación con configuración**. Para cumplir el video, hay que separar “ver estado de habitaciones” de “administrar habitaciones, servicios y tarifas”.

---

### 3.7 Auditoría y reportería avanzada

| Aspecto | Video 2 | Sistema actual | Veredicto |
|---|---|---|---|
| Exportación a Excel por rango de fechas | Sí | Sí, con `xlsx` y filtros de fecha | ✅ Cumple |
| Exportación a PDF | No se detalla | Sí, adicional | ✅ Mejor |
| Reporte de recepciones: nombres | Sí | Sí | ✅ Cumple |
| Correos de clientes | Sí | No se incluye el correo en la tabla del reporte | ❌ Falta |
| Fechas exactas de liberación | Sí | `f_salidac` existe en la fila, pero **no se muestra ni se exporta** como columna | ❌ Falta |
| Ingresos monetarios totales | Sí | KPIs de hospedaje, cobrado y saldo | ✅ Cumple |
| Historial por habitación o general | Sí | Hay columna de habitación, pero no filtro ni agrupación por habitación | ⚠️ Parcial |
| Reporte de productos: catálogo activo y fechas de registro | Sí | El reporte actual es de **ventas por producto**, no de catálogo ni fechas de alta | ❌ Falta |
| Auditoría de acciones | Sí | `HistorialTrazabilidad` y reporte de auditoría | ✅ Cumple |

**Conclusión:** la reportería es sólida y superior en exportación, pero le faltan tres columnas/filtros concretos y un reporte de catálogo. Son mejoras de bajo riesgo.

---

## 4. Hallazgos priorizados

### P0 — Críticos

#### P0-1. El check-out deja la habitación `DISPONIBLE` en lugar de `LIMPIEZA`

- `registrarCheckOut` (`src/services/procesosService.js`) busca el estado `DISPONIBLE` y lo asigna siempre.
- `LIMPIEZA` existe en `estado_habitacion` y `buscarHabitacionesDisponibles` ya la excluye (`src/utils/disponibilidad.js`), pero nunca se usa.
- **Impacto:** una habitación sucia queda disponible para una nueva renta inmediata; se pierde el control de housekeeping y se contradice el flujo del video.
- **Riesgo adicional:** si hay una reserva futura, el check-out tampoco la considera.

#### P0-2. Todo consumo se registra como crédito; no existe “Cancelado / Pendiente”

- `registrarConsumo` siempre suma el total a `d_asistente` y recalcula `totaldeuda`.
- No hay campo de condición de pago en `venta` ni forma de asociar un pago a una venta.
- **Impacto:** una venta cobrada en el acto no se puede registrar sin inflar la deuda del huésped; el check-out suma consumos ya pagados.
- **Consecuencia:** el estado de cuenta del huésped deja de ser confiable.

#### P0-3. No hay cargos por penalidad en el check-out

- No existe campo/tabla de penalidad ni cargo extra en `recepcion`.
- El único camino es crear un producto “Penalidad” y registrarlo como consumo, lo que lo mezcla con ventas y no permite explicar el motivo.
- **Impacto:** no se pueden cobrar daños, retrasos o vencimiento de plazo de forma trazable.

### P1 — Operativas

1. **No hay flujo de limpieza:** no existe acción “Marcar como limpia”, asignación a personal ni liberación de la habitación. El menú “Limpieza” existe, pero no tiene vista.
2. **No hay tablero visual por piso/estado:** la recepción trabaja con tablas y selects; no hay room rack con colores ni filtro por piso.
3. **Pisos y categorías no se administran desde la interfaz:** `piso` y `categoria_habitacion` solo se usan como referencias.
4. **Pasaporte y carné de extranjería bloqueados:** la validación de `persona.n_documento` exige 8–12 dígitos numéricos.
5. **No hay observaciones de la estancia:** no existe `recepcion.observaciones`.
6. **El precio por noche no es ajustable:** el total se calcula y se muestra de solo lectura; no hay tarifas especiales ni descuentos.
7. **Roles demasiado amplios en `HABITACIONES`:** recepcionista y personal de limpieza pueden editar habitaciones y servicios.
8. **Reporte de recepciones incompleto:** faltan correo, salida real (`f_salidac`) y filtro por habitación.
9. **Reporte de productos es de ventas, no de catálogo:** no muestra altas, estado activo ni fecha de registro.
10. **El check-out permite salir con deuda:** el video liquida antes de liberar; el sistema solo pide confirmación.
11. **No hay cargos extra, descuentos ni pagos divididos** desde el flujo de salida.
12. **No hay extensión de estadía, cambio de habitación ni salida anticipada** con recálculo.

### P2 — Calidad, UX y mantenibilidad

1. **Dashboard casi en tiempo real:** refresco cada 60 segundos o manual; no hay suscripción en vivo.
2. **Amenities no estructurados:** `habitacion.detalle` es texto libre; no hay relación habitación-servicio ni impacto automático en la tarifa.
3. **Sin control de stock:** el catálogo de productos no tiene existencias, mínimos ni reposición.
4. **Sin bloqueos de mantenimiento por fechas:** el estado `MANTENIMIENTO` existe, pero no hay programación ni bloqueo temporal.
5. **Menú “Cochera” sin funcionalidad:** no tiene entidad ni vista.
6. **Historial de reservas solo lectura:** no permite operar ni ver el detalle completo.
7. **Acompañantes guardados en auditoría:** solución frágil; debería existir una tabla propia.
8. **Estado de habitación como única fuente de verdad:** una sola columna no representa “ocupada hoy” y “reservada mañana” al mismo tiempo.

---

## 5. Evidencia técnica

| Tema | Archivo / referencia |
|---|---|
| Check-out asigna `DISPONIBLE` | `src/services/procesosService.js` → `registrarCheckOut` |
| `LIMPIEZA` existe y bloquea disponibilidad | `src/utils/disponibilidad.js` |
| Consumos siempre a crédito | `src/services/procesosService.js` → `registrarConsumo` |
| La pantalla avisa que no se registra pago | `src/views/Consumos.jsx` |
| Check-out con deuda permitido | `src/views/CheckInOut.jsx` → `hacerCheckOut` |
| Totales de pre-cuenta | `src/views/CheckInOut.jsx` → `totalPreCuenta` / `saldoPreCuenta` |
| CRUD de habitaciones | `src/config/entidades.js` → `habitaciones` |
| Pisos/categorías solo como referencia | `src/config/entidades.js` → campos `id_categoria`, `id_piso` |
| Validación numérica del documento | `src/config/entidades.js` → `huespedes`; `registrarReserva` |
| Roles y módulos | `src/views/Dashboard.jsx` → `MODULO_POR_VISTA`; `README.md` |
| Reporte de recepciones sin correo ni salida real | `src/services/reportesService.js` → `filaRecepcion`, `reporteReservas` |
| Reporte de productos solo de ventas | `src/services/reportesService.js` → `reporteVentas` |
| Exportación Excel/PDF | `src/views/Reportes.jsx` → `exportarExcel`, `exportarPDF` |
| Menú Limpieza/Cochera sin vista | `src/views/Dashboard.jsx` → `MENU_CATEGORIAS` |
| KPIs del dashboard | `src/views/DashboardResumen.jsx`; `src/utils/dashboard.js` |
| Bloques ficticios ocultos | `src/views/Dashboard.jsx` → contenedores `hidden` |
| RLS no aplica política de módulos | `README.md` |

---

## 6. Cambios propuestos

### 6.1 Mejoras sin migración de esquema (Fase 0)

1. **Check-out → `LIMPIEZA`** y agregar acción **“Marcar como limpia”**:
   - Al limpiar, si hay una reserva activa para hoy, pasar a `RESERVADA`; si no, a `DISPONIBLE`.
   - Reutilizar el estado existente y la validación de disponibilidad actual.
2. **Tablero de habitaciones por piso y estado** en Check-in/Check-out:
   - Tarjetas con color por estado (`DISPONIBLE`, `OCUPADA`, `RESERVADA`, `LIMPIEZA`, `MANTENIMIENTO`).
   - Filtro por piso usando `habitacion.id_piso` y `piso.descripcion`.
3. **Reporte de recepciones:** agregar correo del huésped, columna “Salida real” (`f_salidac`) y filtro por habitación.
4. **Reporte de catálogo de productos:** activos, categoría, precio, marca y fecha de alta (`feccre`).
5. **KPI “En limpieza”** en el dashboard; se activará solo cuando el check-out use `LIMPIEZA`.
6. **Ajustar la matriz de roles:** separar “operar habitaciones” de “administrar habitaciones/servicios”; evitar que recepción y limpieza editen tarifas.
7. **Ocultar “Cochera”** mientras no exista, o implementarlo.
8. **Validación condicional del documento:** DNI numérico de 8; pasaporte/carné alfanumérico de 6–12 según `tipo_identidad`.

### 6.2 Cambios con migración (Fase 1)

1. **Ventas con condición de pago:**
   - `venta.condicion_pago` (`CONTADO` / `CREDITO`).
   - `venta.estado_pago` (`PAGADO` / `PENDIENTE`).
   - `venta.f_pago` e `id_movimiento_caja` para vincular el cobro.
   - Si es `CONTADO`, registrar movimiento de caja y **no** sumar a `d_asistente`.
2. **Cargos de la estadía:**
   - Tabla `recepcion_cargo` (`id_recepcion`, concepto, monto, motivo, usuario, fecha).
   - Incluir penalidades y cargos extra en la pre-cuenta y en el check-out.
3. **Datos de la estancia:**
   - `recepcion.observaciones`.
   - `recepcion.f_checkin` y usuario de check-in.
   - Opcional: `tarifa_noche` o detalle de tarifa para ajustes.
4. **Housekeeping:**
   - Tabla `housekeeping` o registro de liberación con usuario/fecha.
   - Asignación a personal de limpieza y auditoría.
5. **Habitaciones:**
   - `capacidad` en habitación o categoría.
   - Tabla `habitacion_servicio` para amenities (Wifi, TV cable, baño) y reglas de tarifa.
6. **Catálogos:**
   - Exponer CRUD de `piso`, `categoria_habitacion` y, si se requiere, `estado_habitacion`.
7. **Productos:**
   - Opcional: `stock`, `stock_minimo` y movimientos de inventario.
8. **Seguridad:**
   - RLS por rol y origen.
   - RPC/backend para reservar, cobrar y hacer check-out.
   - Validar que un recepcionista no pueda modificar tarifas ni catálogos.

### 6.3 Regla de estados recomendada

| Evento | Estado resultante |
|---|---|
| Se crea una reserva y no hay estadía en curso | `RESERVADA` |
| Se hace check-in | `OCUPADA` |
| Se hace check-out | `LIMPIEZA` |
| Limpieza terminada y hay reserva para hoy | `RESERVADA` |
| Limpieza terminada y no hay reserva inmediata | `DISPONIBLE` |
| Cancelación o no-show | Recalcular según reservas activas |
| Mantenimiento programado | `MANTENIMIENTO` + bloqueo por fechas |

> **Limitación:** una sola columna de estado no puede representar a la vez “ocupada hoy” y “reservada para mañana”. Para el flujo del video 2 alcanza con la regla anterior; para precisión total conviene separar **estado operativo actual** de **ocupación futura derivada de reservas**.

---

## 7. Plan revisado (video 1 + video 2)

### Fase 0 — Correcciones de bajo riesgo (1–3 días)

1. Check-out → `LIMPIEZA` + acción “Marcar como limpia”.
2. Unir cobro y check-out: “Cobrar saldo y hacer check-out” usando `registrarPago`.
3. Tablero de habitaciones por piso/estado y filtro por piso.
4. Reporte de recepciones con correo, salida real y filtro por habitación.
5. Reporte de catálogo de productos con fecha de alta.
6. KPI “En limpieza” en el dashboard.
7. Ajuste de roles para proteger catálogos y tarifas.
8. Ocultar accesos muertos (“Cochera”) mientras no existan.
9. Validación condicional de DNI/pasaporte/carné.

### Fase 1 — Operación y cobro (1–2 semanas)

1. Ventas con condición pagado/pendiente y vínculo con caja.
2. Cargos de penalidad y cargos extra en la cuenta.
3. Observaciones y `f_checkin` en la estancia.
4. Módulo de limpieza con asignación y liberación.
5. CRUD de pisos y categorías.
6. Separación de módulos “operar habitaciones” vs “administrar catálogos”.
7. Anulación de consumos con nota de crédito.
8. Reporte de cuentas por cobrar por cliente.

### Fase 2 — Ciclo de vida de la reserva (1–2 semanas)

1. Estados persistidos: pendiente, confirmada, check-in, check-out, cancelada, no-show.
2. Correo de confirmación/verificación.
3. Cancelación y no-show con recálculo de disponibilidad.
4. Capacidad por habitación/categoría.
5. Extensión, cambio de habitación y salida anticipada.
6. Check-out con liquidación obligatoria o autorización de supervisor.

### Fase 3 — Portal público (2–4 semanas)

1. Rutas públicas y formulario de solicitud.
2. Disponibilidad en tiempo real y prevención de sobreventa.
3. Verificación de correo y aprobación del administrador.
4. Pago/adelanto en línea.
5. RLS estricta, RPC/backend, rate limiting y captcha.

> **Prioridad recomendada:** primero cerrar la operación del video 2 (limpieza, cobro, penalidades y tablero), porque impacta la operación diaria y los ingresos. Después avanzar con el ciclo de reserva y el portal público del video 1.

---

## 8. Decisiones que conviene cerrar

1. ¿Toda salida debe bloquear la habitación en `LIMPIEZA` hasta que alguien la libere? **Recomendación: sí.**
2. ¿Quién marca la habitación como limpia: recepción o personal de limpieza?
3. ¿Las penalidades se cobran en el check-out o como cargo separado?
4. ¿Las ventas de contado se registran en una caja/turno obligatoriamente?
5. ¿Se permite que recepción edite tarifas y catálogos? **Recomendación: no.**
6. ¿Se soportarán pasaportes y carnés de extranjería? **Recomendación: sí.**
7. ¿Se implementará control de stock o solo catálogo?
8. ¿Empezamos por la Fase 0 del video 2 (limpieza + tablero + reportes) o por el ciclo de reserva del video 1?

---

## 9. Conclusión

El sistema actual es **más fuerte que el video 2 en caja, auditoría y exportación de reportes**, y **más débil en la operación visual de recepción y en el control de la cuenta de la estadía**.

La brecha que más urge corregir es el **check-out**: hoy libera la habitación como disponible; el video la deja en limpieza y bloqueada. Le siguen **la venta a habitación sin estado pagado/pendiente** y **la ausencia de penalidades**.

Con la Fase 0 se puede cerrar la mayor parte de la brecha operativa sin tocar el esquema. La Fase 1 requiere migración para modelar correctamente los consumos pagados, los cargos y el housekeeping. La Fase 2 completa el ciclo de reserva y la Fase 3 habilita el portal público.
