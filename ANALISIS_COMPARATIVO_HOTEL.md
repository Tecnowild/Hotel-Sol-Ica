# Análisis comparativo: sistema actual vs. flujo del video

**Video de referencia:** “Sistema Web Administración o Gestión de Hospedajes Hotel”  
**Sistema analizado:** Hotel Sol Ica (`C:\Users\uriel\Desktop\Hotel-Sol-Ica`)  
**Fecha:** 13/11/2026  
**Complemento:** `ANALISIS_COMPARATIVO_VIDEO_2.md` (análisis del segundo video: operación, limpieza, ventas a habitación y configuración)

---

## 1. Resumen ejecutivo

El sistema actual **ya cubre la mayor parte del flujo operativo del video**: consulta de disponibilidad, registro de una estadía, check-in, consumos cargados a la cuenta, pre-cuenta, cobros, check-out, caja y reportes.

La diferencia principal **no está en las pantallas, sino en el modelo de estados y en el canal de origen**:

| Video | Sistema actual |
|---|---|
| Solicitud web → Pendiente → correo de confirmación → aprobación → Reserva → Check-in → Consumos → Liquidación → Check-out | Una sola tabla `recepcion` funciona como reserva y como estadía. El estado se **deduce** de las fechas y del estado de la habitación. No hay portal público, ni confirmación por correo, ni estados persistidos, ni cancelación/no-show. |

### Las 4 brechas críticas

1. **No existe canal público de reservas** ni pre-registro desde web.
2. **No existe un ciclo de vida formal de la reserva** (pendiente, confirmada, cancelada, no-show, check-in, check-out). Hoy el estado es una deducción, no un dato.
3. **La reserva no “reserva” la habitación**: al guardar una reserva no se cambia la habitación a `RESERVADA`; el estado `RESERVADA` existe en la base de datos pero no se usa. Además, el check-out libera la habitación a `DISPONIBLE` sin revisar si tiene una reserva futura.
4. **El cobro y el check-out están separados**: el check-out permite salir con deuda y el pago se registra en otro módulo. El video liquida la cuenta antes de liberar la habitación.

### Lo que ya estamos haciendo mejor que el video

- Control de **caja por turnos**, arqueo, cierre y movimientos (`Pagos.jsx`, `apertura_caja`).
- **Pre-cuenta** con detalle de consumos antes del check-out (`CheckInOut.jsx`, `preCuenta.js`).
- **Validación de solapamiento** por fechas al reservar y al hacer check-in (`disponibilidad.js`).
- **Reportes** de reservas, ocupación, caja, comprobantes, productos, clientes y tendencias (`reportesService.js`).
- **Roles y módulos** por usuario, auditoría y trazabilidad.
- **Consulta DNI/RUC** con Factiliza.

---

## 2. Método y alcance

- No fue posible obtener la transcripción del video desde este entorno. El análisis se hizo con **las observaciones y marcas de tiempo proporcionadas** y con el título del video.
- Se revisó el código del frontend, los servicios de procesos, las vistas, los reportes y el esquema real de Supabase en modo **solo lectura**.
- Se confirmó el esquema real de `recepcion`, `habitacion`, `categoria_habitacion`, `venta`, `detalle_venta` y `estado_habitacion`.
- **No se modificó ningún archivo de la aplicación**; este documento es el entregable del análisis.

---

## 3. Flujo actual del sistema

```
Login
  └─ Dashboard
      ├─ Recepción y reservas
      │   ├─ Reservas (disponibilidad + alta de reserva)
      │   ├─ Check-in / Check-out (incluye “Nuevo ingreso sin reserva”)
      │   ├─ Registro de consumo (carga a la cuenta)
      │   └─ Historial de reservas (solo lectura)
      ├─ Finanzas y caja
      │   ├─ Pagos y caja (cobros, apertura/cierre, arqueo)
      │   └─ Movimientos, cajas, conceptos
      ├─ Ventas y comprobantes
      │   ├─ Facturación (boleta/factura interna)
      │   └─ Ventas, detalles, facturas, boletas
      └─ Reportes y auditoría
```

**Fuente de verdad de una estadía:** tabla `recepcion`.  
**Fuente de verdad del estado de la habitación:** tabla `habitacion.id_estadohabitacion`.  
**No existe una tabla de reservas separada de las estadías.**

---

## 4. Comparativa etapa por etapa

### 4.1 Captura de la solicitud (pre-registro / reserva)

| Aspecto | Video | Sistema actual | Veredicto |
|---|---|---|---|
| Canal | Sitio web público | Solo panel interno autenticado | ❌ Falta |
| Datos mínimos | Identificación, nombre, apellido, correo | Huésped debe existir previamente en `persona`; no hay auto-registro | ⚠️ Parcial |
| Selección de habitación | Desde el formulario web | Desde el panel, tras buscar disponibilidad | ⚠️ Parcial |
| Fechas | Fecha de ingreso + cantidad de días | Fecha de entrada + fecha de salida (ambas manuales) | ⚠️ Parcial |
| Estado inicial | “Pendiente” visible en administración | Se deduce como “Pendiente de check-in”; no se persiste | ❌ Falta |
| Confirmación por correo | Enlace de confirmación enviado al cliente | Solo se abre un borrador con `mailto:`; el sistema no envía correos | ❌ Falta |
| Verificación del correo | El cliente verifica y luego el admin aprueba | No existe token ni verificación | ❌ Falta |
| Aprobación del administrador | Convierte la solicitud en reserva efectiva | No existe aprobación; la reserva nace activa | ❌ Falta |

**Conclusión:** el sistema actual cubre la reserva interna, pero **no el recorrido digital de pre-registro, confirmación y aprobación** del video.

---

### 4.2 Asignación y registro desde administración (“Rentar”)

| Aspecto | Video | Sistema actual | Veredicto |
|---|---|---|---|
| Módulo equivalente | “Rentar” | “Nuevo ingreso sin reserva” en `CheckInOut.jsx` | ✅ Equivalente |
| Consulta de disponibilidad | Vista rápida o calendario interactivo | Lista de habitaciones disponibles para las fechas; no hay calendario ni tablero por días | ⚠️ Parcial |
| Selección de cliente | Cliente previamente registrado | Cliente previamente registrado; búsqueda por nombre/documento | ✅ Cumple |
| Definición de fechas | Cantidad de días + fecha inicial; el sistema calcula la salida | Se ingresan entrada y salida por separado | ⚠️ Mejorable |
| Cambio a “Reservado” | Al guardar, la habitación pasa a Reservado | No cambia el estado; queda `DISPONIBLE` aunque tenga reserva | ❌ Falta / bug |
| Validación de solapamiento | Calendario y disponibilidad | Validación por fechas antes de insertar | ✅ Cumple |
| Capacidad de la habitación | No se detalla | No existe campo de capacidad; se puede reservar una habitación para cualquier cantidad de huéspedes | ❌ Falta |

**Conclusión:** funcionalmente se puede “rentar”, pero **el estado visual de la habitación no refleja la reserva** y no se controla la capacidad.

---

### 4.3 Check-in

| Aspecto | Video | Sistema actual | Veredicto |
|---|---|---|---|
| Check-in de una reserva | Cambia la habitación a “Ocupado” | Cambia la habitación a `OCUPADA` | ✅ Cumple |
| Check-in directo sin reserva | Módulo “Rentar” | “Nuevo ingreso sin reserva” | ✅ Cumple |
| Registro de fecha/hora y usuario del check-in | Implícito en el sistema | No hay campos `f_checkin` ni usuario de check-in; se infiere del estado de la habitación | ❌ Falta |
| Cobro al momento del check-in | No se detalla | Solo el ingreso directo permite “adelanto”; el check-in de una reserva no cobra nada | ⚠️ Parcial |
| Verificación de identidad / ficha de huésped | No se detalla | Solo valida que la persona exista | ⚠️ Mejorable |

**Conclusión:** el cambio de estado se cumple, pero **no queda un registro formal del check-in** más allá del estado de la habitación.

---

### 4.4 Consumos durante la estadía (ventas a crédito)

| Aspecto | Video | Sistema actual | Veredicto |
|---|---|---|---|
| Registro de productos | Módulo Inventario | Módulo “Registro de consumo” | ✅ Cumple |
| Venta a crédito a la cuenta | “Factura a crédito” vinculada al cliente | Inserta `venta` + `detalle_venta` y suma a `d_asistente` y `totaldeuda` | ✅ Equivalente funcional |
| Acumulación para cobro final | Sí | Sí; se ve en la pre-cuenta | ✅ Cumple |
| Comprobante de crédito por consumo | Se menciona “Factura a Crédito” | No se genera un documento de crédito por consumo; solo queda el detalle interno | ⚠️ Parcial |
| Anulación / corrección de un consumo | No se detalla | No existe anulación desde la interfaz; solo edición directa en base de datos | ❌ Falta |
| Consumo antes del check-in | No aplica | Bloqueado correctamente | ✅ Cumple |
| Consumo después del check-out | No aplica | Bloqueado correctamente | ✅ Cumple |

**Conclusión:** el comportamiento de crédito a la cuenta **sí está implementado**, pero falta el documento/estado de crédito y la posibilidad de anular o corregir consumos.

---

### 4.5 Check-out y liquidación

| Aspecto | Video | Sistema actual | Veredicto |
|---|---|---|---|
| Revisión de cuenta antes de salir | Reporte “Ventas por Clientes” | Pantalla de check-out con pre-cuenta, consumos, pagos y saldo | ✅ Mejor que el video |
| Reporte de saldos por cliente | Consulta saldos/facturas a crédito | “Reservas y check-in” muestra saldo, pero no agrupado por cliente; el “Ranking de clientes” no muestra saldo | ⚠️ Parcial |
| Liquidación antes del check-out | Se cobra y luego se hace check-out | El check-out permite salir con deuda tras una confirmación; el cobro se hace en “Pagos y caja” | ❌ Falta integración |
| Check-out | Libera la habitación | Registra `f_salidac` y pone la habitación en `DISPONIBLE` | ✅ Cumple |
| Habitación con reserva futura | No se detalla | El check-out la pone `DISPONIBLE` sin revisar reservas futuras | ❌ Bug |
| Limpieza después del check-out | No se detalla | No hay flujo de limpieza; el estado `LIMPIEZA` existe pero no se usa | ❌ Falta |
| Salida anticipada / extensión de estadía | No se detalla | No hay flujo para extender, mover de habitación ni ajustar salida | ❌ Falta |

**Conclusión:** la revisión de cuenta es buena, pero **el check-out no está unido al cobro** y **el estado de la habitación no contempla reservas futuras ni limpieza**.

---

## 5. Hallazgos priorizados

### P0 — Críticos (afectan ingresos, integridad o promesa al cliente)

#### P0-1. No existe portal público de reservas
- `src/App.js` solo expone `/login` y `/dashboard`.
- No hay rutas públicas, formulario web, verificación de correo ni rol `CLIENTE` operativo (el README lo menciona como “reservado para el futuro portal público”).
- **Impacto:** no se puede captar reservas fuera del mostrador.

#### P0-2. No hay ciclo de vida persistido de la reserva
- La tabla `recepcion` no tiene `estado_reserva`, `f_reserva`, `f_confirmacion`, `f_checkin`, `origen` ni `f_checkout`.
- El estado se deduce en `src/utils/reportes.js` (`clasificarEstadoReserva`) y en `CheckInOut.jsx` a partir de fechas y del estado de la habitación.
- **Impacto:** no se puede distinguir una reserva confirmada de una pendiente, cancelada o no-show. Tampoco hay historial de aprobación.

#### P0-3. No se puede cancelar ni marcar no-show; las reservas no expiran
- `reservas` está configurada como `soloLectura` en `src/config/entidades.js`; no hay acciones de cancelación en `CheckInOut.jsx`.
- Una reserva que no se presenta queda “Pendiente de check-in” indefinidamente y sigue bloqueando disponibilidad para sus fechas.
- **Impacto:** sobreventa evitable, habitaciones bloqueadas y reportes distorsionados.

#### P0-4. La reserva no cambia el estado de la habitación a `RESERVADA`
- En `registrarReserva` (`src/services/procesosService.js`) solo se inserta la recepción; no se actualiza `habitacion.id_estadohabitacion`.
- El estado `RESERVADA` (id 3) **existe en la base de datos** pero no se asigna nunca.
- **Impacto:** el tablero y los listados muestran “Disponible” una habitación que ya tiene reserva; el personal puede asignarla por error si no consulta fechas.

#### P0-5. El check-out libera la habitación sin considerar reservas futuras ni limpieza
- `registrarCheckOut` pone siempre `DISPONIBLE`.
- `LIMPIEZA` (id 4) existe en la base de datos pero no se usa.
- **Impacto:** después de una salida, una habitación con reserva para mañana se muestra disponible; además no hay control de limpieza.

#### P0-6. Cobro y check-out separados; se puede salir con deuda
- `hacerCheckOut` en `CheckInOut.jsx` solo pide confirmación si hay deuda.
- El pago se registra en `Pagos.jsx`, no en el flujo de salida.
- **Impacto:** riesgo de fuga de ingresos, cuentas que quedan abiertas y check-outs sin liquidar.

#### P0-7. Arquitectura de seguridad incompatible con un portal público
- Las operaciones hoteleras se ejecutan desde el frontend con la clave publicable de Supabase.
- El backend solo expone autenticación, consultas y usuarios (`backend/server.js`).
- El README reconoce que el rol/módulo no impide solicitudes directas a Supabase si las políticas RLS lo permiten.
- **Impacto:** al abrir un portal público, se expone la base a consultas/escrituras no controladas. **Antes del portal se debe mover la lógica a backend/RPC y endurecer RLS.**

---

### P1 — Operativas (paridad con el video y operación diaria)

1. **No hay calendario ni tablero de habitaciones por días.** Solo una lista de disponibilidad; el video muestra calendario interactivo. Falta una vista tipo “room rack”.
2. **No se ingresa la cantidad de noches.** Se ingresan entrada y salida por separado; el video calcula la salida a partir de los días.
3. **No hay control de capacidad** por habitación/categoría; se puede reservar una habitación para más personas de las que admite.
4. **No hay flujo de limpieza.** El menú “Limpieza” existe (`Dashboard.jsx`), pero no tiene entidad ni vista: al hacer clic no se muestra nada. Lo mismo ocurre con “Cochera”.
5. **No hay anulación de consumos** ni nota de crédito; un error de digitación solo se corrige en base de datos.
6. **No hay reporte de cuentas por cobrar por cliente con antigüedad de saldo.** Existe saldo en el reporte de reservas, pero no agrupado por cliente ni con aging.
7. **No hay cobro al momento de reservar** (adelanto/garantía), salvo el adelanto del ingreso directo.
8. **El check-in de una reserva no registra pago**; si el huésped paga al llegar, hay que ir a “Pagos y caja”.
9. **No hay mover de habitación, extender estadía ni salida anticipada** con recálculo de tarifa.
10. **No se permiten reservas de empresas**; `registrarReserva` rechaza `tipo_cliente !== "persona"`. El video no lo muestra, pero es una necesidad hotelera frecuente.
11. **No hay reservas con varias habitaciones** ni habitaciones conectadas.
12. **Facturación solo interna:** no hay IGV desglosado, PDF de boleta/factura ni envío/validación SUNAT (`Facturacion.jsx` lo advierte).
13. **No hay reembolsos, descuentos ni pagos divididos** desde el flujo de check-out (los pagos parciales sí existen en caja).

---

### P2 — Calidad, UX y mantenibilidad

1. **Bloques heredados ocultos en el Dashboard:** los eventos “Hace 15 minutos”, “Hace 32 minutos”, etc. siguen hardcodeados en `Dashboard.jsx`, pero están dentro de contenedores `hidden` y no se muestran. La actividad visible de `DashboardResumen` ya usa reservas y movimientos de caja reales. Conviene eliminar el código muerto para evitar confusiones.
2. **Entradas de menú muertas:** “Limpieza” y “Cochera” no tienen vista ni entidad.
3. **Historial de reservas sin acciones:** es un CRUD de solo lectura; no permite ver el detalle completo ni operar sobre la reserva.
4. **Número de reserva = `id_recepcion`:** no hay código legible para el huésped (ej. `RSV-2026-000123`).
5. **Acompañantes guardados como eventos de auditoría:** `procesosService.js` los registra en `auditoria` porque no existe tabla propia. Es una solución frágil y contamina la auditoría; debe existir `recepcion_acompanante`.
6. **Estado de habitación como única fuente de verdad:** si alguien edita la habitación desde el CRUD, cambia el estado operativo de la estadía.
7. **Validación de disponibilidad en cliente:** no hay constraint de exclusión ni operación transaccional; dos reservas simultáneas podrían solaparse.
8. **Falta `f_checkin` y usuario de check-in:** no se puede auditar quién recibió al huésped y cuándo.
9. **`README` y roles:** `RECEPCIONISTA` no tiene módulo `CAJA`, pero puede registrar adelantos desde el check-in; revisar coherencia de permisos.

---

## 6. Evidencia técnica (archivos clave)

| Tema | Archivo / línea |
|---|---|
| Rutas solo login/dashboard | `src/App.js` |
| Reserva interna, sin cobro ni cambio de estado | `src/services/procesosService.js` → `registrarReserva` |
| Check-in de reserva solo cambia estado de habitación | `src/services/procesosService.js` → `registrarIngresoReserva` |
| Check-out libera a `DISPONIBLE` | `src/services/procesosService.js` → `registrarCheckOut` |
| Consumos a cuenta | `src/services/procesosService.js` → `registrarConsumo` |
| Pago y actualización de saldo | `src/services/procesosService.js` → `registrarPago` |
| Comprobante interno | `src/services/procesosService.js` → `emitirComprobante` |
| Check-out con deuda permitido | `src/views/CheckInOut.jsx` → `hacerCheckOut` |
| Pre-cuenta | `src/views/CheckInOut.jsx`, `src/utils/preCuenta.js` |
| Disponibilidad por fechas | `src/utils/disponibilidad.js` |
| Estado de reserva deducido | `src/utils/reportes.js` → `clasificarEstadoReserva` |
| Reservas solo lectura | `src/config/entidades.js` → `reservas` |
| Actividad ficticia | `src/views/Dashboard.jsx` (bloque de actividad reciente) |
| Menú Limpieza/Cochera sin vista | `src/views/Dashboard.jsx` |
| Reporte de clientes sin saldo | `src/services/reportesService.js` → `reporteClientes` |
| Reporte de reservas con saldo | `src/services/reportesService.js` → `reporteReservas` |
| Facturación solo interna | `src/views/Facturacion.jsx` |
| Backend limitado a auth/consultas/usuarios | `backend/server.js` |

**Esquema real confirmado (solo lectura):**
- `recepcion`: `id_recepcion, id_cliente, id_habitacion, id_usuario, id_metodopago, f_entrada, f_salida, f_salidac, d_inicial, adelanto, d_asistente, t_pagado, contarjeta, totaldeuda, tipodocumento, documento, ...auditoría`.
- `estado_habitacion`: `DISPONIBLE`, `OCUPADA`, `RESERVADA`, `LIMPIEZA`, `MANTENIMIENTO`.
- `habitacion` y `categoria_habitacion` **no tienen capacidad**.
- `venta` y `detalle_venta` no tienen usuario, fecha de consumo, tipo de venta ni anulación.

---

## 7. Modelo de datos propuesto

> Requiere migración SQL en Supabase; la aplicación no puede crear tablas desde el frontend.

### 7.1 Reservas y estadías

Opción recomendada: **mantener `recepcion` como estadía** y agregar estados/fechas, sin crear una tabla separada de reservas en una primera fase.

Campos nuevos en `recepcion`:

| Campo | Tipo | Uso |
|---|---|---|
| `estado_reserva` | text o FK a `estado_reserva` | `PENDIENTE_CONFIRMACION`, `CONFIRMADA`, `CHECKIN`, `CHECKOUT`, `CANCELADA`, `NOSHOW` |
| `origen` | text | `WEB`, `MOSTRADOR`, `TELEFONO`, `OTA` |
| `codigo_reserva` | text único | Código legible para el huésped |
| `f_reserva` | timestamptz | Fecha de creación de la solicitud |
| `f_confirmacion` | timestamptz | Fecha de aprobación/confirmación |
| `email_verificado_en` | timestamptz | Verificación del correo |
| `f_checkin` | timestamptz | Check-in real |
| `f_checkout` | timestamptz | Check-out real (reemplaza/convive con `f_salidac`) |
| `observaciones` | text | Notas de reserva |

Tablas nuevas:

- `estado_reserva` (catálogo) o restricción `CHECK`.
- `recepcion_acompanante` (`id_recepcion`, `id_persona`, `tipo`) para reemplazar el uso de `auditoria`.
- `reserva_habitacion` si se quieren varias habitaciones por reserva.
- `notificacion` / `email_outbox` para confirmaciones y verificación.
- `housekeeping` (`id_habitacion`, estado, usuario, fecha, observación).
- `bloqueo_habitacion` (`id_habitacion`, desde, hasta, motivo) para mantenimiento.
- `cuenta_por_cobrar` (vista o tabla derivada) para saldos por cliente y antigüedad.

### 7.2 Consumos

Agregar a `venta`:

- `tipo_venta` (`CONTADO` / `CREDITO`)
- `id_usuario`
- `f_consumo`
- `anulada` y `motivo_anulacion`
- `id_comprobante` (opcional, si se emite documento de crédito)

Agregar a `detalle_venta`:

- `precio_unitario` (hoy se deduce de `sub_total / cantidad`)

### 7.3 Habitaciones

- `habitacion.capacidad` o `categoria_habitacion.capacidad`.
- Catálogo de estados ya existente; **usar** `RESERVADA` y `LIMPIEZA`.
- Regla recomendada: el estado de la habitación debe **recalcularse** después de reservar, hacer check-in, hacer check-out y cancelar:
  - Si hay estadía en curso → `OCUPADA`.
  - Si no hay estadía en curso pero hay reserva futura/activa → `RESERVADA`.
  - Si acaba de salir y no hay reserva inmediata → `LIMPIEZA`.
  - Si no hay nada → `DISPONIBLE`.
- Importante: una sola columna de estado no puede representar “ocupada ahora” y “reservada para mañana” al mismo tiempo. Si se necesita precisión total, separar **estado operativo actual** de **ocupación futura derivada de reservas**.

### 7.4 Base de datos y concurrencia

- Constraint de exclusión por rango de fechas para evitar solapamientos, o una función RPC transaccional `crear_reserva`.
- Índices por `id_habitacion`, `f_entrada`, `f_salida`, `estado_reserva`.
- RLS por rol y por origen (público solo puede insertar solicitudes y leer su propia reserva).
- Mover la lógica crítica (reservar, check-in, cobrar, check-out) a backend/RPC.

---

## 8. Plan recomendado

> Este plan se complementa con `ANALISIS_COMPARATIVO_VIDEO_2.md`, que agrega las brechas de limpieza automática, ventas pagadas/pendientes, penalidades, tablero por piso y administración de pisos/categorías.

### Fase 0 — Correcciones de bajo riesgo (1–3 días)

Sin cambios de esquema, usando lo que ya existe:

1. **Recalcular el estado de la habitación** después de reservar, hacer check-in y hacer check-out:
   - Reserva: `RESERVADA` si no hay estadía en curso.
   - Check-out: **siempre `LIMPIEZA`**; luego, al marcar la habitación como limpia, pasar a `RESERVADA` si hay una reserva activa para hoy o a `DISPONIBLE` si no.
   - Requiere una acción “Marcar como limpia” para no dejar habitaciones bloqueadas indefinidamente. Esta regla reemplaza la propuesta anterior de liberar directamente a `DISPONIBLE` y responde al flujo del video 2.
2. **Unir cobro y check-out:** botón “Cobrar saldo y hacer check-out” que use `registrarPago` y luego `registrarCheckOut`.
3. **Registrar adelanto al reservar** (opcional) usando el flujo de caja existente.
4. **Agregar cantidad de noches** en Reservas y Check-in, recalculando la fecha de salida.
5. **Cancelar / no-show:** baja lógica (`estado = '0'`) con motivo y recálculo de habitación.
6. **Reporte “Cuentas por cobrar”** agrupado por cliente, con saldo y antigüedad.
7. **Eliminar los bloques heredados ocultos** del Dashboard que aún tienen actividad ficticia; la actividad visible ya usa datos reales.
8. **Implementar la vista de Limpieza** junto con la acción “Marcar como limpia”; ocultar “Cochera” mientras no exista.

> La cancelación con baja lógica no distingue “cancelada” de “no-show”. Para eso conviene la Fase 1.

### Fase 1 — Ciclo de vida de la reserva (1–2 semanas)

1. Migración: `estado_reserva`, fechas, origen, código, acompañantes, capacidad.
2. Backend/RPC para crear, confirmar, cancelar, no-show y check-in.
3. Pantalla de reserva con estados y acciones.
4. Correo de confirmación/verificación (servicio transaccional).
5. Calendario / room rack por días.
6. Pruebas de estados y solapamiento.

### Fase 2 — Caja, crédito y liquidación (1–2 semanas)

1. Check-out con liquidación obligatoria o autorización de supervisor con motivo.
2. Estado de cuenta imprimible/PDF por huésped.
3. Anulación de consumos con nota de crédito.
4. Reporte de cuentas por cobrar con aging.
5. Cobro al reservar, reembolsos y descuentos.
6. Factura/boleta con IGV y PDF; SUNAT si el negocio lo exige.

### Fase 3 — Portal público de reservas (2–4 semanas)

1. Rutas públicas y formulario de solicitud.
2. Disponibilidad en tiempo real y prevención de sobreventa.
3. Verificación de correo y estado “Pendiente”.
4. Aprobación desde administración.
5. Pago en línea / adelanto (si se requiere).
6. RLS estricta, backend/RPC, rate limiting y captcha.
7. Política de privacidad y tratamiento de datos.

### Fase 4 — Operación avanzada (opcional)

- Housekeeping y mantenimiento con bloqueos por fechas.
- Tarifas por temporada y planes.
- Reservas corporativas y de múltiples habitaciones.
- Integración con OTAs / channel manager.
- Check-in digital y firma de ficha de huésped.

---

## 9. Decisiones que conviene cerrar antes de implementar

1. **¿El portal público será parte de este mismo React o un sitio aparte?**
2. **¿Se exigirá pago/adelanto para confirmar una reserva web?**
3. **¿Se permite check-out con deuda?** Recomendación: no, salvo autorización de supervisor con motivo registrado.
4. **¿Se implementará SUNAT o el comprobante seguirá siendo interno?**
5. **¿Se necesita reservar empresas y varias habitaciones por reserva?**
6. **¿Se implementa limpieza ahora o se oculta del menú?**
7. **¿El alcance inmediato es solo análisis o implementamos la Fase 0?**

---

## 10. Conclusión

El sistema actual es **sólido en back office**: caja, consumos, pre-cuenta, reportes y control de acceso. En paridad funcional con el video, la operación de mostrador está cubierta en gran medida.

La brecha real está en **el recorrido digital del huésped y en el ciclo de vida de la reserva**:

- falta el portal público y la confirmación por correo;
- falta persistir estados y acciones (confirmar, cancelar, no-show);
- la reserva no reserva visualmente la habitación;
- el check-out no liquida ni contempla limpieza/reservas futuras.

**Orden recomendado:** Fase 0 (corregir estados y unir cobro/check-out) → Fase 1 (ciclo de vida + correo) → Fase 2 (cuentas por cobrar y liquidación) → Fase 3 (portal público).
