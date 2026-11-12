import { API_URL } from "../config/api";
import { obtenerSesion } from "./authSession";

const solicitar = async (ruta, opciones = {}) => {
    const sesion = obtenerSesion();
    if (!sesion?.token) {
        throw new Error("La sesión expiró. Inicia sesión nuevamente.");
    }

    let response;
    try {
        response = await fetch(`${API_URL}/admin/usuarios${ruta}`, {
            ...opciones,
            headers: {
                Authorization: `Bearer ${sesion.token}`,
                ...(opciones.body ? { "Content-Type": "application/json" } : {}),
                ...opciones.headers
            }
        });
    } catch (error) {
        console.error("No se pudo conectar con la gestión de usuarios:", error);
        throw new Error("No se pudo conectar con el servidor de gestión de usuarios.");
    }

    let resultado;
    try {
        resultado = await response.json();
    } catch {
        throw new Error("El servidor devolvió una respuesta inválida al gestionar usuarios.");
    }

    if (!response.ok || !resultado?.success) {
        throw new Error(resultado?.message || "No se pudo completar la operación de usuarios.");
    }
    return resultado;
};

export const listarUsuariosAdmin = (parametros) => {
    const query = new URLSearchParams({
        pagina: String(parametros.pagina || 1),
        pageSize: String(parametros.pageSize || 25),
        busqueda: String(parametros.busqueda || "")
    });
    return solicitar(`?${query.toString()}`);
};

export const obtenerOpcionesUsuariosAdmin = () => solicitar("/opciones");

export const crearUsuarioAdmin = (datos) => solicitar("", {
    method: "POST",
    body: JSON.stringify(datos)
});

export const actualizarUsuarioAdmin = (id, datos) => solicitar(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(datos)
});

export const darDeBajaUsuarioAdmin = (id) => solicitar(`/${id}`, {
    method: "DELETE"
});
