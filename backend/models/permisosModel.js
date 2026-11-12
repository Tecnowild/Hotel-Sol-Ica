const supabase = require("../config/supabase");

const MODULOS_POR_ROL = {
    ADMINISTRADOR: null,
    GERENTE: ["CLIENTES", "RECEPCION", "HABITACIONES", "CAJA", "VENTAS", "REPORTES"],
    SUPERVISOR: ["CLIENTES", "RECEPCION", "HABITACIONES", "CAJA", "VENTAS"],
    RECEPCIONISTA: ["CLIENTES", "RECEPCION", "HABITACIONES"],
    CAJERO: ["CLIENTES", "RECEPCION", "CAJA", "VENTAS"],
    "OPERACIONES/LIMPIEZA": ["HABITACIONES"],
    "OPERACIONES Y LIMPIEZA": ["HABITACIONES"],
    CLIENTE: []
};

const normalizarRol = (nombre) =>
    String(nombre || "").trim().toUpperCase().replace(/\s*\/\s*/g, "/");

const obtenerPermisosUsuario = async (idUsuario) => {
    const { data: asignaciones, error: errorAsignaciones } = await supabase
        .from("usuario_rol")
        .select("id_rol")
        .eq("id_usuario", idUsuario)
        .eq("vigente", "1")
        .eq("estado", "1");

    if (errorAsignaciones) {
        throw errorAsignaciones;
    }

    if ((asignaciones || []).length > 1) {
        throw new Error(
            `El usuario ${idUsuario} tiene más de un rol activo. Debe conservar solo uno.`
        );
    }

    const idsRolesAsignados = [...new Set((asignaciones || []).map((fila) => fila.id_rol))];
    if (idsRolesAsignados.length === 0) {
        return { roles: [], modulos: [] };
    }

    const { data: roles, error: errorRoles } = await supabase
        .from("rol")
        .select("id_rol,n_rol")
        .in("id_rol", idsRolesAsignados)
        .eq("estado", "1");

    if (errorRoles) {
        throw errorRoles;
    }

    const rol = (roles || [])[0];
    if (!rol) {
        return { roles: [], modulos: [] };
    }

    const nombreRol = normalizarRol(rol.n_rol);
    const modulosPermitidos = MODULOS_POR_ROL[nombreRol];
    if (!modulosPermitidos) {
        if (nombreRol !== "ADMINISTRADOR") {
            return { roles: [rol.n_rol], modulos: [] };
        }
    }

    const { data: modulosActivos, errorModulos } = await supabase
        .from("modulo")
        .select("n_modulo")
        .eq("estado", "1");

    if (errorModulos) {
        throw errorModulos;
    }

    const nombresModulos = [...new Set((modulosActivos || [])
        .map((modulo) => String(modulo.n_modulo || "").trim())
        .filter(Boolean))];
    const modulos = nombreRol === "ADMINISTRADOR"
        ? nombresModulos
        : nombresModulos.filter((nombre) =>
            modulosPermitidos.includes(nombre.toUpperCase())
        );

    return {
        roles: [rol.n_rol],
        modulos
    };
};

module.exports = { MODULOS_POR_ROL, normalizarRol, obtenerPermisosUsuario };
