# Análisis comparativo — Video 3: control de habitaciones, tiempos, ventas e inventario

**Video de referencia:** https://www.youtube.com/watch?v=IeTkV5uDFK4  
**Sistema analizado:** Hotel Sol Ica (`C:\Users\uriel\Desktop\Hotel-Sol-Ica`)  
**Fecha:** 13/11/2026  
**Complementa:** `ANALISIS_COMPARATIVO_HOTEL.md` (video 1) y `ANALISIS_COMPARATIVO_VIDEO_2.md` (video 2)

---

## 1. Resumen ejecutivo

El sistema actual sigue siendo **más fuerte que los videos en el back office**: caja por turnos, arqueo por método de pago, pre-cuenta, auditoría, reportería y roles. El video 3 no compite en esa base; **desplaza el foco a la operación en vivo y al control comercial**:

1. **Estadías por tiempo y alertas de salida.** El sistema trabaja con fechas (día), no con hora de salida ni cuenta regresiva.
2. **Cambio de habitación en caliente.** No existe; mover a un huésped obliga a editar la base o simular una salida y un nuevo ingreso.
3. **Ventas libres, consumo interno e inventario.** Hoy toda venta exige una recepción ocupada; no hay venta de mostrador, consumo interno ni stock/kárdex.
4. **Pagos mixtos.** Se admite un método por movimiento; se pueden hacer pagos parciales sucesivos, pero no una sola transacción combinada.
5. **Analítica por turno y nacionalidad.** Hay ocupación y ranking de ventas, pero no un cuadro de mando por turno ni perfilamiento geográfico.

### Veredicto global

| Bloque del video 3 | Cobertura actual | Estado |
|---|---|---|
| Control de habitaciones y alertas de tiempo | Filtros en el CRUD y estados; sin tablero operativo ni cronómetro | ⚠️ Parcial |
| Cambio de habitación en caliente | No existe | ❌ Brecha |
| Check-in e integración RENIEC | Factiliza completa DNI/RUC; sin pasaporte/carné | ⚠️ Parcial |
| Pago postergado, digital y mixto | Postergado implícito y métodos por catálogo; mixto no | ⚠️ Parcial |
| Caja chica y cuadre por método | Apertura, cierre, arqueo y diferencias por método | ✅ Cumple |
| Bitácora transaccional por recepción | Movimientos y auditoría genérica; sin eventos estructurados | ⚠️ Parcial |
| Ventas libres y consumo interno | No existen | ❌ Brecha |
| Inventario y kárdex | No existen | ❌ Brecha |
| Dashboard de ocupación e ingresos | Ocupación y ranking; sin corte por turno | ⚠️ Parcial |
| Perfilamiento por nacionalidad | No se captura ni se reporta | ❌ Brecha |

### Lo que ya hacemos mejor que el video 3

- **Caja por turnos** con apertura, cierre, arqueo, diferencias, fondo para el siguiente turno y retiro a caja fuerte.
- **Desglose por método de pago** en el arqueo: esperado, contado y diferencia por cada método.
- **Pre-cuenta en PDF** y comprobante interno de pago.
- **Auditoría y trazabilidad** por usuario, tabla, acción, terminal y fecha.
- **Reportes** de ocupación, caja, comprobantes, ventas, clientes, tendencias y auditoría, con exportación a Excel y PDF.
- **Roles y módulos** con política en el backend.
- **Consulta DNI/RUC con Factiliza**, con autocompletado de nombres, apellidos, fecha de nacimiento, sexo y dirección.
- **Validación de solapamiento** de fechas antes de reservar y hacer check-in.

---

## 2. Relación con los videos anteriores

El video 3 **no reemplaza** las brechas del video 2; las refuerza y agrega otras:

| Tema | Video 1 | Video 2 | Video 3 | Estado actual |
|---|---|---|---|---|
| Reserva y pre-registro | Sí | Parcial | No | Parcial |
| Check-out a `LIMPIEZA` | No | Sí | Implícito | ❌ Pendiente |
| Consumos pagados/pendientes | No | Sí | Sí | ❌ Pendiente |
| Penalidades | No | Sí | No | ❌ Pendiente |
| Tablero por piso/estado | No | Sí | Sí | ❌ Pendiente |
| Estancia por horas y alerta | No | No | Sí | ❌ Nuevo |
| Cambio de habitación | No | No | Sí | ❌ Nuevo |
| Ventas libres y stock | No | Parcial | Sí | ❌ Nuevo |
| Pago mixto | No | No | Sí | ❌ Nuevo |
| Nacionalidad | No | No | Sí | ❌ Nuevo |

> **Lectura:** el video 3 es el más exigente en operación y comercialización. El video 2 sigue siendo la mejor guía para ordenar el ciclo de la habitación y la cuenta.

---

## 3. Método y alcance

- No se obtuvo la transcripción del video; el análisis se basa en **el desglose funcional proporcionado** y en la verificación del código actual.
- Se revisaron vistas, servicios, configuración de entidades, reportes, caja y auditoría.
- **No se modificó código de la aplicación**; este documento es un entregable de análisis.
- Cuando el video habla de “RENIEC”, el sistema actual usa **Factiliza** como proveedor de datos oficiales de DNI/RUC. No es una conexión directa con RENIEC, pero el resultado funcional es equivalente para DNI.

---

## 4. Comparativa bloque por bloque

### 4.1 Control de habitaciones y alertas de tiempo

| Aspecto | Video 3 | Sistema actual | Veredicto |
|---|---|---|---|
| Filtro por categoría | Sí, en el módulo principal | El CRUD de Habitaciones filtra por categoría; la operación de recepción no | ⚠️ Parcial |
| Filtro por estado | Sí, disponible/ocupada/limpieza/reservada | El CRUD filtra por estado; Check-in/Check-out solo busca por texto | ⚠️ Parcial |
| Gestión visual de estados | Tablero con colores | Tarjetas de habitaciones disponibles en Reservas; tabla y selects en Check-in/Check-out | ⚠️ Parcial |
| Cronómetro o alerta de salida | Aviso cuando faltan menos de 5 minutos | No existe; el sistema solo maneja fechas sin hora | ❌ Falta |
| Comunicación por intercomunicador | Flujo humano apoyado por la alerta | Fuera del sistema | ⚠️ Externo |
| Cambio de habitación en caliente | Traslado con migración automática de datos, consumos y tiempo | No existe | ❌ Falta |
| Conservación del tiempo restante | Se traslada al nuevo espacio | No hay tiempo restante modelado | ❌ Falta |
| Recalcular disponibilidad al mover | Implícito | `disponibilidad.js` existe, pero no se usa para mover | ⚠️ Base disponible |

**Conclusión:** el sistema tiene los estados y la validación de disponibilidad, pero **no tiene el tablero operativo ni el modelo de tiempo** que hacen posible la alerta. Sin hora de salida no se puede calcular “faltan 5 minutos”.

---

### 4.2 Check-in e integración de identidad (RENIEC)

| Aspecto | Video 3 | Sistema actual | Veredicto |
|---|---|---|---|
| Autocompletado por documento | Sí, conexión RENIEC | Factiliza completa nombres, apellidos, fecha de nacimiento, sexo, dirección y tipo de documento | ✅ Equivalente para DNI |
| Documento de identidad | DNI, pasaporte, carné de extranjería | El catálogo `tipo_identidad` existe, pero la validación exige 8–12 dígitos numéricos | ⚠️ Parcial |
| Pasaporte y carné | Soportados | Bloqueados por la validación numérica | ❌ Falta |
| Verificación oficial guardada | Implícita | Solo se completan campos; no se guarda constancia de la consulta ni su resultado | ⚠️ Parcial |
| Consulta desde el check-in | Sí | Se consulta al dar de alta al huésped o desde el CRUD; el check-in trabaja con clientes ya creados | ⚠️ Parcial |
| Nacionalidad del huésped | Se usa para reportes | No se captura en `persona` | ❌ Falta |
| Pago postergado | Se marca para liquidar al check-out | Se permite check-in con adelanto 0, pero se exige elegir un método de pago “previsto”; no hay marca explícita de postergado | ⚠️ Parcial |
| Métodos digitales individuales | Yape, Plin, tarjeta, depósito | Depende del catálogo `metodo_pago`; no hay lógica específica de Yape/Plin ni validación de operación | ⚠️ Parcial |
| Pago mixto | Varios métodos en una sola transacción | Un método por movimiento; se pueden hacer pagos parciales sucesivos, pero no una transacción mixta | ❌ Falta |

**Conclusión:** para DNI, el sistema ya hace lo que muestra el video. La brecha está en **pasaportes/carnés, nacionalidad, registro de la verificación y pago mixto**. El “pago postergado” funciona en la práctica, pero no está expresado como una opción clara.

---

### 4.3 Caja chica y bitácora transaccional

| Aspecto | Video 3 | Sistema actual | Veredicto |
|---|---|---|---|
| Apertura por turno | Sí | Sí: caja, turno, fondo inicial, usuario y observación | ✅ Cumple |
| Desglose por método | Efectivo, tarjeta, Yape, Plin, depósito | Sí, por cada método del catálogo: esperado, contado y diferencia | ✅ Cumple |
| Cuadre estricto al cierre | Sí | Sí: arqueo, diferencia, fondo siguiente y retiro | ✅ Cumple |
| Historial por recepción | Sí, con renovaciones y cambios de tarifa | `movimiento_caja.id_recepcion` permite ver pagos; no hay eventos de renovación ni de cambio de tarifa | ⚠️ Parcial |
| Renovaciones de 12 o 24 horas | Sí | No existe extensión de estadía | ❌ Falta |
| Incrementos de tarifa | Sí, con variación de montos | No hay ajuste de tarifa ni cargo adicional trazable | ❌ Falta |
| Bitácora inmutable | Sí | `auditoria` registra eventos, pero no hay garantía a nivel base de datos | ⚠️ Parcial |
| Vínculo pago–venta | Implícito | `movimiento_caja.id_venta` existe, pero `registrarPago` lo deja en `null` | ❌ Falta |

**Conclusión:** la caja es uno de los puntos más fuertes del sistema y **supera al video** en control de diferencias y fondo siguiente. La debilidad está en la **bitácora estructurada de la estadía**: hoy hay pagos y auditoría genérica, pero no un historial legible de “se extendió 12 horas”, “subió la tarifa” o “se cambió de habitación”.

---

### 4.4 Módulo de ventas e inventario

| Aspecto | Video 3 | Sistema actual | Veredicto |
|---|---|---|---|
| Venta libre de productos | Sí, sin vincular a una habitación | No: `registrarConsumo` exige recepción y habitación ocupada | ❌ Falta |
| Venta a la habitación | Sí | Sí, con validación de estadía ocupada | ✅ Cumple |
| Consumo interno | Sí: descuenta stock y no afecta caja comercial | No existe | ❌ Falta |
| Catálogo de productos | Sí, con stock | Sí, con categoría, precio, marca y detalle; sin stock | ⚠️ Parcial |
| Stock y mínimos | Sí | No hay campos ni lógica de existencias | ❌ Falta |
| Kárdex de entradas y salidas | Sí | No existe | ❌ Falta |
| Filtro de stock bajo | Sí | No existe | ❌ Falta |
| Reporte de inventario | Sí | El reporte de productos es de ventas, no de existencias | ❌ Falta |
| Anulación de venta | No se detalla | No hay anulación desde la interfaz | ❌ Falta |

**Conclusión:** el sistema sabe **cargar consumos a una habitación ocupada**, pero no sabe **vender en mostrador**, **descontar inventario** ni **controlar existencias**. Si el hotel tiene tienda o vende productos fuera de la habitación, esta es la brecha comercial más costosa del video 3.

---

### 4.5 Analítica y cuadro de mando

| Aspecto | Video 3 | Sistema actual | Veredicto |
|---|---|---|---|
| Tasa de ocupación | Sí | KPI en Dashboard y reporte de Ocupación | ✅ Cumple |
| Balance de ingresos por turno | Sí | El módulo Pagos muestra turnos y arqueo; el reporte de Caja no agrupa por turno | ⚠️ Parcial |
| Ranking de ventas de servicios | Sí | Reporte de Ventas con ranking de productos y categorías | ✅ Cumple |
| Perfilamiento por nacionalidad | Sí | No se captura nacionalidad ni hay reporte | ❌ Falta |
| Gráficos geográficos | Sí | No existen | ❌ Falta |
| Ocupación por categoría | No se detalla | Sí, con ADR y tarifa promedio | ✅ Mejor |
| Tendencias y estacionalidad | No se detalla | Sí | ✅ Mejor |
| Actualización en vivo | Implícita | Refresco cada 60 segundos o manual | ⚠️ Parcial |

**Conclusión:** la base analítica es sólida y superior en ocupación, ADR y tendencias. Faltan **el corte por turno en el cuadro de mando** y **la dimensión de nacionalidad**.

---

## 5. Hallazgos priorizados

### P0 — Críticos para la operación del video 3

#### P0-1. No existe estancia por horas ni alerta de salida

- `recepcion.f_entrada` y `recepcion.f_salida` son fechas; la UI no captura hora.
- No hay `f_salida_programada` ni un campo equivalente de timestamp.
- No hay cronómetro, alerta de “faltan 5 minutos” ni extensión de 12/24 horas.
- **Impacto:** no se puede operar alquiler por horas, avisar al recepcionista ni cobrar renovaciones.
- **Nota:** si el hotel solo trabaja por noches, esta brecha baja a P1; si trabaja por horas o con salidas programadas, es P0.

#### P0-2. No existe cambio de habitación

- No hay función, botón ni servicio para mover una recepción de una habitación a otra.
- `Reservas` es de solo lectura y `CheckInOut` no permite editar la habitación.
- Mover a un huésped hoy exige editar la base de datos o simular check-out y check-in, lo que rompe la continuidad de consumos, pagos y tiempo.
- **Impacto:** fricción operativa y riesgo de estados inconsistentes entre la recepción y la habitación.

#### P0-3. No existen ventas libres, consumo interno ni inventario

- `registrarConsumo` exige una recepción activa y una habitación ocupada.
- No hay venta de mostrador ni venta sin habitación.
- No hay “consumo interno” que descuente stock sin afectar caja.
- El catálogo `producto` solo tiene precio, marca y detalle; no hay existencias.
- No hay kárdex, mínimos ni alertas de stock bajo.
- **Impacto:** las ventas fuera de la habitación no se registran o se fuerzan a una cuenta de huésped; no hay control de inventario ni trazabilidad de entradas y salidas.

### P1 — Operativas y comerciales

1. **Pago mixto:** no se puede cobrar una sola operación con efectivo + tarjeta + Yape. Se resuelve con pagos parciales sucesivos, pero no es equivalente.
2. **Pago postergado explícito:** el check-in permite adelanto 0, pero exige un método “previsto” y no lo marca como postergado.
3. **Tablero operativo por categoría y estado:** el CRUD filtra, pero la recepción no tiene un room rack con colores.
4. **Bitácora estructurada:** no hay eventos de renovación, cambio de tarifa, cambio de habitación ni penalidad.
5. **Ingresos por turno en el cuadro de mando:** el arqueo existe, pero no se expone como comparativo de turnos en dashboard/reportes.
6. **Nacionalidad:** no se captura en `persona` ni se reporta.
7. **Pasaporte y carné de extranjería:** la validación numérica los bloquea.
8. **Consulta de identidad desde el check-in:** Factiliza se usa al alta del huésped, no dentro del flujo de recepción.
9. **Constancia de la consulta RENIEC/Factiliza:** no se guarda qué se consultó, cuándo ni qué respondió.
10. **Vínculo pago–venta:** `movimiento_caja.id_venta` existe, pero no se usa.
11. **Ajuste de tarifa y cargos por extensión:** no hay recálculo ni cargo trazable.
12. **Inmutabilidad de la auditoría:** la aplicación solo inserta, pero no hay política/trigger que impida modificar o borrar.

### P2 — Calidad, UX y alcance

1. **Alertas en tiempo real:** el dashboard refresca cada 60 segundos; no hay push ni websocket.
2. **Intercomunicador:** integración externa, fuera del sistema.
3. **QR o validación automática de Yape/Plin:** hoy solo se registra el método y un número de operación.
4. **Mapas o gráficos geográficos:** no existen.
5. **Alertas de stock bajo:** dependen de implementar inventario.
6. **Anulación o nota de crédito:** no hay flujo.
7. **Menú “Cochera” sin funcionalidad:** sigue visible sin vista.
8. **Actividad ficticia oculta en el Dashboard:** conviene eliminar el código muerto.

---

## 6. Evidencia técnica

| Tema | Archivo / referencia |
|---|---|
| Check-in con fechas y adelanto | `src/services/procesosService.js` → `registrarCheckIn` |
| Check-in exige método de pago aunque no haya adelanto | `src/views/CheckInOut.jsx` → validación de `id_metodopago` |
| Check-out asigna `DISPONIBLE` | `src/services/procesosService.js` → `registrarCheckOut` |
| Consumo exige recepción y habitación ocupada | `src/services/procesosService.js` → `registrarConsumo` |
| Consumo siempre suma a `d_asistente` | `src/services/procesosService.js` → `registrarConsumo` |
| Pago con un solo método y `id_venta: null` | `src/services/procesosService.js` → `registrarPago` |
| Arqueo por método de pago | `src/services/procesosService.js` → `obtenerArqueoCaja`, `cerrarCaja`; `src/utils/caja.js` |
| Reporte de caja sin corte por turno | `src/services/reportesService.js` → `reporteCaja` |
| Factiliza completa DNI | `src/components/CrudModule.jsx` → `consultarDatosDocumento` |
| Validación numérica del documento | `src/config/entidades.js` → `huespedes` |
| Pasaporte/carné bloqueados | `src/config/entidades.js` → `n_documento`; `backend/controllers/consultasController.js` |
| Catálogo de productos sin stock | `src/config/entidades.js` → `servicios` |
| Venta siempre vinculada a recepción | `src/config/entidades.js` → `venta`; `src/services/procesosService.js` |
| Reporte de ventas, no de inventario | `src/services/reportesService.js` → `reporteVentas` |
| Ocupación y ranking | `src/utils/dashboard.js`; `src/services/reportesService.js` → `reporteOcupacion`, `reporteVentas` |
| Sin nacionalidad | `src/config/entidades.js` → `huespedes` (no hay campo) |
| Auditoría y trazabilidad | `src/services/historialService.js`; `src/services/procesosService.js` → `auditar` |
| Roles y módulos | `src/views/Dashboard.jsx` → `MODULO_POR_VISTA`; `README.md` |
| Menú Limpieza/Cochera sin vista | `src/views/Dashboard.jsx` → `MENU_CATEGORIAS` |
| Refresco del dashboard cada 60 s | `src/views/DashboardResumen.jsx` |
| Sin cambio de habitación | No hay función ni vista; `Reservas` es `soloLectura` |

---

## 7. Cambios propuestos

### 7.1 Fase 0 — Sin migración de esquema

1. **Tablero operativo de habitaciones** con filtros por categoría, piso y estado, y colores por estado.
2. **Cambio de habitación** desde la recepción:
   - Validar disponibilidad de la habitación destino para las fechas restantes.
   - Mantener el mismo `id_recepcion` para que consumos y pagos sigan vinculados.
   - Pasar la habitación anterior a `LIMPIEZA` y la nueva a `OCUPADA`.
   - Registrar el cambio en `auditoria` con habitación anterior, nueva, usuario y fecha.
3. **Totales por turno** en el reporte de Caja o en el dashboard, usando `apertura_caja` y `movimiento_caja` ya existentes.
4. **Pago postergado explícito:** permitir check-in sin método de pago y mostrarlo como “Pago al check-out”.
5. **Reporte de recepciones** con correo, salida real (`f_salidac`) y filtro por habitación (brecha del video 2).
6. **Ajuste de roles** para separar operación de configuración.
7. **Validación condicional del documento** según `tipo_identidad`.
8. **Ocultar “Cochera”** mientras no exista.

### 7.2 Fase 1 — Con migración

#### Tiempo y estadía

- `recepcion.f_entrada_ts` y `recepcion.f_salida_programada` (`timestamptz`).
- `recepcion.tarifa_tipo` (`NOCHE` / `HORA`) y `recepcion.tarifa_monto`.
- Tabla `recepcion_extension` (`id_recepcion`, horas, monto, usuario, fecha, motivo).
- La alerta se calcula en vivo: `f_salida_programada - ahora`; **no se almacena “minutos restantes”**.
- Regla de extensión: sumar tiempo, registrar cargo y evento; recalcular el saldo.

#### Cambio de habitación

- Tabla `recepcion_habitacion_historial` (`id_recepcion`, habitación anterior, nueva, usuario, fecha, motivo, diferencia de tarifa).
- Si la nueva habitación tiene otra tarifa, registrar el ajuste como cargo trazable.

#### Ventas e inventario

- `venta.id_recepcion` nullable.
- `venta.tipo` (`HABITACION`, `LIBRE`, `INTERNO`).
- `venta.condicion_pago` (`CONTADO`, `CREDITO`) y `venta.estado_pago` (`PAGADO`, `PENDIENTE`).
- `venta.f_pago` e `id_movimiento_caja` para vincular el cobro.
- `producto.stock`, `producto.stock_minimo`.
- Tabla `inventario_movimiento` para el kárdex: entrada, salida, ajuste, motivo, usuario y fecha.
- El consumo interno descuenta stock y **no** genera movimiento de caja.
- La venta libre afecta caja y no requiere habitación.
- La venta a habitación descuenta stock y suma a la cuenta solo si queda pendiente.

#### Pagos mixtos

- Tabla `pago` (`id_pago`, `id_recepcion`, `id_venta`, total, fecha, usuario).
- Tabla `pago_detalle` (`id_pago`, `id_metodopago`, monto, número de operación, voucher).
- Validar que la suma de detalles sea igual al total.
- Generar un movimiento de caja por cada método y una sola constancia.

#### Bitácora y auditoría

- Tabla `recepcion_evento` append-only: check-in, extensión, cambio de tarifa, cambio de habitación, consumo, pago, penalidad, check-out.
- Guardar `antes` y `después` en JSON, usuario, terminal y fecha.
- Política/trigger que impida `UPDATE` y `DELETE` sobre `auditoria` y `recepcion_evento`.

#### Analítica

- `persona.nacionalidad` (ISO 3166-1 alfa-2) o `id_pais`.
- Reporte de huéspedes por nacionalidad y período.
- Reporte de ingresos por turno y comparativo entre turnos.
- Reporte de kárdex y stock bajo.

### 7.3 Reglas de negocio propuestas

| Evento | Regla |
|---|---|
| Check-in | Registrar `f_entrada_ts` y `f_salida_programada`; habitación `OCUPADA` |
| Alerta de salida | Calcular `f_salida_programada - ahora`; avisar a los 5 minutos |
| Extensión | Sumar horas, cobrar, registrar evento y recalcular saldo |
| Cambio de habitación | Mismo `id_recepcion`; validar destino; anterior `LIMPIEZA`, nueva `OCUPADA`; registrar historial |
| Venta libre | `tipo = LIBRE`; afecta caja; no requiere recepción |
| Consumo interno | `tipo = INTERNO`; descuenta stock; no afecta caja |
| Venta a habitación | `tipo = HABITACION`; descuenta stock; suma a la cuenta si queda pendiente |
| Pago mixto | Suma de métodos = total; un movimiento por método; una constancia |
| Check-out | Habitación a `LIMPIEZA` (regla del video 2); luego “Marcar como limpia” |
| Anulación | Nota de crédito con motivo, usuario y evento; no borrar el registro |

---

## 8. Plan integrado (videos 1, 2 y 3)

### Fase 0 — Correcciones de bajo riesgo (1–3 días)

1. Check-out a `LIMPIEZA` + “Marcar como limpia”.
2. Cambio de habitación con validación y auditoría.
3. Tablero operativo por categoría, piso y estado.
4. Totales por turno en Caja/dashboard.
5. Pago postergado explícito.
6. Reporte de recepciones con correo, salida real y filtro por habitación.
7. Ajuste de roles y validación de pasaporte/carné.
8. Ocultar accesos muertos.

### Fase 1 — Núcleo del video 3 (2–4 semanas)

Dos frentes que pueden ejecutarse en paralelo:

**Frente A — Tiempo y operación**
1. Timestamps de entrada y salida programada.
2. Cronómetro y alerta de 5 minutos.
3. Extensiones de 12/24 horas con cargo.
4. Historial de cambios de habitación.
5. Ajuste de tarifa con evento.

**Frente B — Ventas e inventario**
1. Venta libre.
2. Consumo interno.
3. Stock, mínimos y kárdex.
4. Pago mixto.
5. Vínculo pago–venta.
6. Reporte de inventario y stock bajo.

> **Prioridad:** si el hotel alquila por horas, el Frente A es P0. Si la tienda y el inventario son relevantes para el negocio, el Frente B es P0. Si ambos son importantes, primero el Frente A porque desbloquea la operación diaria y la alerta; el Frente B puede seguir en paralelo con un alcance acotado.

### Fase 2 — Analítica y control (1–2 semanas)

1. Ingresos por turno en dashboard y reportes.
2. Nacionalidad y reporte geográfico.
3. Bitácora estructurada por recepción.
4. Inmutabilidad de auditoría y bitácora.
5. Reporte de cuentas por cobrar.

### Fase 3 — Ciclo de reserva y portal público (2–4 semanas)

1. Estados persistidos de la reserva.
2. Correo de confirmación y verificación.
3. Cancelación y no-show.
4. Portal público y pago en línea.
5. RLS estricta y RPC/backend para operaciones sensibles.

---

## 9. Decisiones que conviene cerrar

1. ¿El hotel alquila por horas o solo por noches? **Define si P0-1 es crítico.**
2. ¿La alerta de 5 minutos debe ser visual, sonora o ambas?
3. ¿Quién autoriza un cambio de habitación y un ajuste de tarifa?
4. ¿El cambio de habitación puede cambiar la tarifa o debe mantener la original?
5. ¿Existe tienda física con stock? **Define la prioridad del Frente B.**
6. ¿El consumo interno debe descontar stock y no afectar caja? **Recomendación: sí.**
7. ¿Se necesita pago mixto en una sola transacción o basta con pagos parciales?
8. ¿Factiliza es suficiente o se exige conexión directa con RENIEC?
9. ¿Se soportarán pasaportes y carnés de extranjería? **Recomendación: sí.**
10. ¿La nacionalidad es obligatoria para los reportes de turismo?
11. ¿Se implementará kárdex completo o solo stock actual?
12. ¿La bitácora debe ser inmutable a nivel base de datos? **Recomendación: sí.**

---

## 10. Conclusión

El sistema actual **ya resuelve la caja, el arqueo, la auditoría y la reportería mejor que el video 3**. La brecha no está en el control del dinero, sino en **la operación en vivo y el control comercial**:

- sin hora de salida no hay alerta ni extensiones;
- sin cambio de habitación no hay flexibilidad operativa;
- sin venta libre ni inventario no se captura el negocio fuera de la habitación;
- sin pago mixto no se cobra como el cliente quiere;
- sin nacionalidad no se produce el reporte de turismo.

La ruta más rentable es cerrar primero la **Fase 0** (tablero, cambio de habitación, turnos, postergado y reportes) y luego decidir entre **tiempo** y **ventas/inventario** según la operación real del hotel. El video 3 no invalida lo avanzado: lo complementa con la dimensión temporal y comercial que hoy falta.
