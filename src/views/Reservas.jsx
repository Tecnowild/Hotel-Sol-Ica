import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
    buscarDisponibilidadHabitaciones,
    listarCatalogosReserva,
    registrarReserva,
} from "../services/procesosService";
import { fecha, hoy, noches, soles, sumarDias } from "../utils/format";
import { crearEnlaceCorreoReserva } from "../utils/comprobanteReserva";

const inputClase =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

const Reservas = ({ onVerReservas }) => {
    const [fEntrada, setFEntrada] = useState(hoy());
    const [fSalida, setFSalida] = useState(sumarDias(hoy(), 1));
    const [huespedes, setHuespedes] = useState("1");
    const [resultados, setResultados] = useState(null);
    const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [pasoFormulario, setPasoFormulario] = useState("huesped");
    const [busquedaHuesped, setBusquedaHuesped] = useState("");
    const [huespedKey, setHuespedKey] = useState("");
    const [acompanantes, setAcompanantes] = useState([]);
    const [companeroKey, setCompaneroKey] = useState("");
    const [metodoPagoId, setMetodoPagoId] = useState("");
    const [tipoDocumento, setTipoDocumento] = useState("BOLETA");
    const [catalogosReserva, setCatalogosReserva] = useState(null);
    const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
    const [guardandoReserva, setGuardandoReserva] = useState(false);
    const [reservaRegistrada, setReservaRegistrada] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    const totalReserva = habitacionSeleccionada
        ? (Number(habitacionSeleccionada.precio) || 0) * noches(fEntrada, fSalida)
        : 0;
    const huespedesFiltrados = (catalogosReserva?.huespedes || []).filter((huesped) =>
        `${huesped.nombre} ${huesped.documento}`
            .toLocaleLowerCase("es")
            .includes(busquedaHuesped.trim().toLocaleLowerCase("es"))
    );
    const huespedSeleccionado = (catalogosReserva?.huespedes || []).find(
        (huesped) => huesped.key === huespedKey
    ) || null;
    const huespedesTotales = 1 + acompanantes.length;
    const cantidadHuespedesSolicitada = Number(huespedes);
    const maximoAcompanantes = Math.max(0, cantidadHuespedesSolicitada - 1);
    const acompanantesDisponibles = (catalogosReserva?.huespedes || []).filter(
        (huesped) => huesped.key !== huespedKey
            && !acompanantes.some((acompanante) => acompanante.key === huesped.key)
    );

    const formularioRef = useRef(null);
    const ultimaReservaImpresionRef = useRef(null);

    useEffect(() => {
        const idReserva = reservaRegistrada?.id_recepcion;
        if (!idReserva || ultimaReservaImpresionRef.current === idReserva) return undefined;
        ultimaReservaImpresionRef.current = idReserva;
        const temporizador = window.setTimeout(() => {
            if (typeof window.print === "function") window.print();
        }, 300);
        return () => window.clearTimeout(temporizador);
    }, [reservaRegistrada]);

    // Al abrir el formulario de nueva reserva, lleva la vista hasta él
    // para que se vea cómo se despliega la "página" del libro.
    useEffect(() => {
        if (mostrarFormulario && habitacionSeleccionada) {
            formularioRef.current?.scrollIntoView?.({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [mostrarFormulario, habitacionSeleccionada]);

    const buscar = async (e) => {
        e.preventDefault();
        setError("");
        setHabitacionSeleccionada(null);
        setMostrarFormulario(false);
        setReservaRegistrada(null);

        if (fEntrada < hoy()) {
            setError("La fecha de entrada no puede ser anterior a hoy.");
            return;
        }
        if (noches(fEntrada, fSalida) <= 0) {
            setError("La fecha de salida debe ser posterior a la fecha de entrada.");
            return;
        }
        if (!Number.isInteger(Number(huespedes)) || Number(huespedes) < 1) {
            setError("Ingresa una cantidad válida de huéspedes.");
            return;
        }

        setCargando(true);
        try {
            const disponibles = await buscarDisponibilidadHabitaciones({
                f_entrada: fEntrada,
                f_salida: fSalida,
            });
            setResultados(disponibles);
        } catch (errorBusqueda) {
            setResultados(null);
            setError(errorBusqueda.message || "No se pudo consultar la disponibilidad.");
        } finally {
            setCargando(false);
        }
    };

    const seleccionarHuesped = (event) => {
        const key = event.target.value;
        setHuespedKey(key);
        // El huésped principal no puede quedar también como acompañante.
        setAcompanantes((previos) => previos.filter((acompanante) => acompanante.key !== key));
    };

    const agregarAcompanante = () => {
        if (acompanantes.length >= maximoAcompanantes) {
            setError(`No puedes agregar más de ${maximoAcompanantes} acompañante(s) para esta reserva.`);
            return;
        }
        const huesped = (catalogosReserva?.huespedes || []).find(
            (item) => item.key === companeroKey
        );
        if (!huesped) {
            setError("Selecciona un huésped registrado para agregarlo como acompañante.");
            return;
        }
        if (huesped.key === huespedKey) {
            setError("El huésped principal no puede ser su propio acompañante.");
            return;
        }
        if (acompanantes.some((acompanante) => acompanante.key === huesped.key)) {
            setError("Ese huésped ya está registrado como acompañante.");
            return;
        }
        setAcompanantes((previos) => [...previos, huesped]);
        setCompaneroKey("");
        setError("");
    };

    const quitarAcompanante = (key) => {
        setAcompanantes((previos) => previos.filter((acompanante) => acompanante.key !== key));
    };

    const seleccionarHabitacion = async (habitacion) => {
        setHabitacionSeleccionada(habitacion);
        setReservaRegistrada(null);
        setError("");
        setMostrarFormulario(true);
        setPasoFormulario("huesped");
        setBusquedaHuesped("");
        setHuespedKey("");
        setAcompanantes([]);
        setCompaneroKey("");
        setTipoDocumento("BOLETA");

        if (catalogosReserva) return;
        setCargandoCatalogos(true);
        try {
            const catalogos = await listarCatalogosReserva();
            setCatalogosReserva(catalogos);
            setMetodoPagoId(catalogos.metodos[0] ? String(catalogos.metodos[0].id_metodopago) : "");
        } catch (errorCatalogos) {
            setError(`No se pudieron cargar los huéspedes registrados: ${errorCatalogos.message}`);
        } finally {
            setCargandoCatalogos(false);
        }
    };

    const continuarDatosHuesped = () => {
        setError("");
        if (!huespedSeleccionado) {
            setError("Selecciona un huésped registrado para la reserva.");
            return;
        }
        setPasoFormulario("reserva");
    };

    const guardarReserva = async (e) => {
        e.preventDefault();
        setError("");
        if (!huespedSeleccionado) {
            setError("Selecciona un huésped registrado para la reserva.");
            return;
        }
        if (!habitacionSeleccionada || !metodoPagoId) {
            setError("Selecciona un método de pago previsto para continuar.");
            return;
        }
        if (acompanantes.length !== maximoAcompanantes) {
            setError(
                `La reserva es para ${cantidadHuespedesSolicitada} huésped(es), incluido el principal. ` +
                `Confirma exactamente ${maximoAcompanantes} acompañante(s) antes de guardar.`
            );
            return;
        }
        if (tipoDocumento === "FACTURA" && !/^\d{11}$/.test(String(huespedSeleccionado.documento || ""))) {
            setError("Para solicitar factura, el huésped principal debe tener un RUC de 11 dígitos registrado.");
            return;
        }
        setGuardandoReserva(true);
        try {
            const reserva = await registrarReserva({
                id_cliente: huespedSeleccionado.id_cliente || null,
                tipo_cliente: "persona",
                persona: huespedSeleccionado.persona,
                acompanantes: acompanantes.map((acompanante) => ({
                    id_persona: acompanante.id_persona,
                    persona: acompanante.persona,
                })),
                id_habitacion: habitacionSeleccionada.id_habitacion,
                id_metodopago: Number(metodoPagoId),
                f_entrada: fEntrada,
                f_salida: fSalida,
                total: totalReserva,
                cantidad_huespedes: cantidadHuespedesSolicitada,
                tipo_documento: tipoDocumento,
            });
            setReservaRegistrada({
                ...reserva,
                habitacion_numero: habitacionSeleccionada.numero,
                metodo_pago_nombre: catalogosReserva.metodos.find(
                    (metodo) => String(metodo.id_metodopago) === String(metodoPagoId)
                )?.n_metodopago || "",
                estado_nombre: "Pendiente de check-in",
                noches: noches(reserva.f_entrada, reserva.f_salida),
                correo_envio: reserva.cliente_email || huespedSeleccionado.email || "",
                cliente_nombre: reserva.cliente_nombre || huespedSeleccionado.nombre,
                acompanantes: reserva.acompanantes || acompanantes.map((acompanante) => ({
                    id_persona: acompanante.id_persona,
                    nombre: acompanante.nombre,
                    documento: acompanante.documento,
                    email: acompanante.email,
                })),
            });
            setMostrarFormulario(false);
            setHabitacionSeleccionada(null);
            setResultados(null);
            setAcompanantes([]);
            setCompaneroKey("");
        } catch (errorReserva) {
            setError(errorReserva.message || "No se pudo registrar la reserva.");
        } finally {
            setGuardandoReserva(false);
        }
    };

    const descargarComprobante = () => {
        if (!reservaRegistrada) return;
        const documento = new jsPDF();
        documento.setFontSize(18);
        documento.text("HOTEL SOL ICA", 105, 18, { align: "center" });
        documento.setFontSize(13);
        documento.text("Comprobante de reserva", 105, 27, { align: "center" });
        documento.setFontSize(10);
        documento.text(`Reserva N° ${reservaRegistrada.id_recepcion}`, 14, 38);
        documento.text(`Estado: ${reservaRegistrada.estado_nombre}`, 14, 44);
        autoTable(documento, {
            startY: 52,
            head: [["Detalle", "Información"]],
            body: [
                ["Huésped principal", reservaRegistrada.cliente_nombre || "-"],
                ["Documento", reservaRegistrada.cliente_documento || "-"],
                ["Comprobante solicitado", reservaRegistrada.tipo_documento || "BOLETA"],
                ...(reservaRegistrada.acompanantes || []).map((acompanante, indice) => [
                    `Acompañante ${indice + 1}`,
                    `${acompanante.nombre}${acompanante.documento ? ` · ${acompanante.documento}` : ""}`,
                ]),
                ["Habitación", String(reservaRegistrada.habitacion_numero || "-")],
                ["Entrada", fecha(reservaRegistrada.f_entrada)],
                ["Salida", fecha(reservaRegistrada.f_salida)],
                ["Duración", `${reservaRegistrada.noches} noche(s)`],
                ["Huéspedes", String(reservaRegistrada.huespedes)],
                ["Método de pago previsto", reservaRegistrada.metodo_pago_nombre || "-"],
                ["Total reservado", soles(reservaRegistrada.d_inicial)],
                ["Adelanto registrado", soles(reservaRegistrada.adelanto)],
                ["Saldo pendiente", soles(reservaRegistrada.totaldeuda)],
            ],
            theme: "grid",
            headStyles: { fillColor: [30, 64, 175] },
            styles: { fontSize: 10, cellPadding: 3 },
        });
        const finalY = documento.lastAutoTable?.finalY || 60;
        documento.setFontSize(9);
        documento.text(
            "Este documento confirma una reserva pendiente de check-in; no es una factura, boleta ni comprobante de pago.",
            14,
            finalY + 10,
            { maxWidth: 180 }
        );
        documento.text("Hotel Sol Ica", 14, finalY + 22);
        documento.save(`reserva-${reservaRegistrada.id_recepcion}.pdf`);
    };

    const correoReservaValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(reservaRegistrada?.correo_envio || "").trim()
    );
    const enlaceCorreoReserva = reservaRegistrada && correoReservaValido
        ? crearEnlaceCorreoReserva(reservaRegistrada, reservaRegistrada.correo_envio)
        : undefined;

    const cambiarEntrada = (e) => {
        const entrada = e.target.value;
        setFEntrada(entrada);
        if (fSalida <= entrada) setFSalida(sumarDias(entrada, 1));
        setResultados(null);
        setHabitacionSeleccionada(null);
    };

    const cambiarSalida = (e) => {
        setFSalida(e.target.value);
        setResultados(null);
        setHabitacionSeleccionada(null);
    };

    const limpiarBusqueda = () => {
        setFEntrada(hoy());
        setFSalida(sumarDias(hoy(), 1));
        setHuespedes("1");
        setResultados(null);
        setHabitacionSeleccionada(null);
        setError("");
    };

    return (
        <div>
            <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="module-icon">
                        <i className="bi bi-calendar-check"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Disponibilidad de habitaciones</h2>
                        <p className="text-sm text-gray-500">
                            Consulta qué habitaciones están disponibles para las fechas de la estadía.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onVerReservas}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <i className="bi bi-list-ul mr-2"></i>
                    Ver reservas registradas
                </button>
            </header>

            {error && (
                <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <i className="bi bi-exclamation-triangle mr-2"></i>
                    {error}
                </div>
            )}

            <form onSubmit={buscar} className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block text-xs font-semibold text-slate-700">
                        Fecha de entrada *
                        <input
                            aria-label="Fecha de entrada"
                            type="date"
                            required
                            min={hoy()}
                            value={fEntrada}
                            onChange={cambiarEntrada}
                            className={`${inputClase} mt-1.5 font-normal`}
                        />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                        Fecha de salida *
                        <input
                            aria-label="Fecha de salida"
                            type="date"
                            required
                            min={sumarDias(fEntrada, 1)}
                            value={fSalida}
                            onChange={cambiarSalida}
                            className={`${inputClase} mt-1.5 font-normal`}
                        />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                        Número de huéspedes *
                        <input
                            aria-label="Número de huéspedes"
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={huespedes}
                            onChange={(e) => {
                                setHuespedes(e.target.value);
                                setResultados(null);
                                setHabitacionSeleccionada(null);
                            }}
                            className={`${inputClase} mt-1.5 font-normal`}
                        />
                    </label>
                    <div className="flex items-end gap-2">
                        <button
                            type="submit"
                            disabled={cargando}
                            className="flex-1 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                        >
                            <i className="bi bi-search mr-2"></i>
                            {cargando ? "Buscando..." : "Buscar"}
                        </button>
                        <button
                            type="button"
                            onClick={limpiarBusqueda}
                            disabled={cargando}
                            className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                        >
                            Limpiar
                        </button>
                    </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                    Estadía: {noches(fEntrada, fSalida)} noche(s). El número incluye al huésped principal que hace la reserva;
                    al continuar confirmarás los datos de cada acompañante.
                </p>
            </form>

            {habitacionSeleccionada && !mostrarFormulario && (
                <section role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <p>
                        <i className="bi bi-check-circle-fill mr-2"></i>
                        Habitación <strong>{habitacionSeleccionada.numero}</strong> seleccionada para{" "}
                        <strong>{huespedes}</strong> huésped(es), del {fecha(fEntrada)} al {fecha(fSalida)}.
                    </p>
                    <span className="font-medium">Completa los datos para registrar la reserva.</span>
                </section>
            )}

            {resultados !== null && (
                <section aria-live="polite">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h3 className="font-semibold text-slate-900">Habitaciones disponibles</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                {fecha(fEntrada)} – {fecha(fSalida)} · {huespedes} huésped(es)
                            </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                            {resultados.length} disponible(s)
                        </span>
                    </div>

                    {resultados.length === 0 ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                            <i className="bi bi-calendar-x text-3xl text-amber-600"></i>
                            <p className="mt-2 font-semibold text-amber-900">No hay habitaciones disponibles para esas fechas.</p>
                            <p className="mt-1 text-sm text-amber-800">Prueba con otras fechas o consulta otra vez más adelante.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {resultados.map((habitacion) => {
                                const seleccionada = String(habitacionSeleccionada?.id_habitacion) === String(habitacion.id_habitacion);
                                const total = (Number(habitacion.precio) || 0) * noches(fEntrada, fSalida);
                                return (
                                    <article
                                        key={habitacion.id_habitacion}
                                        className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${seleccionada ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:border-blue-200"}`}
                                    >
                                        <div className="flex h-28 items-center justify-center bg-gradient-to-br from-blue-100 via-slate-100 to-amber-50">
                                            <i className="bi bi-door-open text-5xl text-blue-700"></i>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-900">Habitación {habitacion.numero}</h4>
                                                    <p className="mt-1 text-sm text-slate-500">{habitacion.categoria_nombre || "Sin categoría"}</p>
                                                </div>
                                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                                                    Disponible
                                                </span>
                                            </div>
                                            <div className="mt-4 space-y-2 text-sm text-slate-600">
                                                {habitacion.piso_nombre && (
                                                    <p><i className="bi bi-building mr-2 text-slate-400"></i>{habitacion.piso_nombre}</p>
                                                )}
                                                {habitacion.detalle && (
                                                    <p className="line-clamp-2"><i className="bi bi-info-circle mr-2 text-slate-400"></i>{habitacion.detalle}</p>
                                                )}
                                                <p><i className="bi bi-moon mr-2 text-slate-400"></i>{noches(fEntrada, fSalida)} noche(s)</p>
                                            </div>
                                            <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4">
                                                <div>
                                                    <p className="text-xs text-slate-500">{soles(habitacion.precio)} / noche</p>
                                                    <p className="mt-0.5 text-lg font-bold text-slate-900">{soles(total)}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => seleccionarHabitacion(habitacion)}
                                                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${seleccionada ? "bg-emerald-600 text-white" : "bg-blue-700 text-white hover:bg-blue-800"}`}
                                                >
                                                    {seleccionada ? "Continuar reserva" : "Seleccionar"}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {mostrarFormulario && habitacionSeleccionada && (
                <div
                    ref={formularioRef}
                    key={habitacionSeleccionada.id_habitacion}
                    className="reserva-libro scroll-mt-24 mt-6"
                >
                    <section className="reserva-libro-pagina overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">
                                <i className="bi bi-journal-bookmark mr-2 text-blue-700"></i>
                                Nueva reserva
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                {`Habitación ${habitacionSeleccionada.numero} · ${fecha(fEntrada)} al ${fecha(fSalida)} · ${huespedesTotales} huésped(es)${acompanantes.length > 0 ? ` (1 principal + ${acompanantes.length} acompañante(s))` : ""}`}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setMostrarFormulario(false);
                                setHabitacionSeleccionada(null);
                                setError("");
                            }}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cambiar habitación
                        </button>
                    </div>

                    <div className="flex border-b border-gray-100 px-5">
                        <button
                            type="button"
                            onClick={() => setPasoFormulario("huesped")}
                            className={`border-b-2 px-4 py-3 text-sm font-semibold ${pasoFormulario === "huesped" ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500"}`}
                        >
                            1. Datos del huésped
                        </button>
                        <button
                            type="button"
                            onClick={continuarDatosHuesped}
                            className={`border-b-2 px-4 py-3 text-sm font-semibold ${pasoFormulario === "reserva" ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500"}`}
                        >
                            2. Detalles de la reserva
                        </button>
                    </div>

                    {cargandoCatalogos ? (
                        <p className="p-6 text-sm text-slate-500">Cargando huéspedes registrados y métodos de pago...</p>
                    ) : catalogosReserva && pasoFormulario === "huesped" ? (
                        <div className="p-5 sm:p-6">
                            <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                                <p className="font-semibold">
                                    <i className="bi bi-person-check mr-2"></i>
                                    Solo huéspedes registrados
                                </p>
                                <p className="mt-1 text-xs text-blue-800">
                                    Busca y selecciona un huésped ya registrado. Si el huésped no aparece,
                                    regístralo primero en el módulo <strong>Huéspedes</strong> y vuelve a esta reserva.
                                </p>
                            </div>

                            {catalogosReserva.huespedes.length === 0 ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                                    <p className="font-semibold">
                                        <i className="bi bi-exclamation-triangle mr-2"></i>
                                        No hay huéspedes registrados
                                    </p>
                                    <p className="mt-1">
                                        Registra al huésped desde el módulo <strong>Huéspedes</strong> y luego
                                        vuelve a intentar la reserva.
                                    </p>
                                </div>
                            ) : (
                                <div className="max-w-2xl">
                                    <label htmlFor="reserva-busqueda-huesped" className="block text-xs font-semibold text-slate-700">
                                        Buscar huésped por nombre o DNI
                                    </label>
                                    <input
                                        id="reserva-busqueda-huesped"
                                        type="search"
                                        value={busquedaHuesped}
                                        onChange={(e) => setBusquedaHuesped(e.target.value)}
                                        placeholder="Escribe nombre o documento..."
                                        className={`${inputClase} mt-1.5 font-normal`}
                                    />
                                    <label htmlFor="reserva-huesped-registrado" className="mt-3 block text-xs font-semibold text-slate-700">
                                        Huésped registrado *
                                    </label>
                                    <select
                                        id="reserva-huesped-registrado"
                                        aria-label="Huésped registrado"
                                        value={huespedKey}
                                        onChange={seleccionarHuesped}
                                        className={`${inputClase} mt-1.5 font-normal`}
                                    >
                                        <option value="">-- Seleccione --</option>
                                        {huespedesFiltrados.map((huesped) => (
                                            <option key={huesped.key} value={huesped.key}>
                                                {huesped.nombre} · {huesped.documento || "Sin documento"}
                                            </option>
                                        ))}
                                    </select>
                                    {huespedesFiltrados.length === 0 && (
                                        <p className="mt-2 text-xs text-amber-700">No hay huéspedes que coincidan con la búsqueda.</p>
                                    )}
                                    {huespedSeleccionado && (
                                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                            <p className="font-semibold">
                                                <i className="bi bi-person-check-fill mr-2"></i>
                                                {huespedSeleccionado.nombre}
                                            </p>
                                            <p className="mt-1 text-xs">
                                                Persona · Documento: {huespedSeleccionado.documento || "—"}
                                                {huespedSeleccionado.email ? ` · ${huespedSeleccionado.email}` : ""}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 flex justify-end">
                                <button
                                    type="button"
                                    onClick={continuarDatosHuesped}
                                    disabled={cargandoCatalogos || !huespedSeleccionado || catalogosReserva.huespedes.length === 0}
                                    className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                                >
                                    Siguiente: detalles de reserva
                                    <i className="bi bi-arrow-right ml-2"></i>
                                </button>
                            </div>
                        </div>
                    ) : catalogosReserva ? (
                        <form onSubmit={guardarReserva} className="p-5 sm:p-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                                    <p className="text-xs text-slate-500">Huésped principal</p>
                                    <p className="mt-1 font-semibold text-slate-900">
                                        {huespedSeleccionado?.nombre || "—"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {huespedSeleccionado?.documento || "Sin documento"}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                                    <p className="text-xs text-slate-500">Habitación</p>
                                    <p className="mt-1 font-semibold text-slate-900">
                                        {habitacionSeleccionada.numero} · {habitacionSeleccionada.categoria_nombre}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                                    <p className="text-xs text-slate-500">Fechas y duración</p>
                                    <p className="mt-1 font-semibold text-slate-900">
                                        {fecha(fEntrada)} – {fecha(fSalida)} · {noches(fEntrada, fSalida)} noche(s)
                                    </p>
                                </div>
                                <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
                                    <p className="text-xs text-blue-700">Total estimado</p>
                                    <p className="mt-1 text-lg font-bold">{soles(totalReserva)}</p>
                                    <p className="text-xs">{soles(habitacionSeleccionada.precio)} por noche</p>
                                </div>
                            </div>
                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-900">
                                            <i className="bi bi-people-fill mr-2 text-blue-700"></i>
                                            Acompañantes
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-600">
                                            Registra a las demás personas que se hospedarán en la habitación. El huésped principal ya cuenta en el total.
                                            Deben existir en el módulo <strong>Huéspedes</strong>.
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                                        {huespedesTotales} de {cantidadHuespedesSolicitada} huésped(es)
                                    </span>
                                </div>

                                {acompanantes.length > 0 ? (
                                    <ul className="mt-3 space-y-2">
                                        {acompanantes.map((acompanante) => (
                                            <li
                                                key={acompanante.key}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                            >
                                                <span className="text-slate-800">
                                                    <i className="bi bi-person-fill mr-2 text-slate-400"></i>
                                                    <strong className="font-semibold">{acompanante.nombre}</strong>
                                                    <span className="text-slate-500">
                                                        {" "}· {acompanante.documento || "Sin documento"}
                                                    </span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => quitarAcompanante(acompanante.key)}
                                                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                                                >
                                                    <i className="bi bi-x-lg mr-1"></i>
                                                    Quitar
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500">
                                        El huésped viaja solo. Si la habitación es para más de una persona,
                                        agrega a los acompañantes aquí.
                                    </p>
                                )}

                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                                    <label className="block flex-1 text-xs font-semibold text-slate-700">
                                        Huésped registrado para agregar
                                        <select
                                            aria-label="Acompañante registrado"
                                            value={companeroKey}
                                            onChange={(e) => setCompaneroKey(e.target.value)}
                                            disabled={acompanantesDisponibles.length === 0 || acompanantes.length >= maximoAcompanantes}
                                            className={`${inputClase} mt-1.5 font-normal`}
                                        >
                                            <option value="">-- Seleccione --</option>
                                            {acompanantesDisponibles.map((huesped) => (
                                                <option key={huesped.key} value={huesped.key}>
                                                    {huesped.nombre} · {huesped.documento || "Sin documento"}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={agregarAcompanante}
                                        disabled={!companeroKey || acompanantesDisponibles.length === 0 || acompanantes.length >= maximoAcompanantes}
                                        className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                                    >
                                        <i className="bi bi-person-plus mr-2"></i>
                                        Agregar acompañante
                                    </button>
                                </div>
                                {acompanantes.length < maximoAcompanantes && (
                                    <p className="mt-2 text-xs text-amber-700">
                                        Falta confirmar {maximoAcompanantes - acompanantes.length} acompañante(s) para completar el total solicitado.
                                    </p>
                                )}
                                {acompanantes.length > maximoAcompanantes && (
                                    <p role="alert" className="mt-2 text-xs text-red-700">
                                        Quitando {acompanantes.length - maximoAcompanantes} acompañante(s) podrás guardar la cantidad solicitada.
                                    </p>
                                )}
                                {acompanantesDisponibles.length === 0 && (
                                    <p className="mt-2 text-xs text-amber-700">
                                        No hay más huéspedes disponibles para agregar. Registra a la persona
                                        en el módulo <strong>Huéspedes</strong> si aún no existe.
                                    </p>
                                )}
                            </div>
                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                <label className="block text-xs font-semibold text-slate-700">
                                    Método de pago previsto *
                                    <select
                                        aria-label="Método de pago previsto"
                                        required
                                        value={metodoPagoId}
                                        onChange={(e) => setMetodoPagoId(e.target.value)}
                                        className={`${inputClase} mt-1.5 font-normal`}
                                    >
                                        <option value="">-- Seleccione --</option>
                                        {catalogosReserva.metodos.map((metodo) => (
                                            <option key={metodo.id_metodopago} value={metodo.id_metodopago}>
                                                {metodo.n_metodopago}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block text-xs font-semibold text-slate-700">
                                    Comprobante solicitado *
                                    <select
                                        aria-label="Comprobante solicitado"
                                        required
                                        value={tipoDocumento}
                                        onChange={(e) => setTipoDocumento(e.target.value)}
                                        className={`${inputClase} mt-1.5 font-normal`}
                                    >
                                        <option value="BOLETA">Boleta</option>
                                        <option value="FACTURA">Factura</option>
                                    </select>
                                    <span className="mt-1 block font-normal text-slate-500">
                                        Se registrará para emitirlo al completar la estadía. Para factura se requiere RUC de 11 dígitos.
                                    </span>
                                </label>
                                {catalogosReserva.metodos.length === 0 && (
                                    <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">
                                        No hay métodos de pago activos. La reserva necesita un método previsto según la estructura actual; solicita al administrador que configure el catálogo.
                                    </p>
                                )}
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">
                                    La reserva no registra un cobro ni un adelanto en este paso. Se guardará el
                                    huésped principal junto con los acompañantes seleccionados, para saber
                                        quiénes se hospedan. El comprobante seleccionado no se emite aquí: la constancia de reserva
                                        no reemplaza una boleta ni una factura.
                                    </div>
                            </div>
                            <div className="mt-6 flex flex-wrap justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setPasoFormulario("huesped"); setError(""); }}
                                    className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                                >
                                    <i className="bi bi-arrow-left mr-2"></i>
                                    Volver a elegir huésped
                                </button>
                                <button
                                    type="submit"
                                    disabled={guardandoReserva || !metodoPagoId || acompanantes.length !== maximoAcompanantes}
                                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    <i className="bi bi-calendar-check mr-2"></i>
                                    {guardandoReserva ? "Registrando..." : "Guardar reserva"}
                                </button>
                            </div>
                        </form>
                    ) : null}
                    </section>
                </div>
            )}

            {reservaRegistrada && (
                <section
                    id="reserva-comprobante-imprimir"
                    role="status"
                    className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"
                >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h3 className="font-semibold">
                                <i className="bi bi-check-circle-fill mr-2 text-emerald-600"></i>
                                Reserva registrada correctamente
                            </h3>
                            <div className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                                <p>Número: <strong>#{reservaRegistrada.id_recepcion}</strong></p>
                                <p>Huésped principal: <strong>{reservaRegistrada.cliente_nombre}</strong></p>
                                <p>Documento: <strong>{reservaRegistrada.cliente_documento || "—"}</strong></p>
                                <p>Habitación: <strong>{reservaRegistrada.habitacion_numero}</strong></p>
                                <p>
                                    Estadía: <strong>{fecha(reservaRegistrada.f_entrada)} – {fecha(reservaRegistrada.f_salida)} · {reservaRegistrada.noches} noche(s)</strong>
                                </p>
                                <p>Huéspedes: <strong>{reservaRegistrada.huespedes}</strong></p>
                                <p className="sm:col-span-2">
                                    Acompañantes:{" "}
                                    <strong>
                                        {reservaRegistrada.acompanantes?.length
                                            ? reservaRegistrada.acompanantes
                                                .map((acompanante) => acompanante.nombre)
                                                .join(", ")
                                            : "Ninguno (viaja solo)"}
                                    </strong>
                                </p>
                                <p>Total reservado: <strong>{soles(reservaRegistrada.d_inicial)}</strong></p>
                                <p>Método previsto: <strong>{reservaRegistrada.metodo_pago_nombre || "—"}</strong></p>
                                <p>Comprobante solicitado: <strong>{reservaRegistrada.tipo_documento || "BOLETA"}</strong></p>
                                <p>Estado: <strong>{reservaRegistrada.estado_nombre}</strong></p>
                            </div>
                        </div>
                        <div className="reserva-solo-pantalla flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                            >
                                <i className="bi bi-printer mr-2"></i>
                                Imprimir constancia
                            </button>
                            <button
                                type="button"
                                onClick={descargarComprobante}
                                className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                                <i className="bi bi-file-earmark-pdf mr-2"></i>
                                Descargar comprobante PDF
                            </button>
                            {onVerReservas && (
                                <button
                                    type="button"
                                    onClick={onVerReservas}
                                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                                >
                                    Ver reservas
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setReservaRegistrada(null);
                                    setError("");
                                }}
                                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                            >
                                Nueva búsqueda
                            </button>
                        </div>
                    </div>
                    <div className="reserva-solo-pantalla mt-5 border-t border-emerald-200 pt-4">
                        <label className="block max-w-lg text-sm font-semibold text-emerald-950">
                            Correo del destinatario
                            <input
                                type="email"
                                value={reservaRegistrada.correo_envio || ""}
                                onChange={(event) => setReservaRegistrada((reserva) => ({
                                    ...reserva,
                                    correo_envio: event.target.value,
                                }))}
                                placeholder="huésped@correo.com"
                                className={`${inputClase} mt-1.5`}
                            />
                        </label>
                        <a
                            href={enlaceCorreoReserva}
                            aria-disabled={!correoReservaValido}
                            onClick={(event) => {
                                if (!correoReservaValido) event.preventDefault();
                            }}
                            className={`mt-3 inline-flex rounded-xl px-4 py-2 text-sm font-semibold ${
                                correoReservaValido
                                    ? "bg-white text-emerald-800 hover:bg-emerald-100"
                                    : "cursor-not-allowed bg-emerald-100 text-emerald-500"
                            }`}
                        >
                            <i className="bi bi-envelope mr-2"></i>
                            Preparar correo
                        </a>
                        <p className="mt-2 text-xs text-emerald-800">
                            Se abrirá un borrador en tu aplicación de correo con el resumen. Descarga el PDF y adjúntalo manualmente;
                            el sistema no envía correos ni guarda este destinatario. La constancia de reserva tampoco es una factura,
                            boleta ni comprobante de pago.
                        </p>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Reservas;
