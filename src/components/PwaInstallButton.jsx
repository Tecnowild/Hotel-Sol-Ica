import { useEffect, useState } from "react";
import {
    limpiarEventoInstalacion,
    obtenerEstadoInstalacion,
    obtenerEventoInstalacion,
    suscribirEstadoInstalacion
} from "../services/pwaInstall";

const PwaInstallButton = () => {
    const [installState, setInstallState] = useState(obtenerEstadoInstalacion);
    const [showInstructions, setShowInstructions] = useState(false);
    const [installMessage, setInstallMessage] = useState("");

    useEffect(() => {
        return suscribirEstadoInstalacion((estado) => {
            setInstallState(estado);
            if (estado.disponible) {
                setShowInstructions(false);
                setInstallMessage("");
            }
        });
    }, []);

    const handleInstall = async () => {
        setInstallMessage("");

        const installPrompt = obtenerEventoInstalacion();
        if (!installPrompt) {
            setShowInstructions(true);
            return;
        }

        try {
            await installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            setInstallMessage(
                outcome === "accepted"
                    ? "Instalación aceptada. Cuando termine, abre Hotel Sol Ica desde Inicio o Aplicaciones."
                    : "Instalación cancelada. Puedes volver a intentarlo desde el menú del navegador."
            );
        } catch (error) {
            console.error("No se pudo iniciar la instalación de la PWA:", error);
            setInstallMessage(
                "No se pudo iniciar la instalación. Usa el menú del navegador para instalar la aplicación."
            );
        } finally {
            limpiarEventoInstalacion();
        }
    };

    if (installState.instalada) {
        return (
            <p
                role="status"
                title="Para abrirla después, búscala en Inicio o en el menú de Aplicaciones."
                aria-label="Aplicación instalada. Ábrela desde Inicio o Aplicaciones."
                className="whitespace-nowrap rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-800"
            >
                Aplicación instalada
            </p>
        );
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={handleInstall}
                aria-label="Instalar aplicación"
                className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2
                    text-xs
                    font-semibold
                    text-slate-800
                    transition-colors
                    hover:bg-slate-50
                    focus-visible:outline
                    focus-visible:outline-2
                    focus-visible:outline-offset-2
                    focus-visible:outline-blue-800
                "
            >
                <i className="bi bi-window-plus" aria-hidden="true"></i>
                <span className="hidden sm:inline">Instalar aplicación</span>
                <span className="sm:hidden">Instalar</span>
            </button>

            {showInstructions && (
                <p
                    role="status"
                    className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-gray-600 shadow-lg"
                >
                    En Chrome o Edge, elige “Instalar Hotel Sol Ica” en el icono de
                    instalación o en el menú ⋮. En Safari para macOS, usa Archivo
                    &gt; Añadir al Dock. Luego abre la aplicación desde Inicio,
                    Aplicaciones o el Dock.
                </p>
            )}

            {installMessage && (
                <p
                    role="status"
                    className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-gray-600 shadow-lg"
                >
                    {installMessage}
                </p>
            )}
        </div>
    );
};

export default PwaInstallButton;
