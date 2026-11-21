const modoAplicacion = () =>
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

let eventoInstalacion = null;
let instalada = typeof window !== "undefined" && modoAplicacion();
const suscriptores = new Set();

const notificarCambio = () => {
    suscriptores.forEach((suscriptor) => suscriptor(obtenerEstadoInstalacion()));
};

const obtenerEstadoInstalacion = () => ({
    disponible: Boolean(eventoInstalacion),
    instalada
});

if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        eventoInstalacion = event;
        notificarCambio();
    });

    window.addEventListener("appinstalled", () => {
        instalada = true;
        eventoInstalacion = null;
        notificarCambio();
    });
}

const suscribirEstadoInstalacion = (suscriptor) => {
    suscriptores.add(suscriptor);
    return () => suscriptores.delete(suscriptor);
};

const obtenerEventoInstalacion = () => eventoInstalacion;

const limpiarEventoInstalacion = () => {
    eventoInstalacion = null;
    notificarCambio();
};

export {
    limpiarEventoInstalacion,
    obtenerEstadoInstalacion,
    obtenerEventoInstalacion,
    suscribirEstadoInstalacion
};
