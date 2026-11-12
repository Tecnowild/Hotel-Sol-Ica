const { obtenerSupabaseAdmin } = require("../config/supabaseAdmin");
const { hashearClave } = require("../utils/password");
const { normalizarRol } = require("../models/permisosModel");

const AUDITORIA = { usuario: "WEB", pc: "PC-WEB" };
const MAX_ADMINISTRADORES = 3;
const ROLES_INTERNOS = new Set([
    "ADMINISTRADOR",
    "GERENTE",
    "RECEPCIONISTA",
    "CAJERO",
    "SUPERVISOR",
    "OPERACIONES/LIMPIEZA",
    "OPERACIONES Y LIMPIEZA"
]);

const errorBaseDatos = (error) => {
    if (error.code === "23505") {
        const duplicado = new Error("Ya existe un usuario con ese nombre de acceso.");
        duplicado.status = 409;
        return duplicado;
    }
    if (error.code === "23503") {
        const referencia = new Error("El empleado, tipo de usuario o rol seleccionado ya no existe.");
        referencia.status = 400;
        return referencia;
    }
    if (error.code === "23514" || error.code === "P0001") {
        const conflicto = new Error(error.message);
        conflicto.status = 409;
        return conflicto;
    }

    const resultado = new Error(error.message || "No se pudo completar la operación de usuarios.");
    resultado.status = error.status || 500;
    return resultado;
};

const asegurarResultado = (error) => {
    if (error) throw errorBaseDatos(error);
};

const fechaAuditoria = () => new Date().toISOString();

const normalizarId = (valor, campo) => {
    const id = Number(valor);
    if (!Number.isSafeInteger(id) || id < 1) {
        const error = new Error(`Selecciona un valor válido para ${campo}.`);
        error.status = 400;
        throw error;
    }
    return id;
};

const validarDatos = (datos, esNuevo) => {
    const logeo = String(datos.logeo || "").trim();
    const clave = String(datos.clave || "");

    if (logeo.length < 3 || logeo.length > 50 || /[\u0000-\u001f]/.test(logeo)) {
        const error = new Error("El usuario debe tener entre 3 y 50 caracteres.");
        error.status = 400;
        throw error;
    }
    if ((esNuevo || clave) && (clave.length < 10 || clave.length > 128)) {
        const error = new Error("La contraseña debe tener entre 10 y 128 caracteres.");
        error.status = 400;
        throw error;
    }
    if (!esNuevo && clave && clave.length < 10) {
        const error = new Error("La nueva contraseña debe tener al menos 10 caracteres.");
        error.status = 400;
        throw error;
    }

    return {
        logeo,
        clave,
        id_tipousuario: normalizarId(datos.id_tipousuario, "tipo de usuario"),
        id_empleado: normalizarId(datos.id_empleado, "empleado"),
        id_rol: normalizarId(datos.id_rol, "rol")
    };
};

const obtenerRolActivo = async (supabase, idRol) => {
    const { data, error } = await supabase
        .from("rol")
        .select("id_rol,n_rol")
        .eq("id_rol", idRol)
        .eq("estado", "1")
        .maybeSingle();
    asegurarResultado(error);
    if (!data) {
        const invalido = new Error("El rol seleccionado no está activo.");
        invalido.status = 400;
        throw invalido;
    }
    if (!ROLES_INTERNOS.has(normalizarRol(data.n_rol))) {
        const invalido = new Error(
            "El rol seleccionado no forma parte de los roles habilitados para el personal."
        );
        invalido.status = 400;
        throw invalido;
    }
    return data;
};

const contarAdministradoresActivos = async (supabase, excluirId) => {
    const { data: rolAdmin, error: errorRol } = await supabase
        .from("rol")
        .select("id_rol")
        .eq("estado", "1")
        .ilike("n_rol", "ADMINISTRADOR")
        .maybeSingle();
    asegurarResultado(errorRol);
    if (!rolAdmin) return 0;

    const { data: asignaciones, error: errorAsignaciones } = await supabase
        .from("usuario_rol")
        .select("id_usuario")
        .eq("id_rol", rolAdmin.id_rol)
        .eq("vigente", "1")
        .eq("estado", "1");
    asegurarResultado(errorAsignaciones);

    const ids = [...new Set((asignaciones || [])
        .map((fila) => Number(fila.id_usuario))
        .filter((id) => id !== Number(excluirId)))];
    if (!ids.length) return 0;

    const { data: usuarios, error: errorUsuarios } = await supabase
        .from("usuario")
        .select("id_usuario")
        .in("id_usuario", ids)
        .eq("estado", "1");
    asegurarResultado(errorUsuarios);
    return (usuarios || []).length;
};

const validarReferencias = async (supabase, datos) => {
    const [tipo, empleado] = await Promise.all([
        supabase.from("tipo_usuario")
            .select("id_tipousuario")
            .eq("id_tipousuario", datos.id_tipousuario)
            .eq("estado", "1")
            .maybeSingle(),
        supabase.from("empleado")
            .select("id_empleado")
            .eq("id_empleado", datos.id_empleado)
            .eq("estado", "1")
            .maybeSingle()
    ]);
    asegurarResultado(tipo.error);
    asegurarResultado(empleado.error);
    if (!tipo.data || !empleado.data) {
        const error = new Error("Selecciona un tipo de usuario y un empleado activos.");
        error.status = 400;
        throw error;
    }
};

const obtenerOpciones = async () => {
    const supabase = obtenerSupabaseAdmin();
    const [tipos, empleados, roles] = await Promise.all([
        supabase.from("tipo_usuario")
            .select("id_tipousuario,n_tipousuario")
            .eq("estado", "1")
            .order("n_tipousuario"),
        supabase.from("empleado")
            .select("id_empleado,id_persona")
            .eq("estado", "1")
            .order("id_empleado"),
        supabase.from("rol")
            .select("id_rol,n_rol")
            .eq("estado", "1")
            .order("n_rol")
    ]);
    asegurarResultado(tipos.error);
    asegurarResultado(empleados.error);
    asegurarResultado(roles.error);

    const personasPorId = new Map();
    const idsPersonas = [...new Set((empleados.data || [])
        .map((empleado) => empleado.id_persona)
        .filter((id) => id != null))];
    if (idsPersonas.length) {
        const { data: personas, error } = await supabase
            .from("persona")
            .select("id_persona,nombre,ap_paterno,ap_materno")
            .in("id_persona", idsPersonas);
        asegurarResultado(error);
        (personas || []).forEach((persona) => personasPorId.set(persona.id_persona, persona));
    }

    const tiposInternos = (tipos.data || []).filter(
        (tipo) => !String(tipo.n_tipousuario || "").toUpperCase().includes("CLIENTE")
    );
    const rolesInternos = (roles.data || []).filter(
        (rol) => ROLES_INTERNOS.has(normalizarRol(rol.n_rol))
    );

    return {
        tipos: tiposInternos,
        empleados: (empleados.data || []).map((empleado) => {
            const persona = personasPorId.get(empleado.id_persona);
            const nombre = persona
                ? [persona.nombre, persona.ap_paterno, persona.ap_materno]
                    .filter(Boolean)
                    .join(" ")
                : `Empleado #${empleado.id_empleado}`;
            return { id_empleado: empleado.id_empleado, nombre };
        }),
        roles: rolesInternos
    };
};

const obtenerAsignacionesActivas = async (supabase, idUsuario) => {
    const { data, error } = await supabase
        .from("usuario_rol")
        .select("id_usuariorol,id_rol")
        .eq("id_usuario", idUsuario)
        .eq("vigente", "1")
        .eq("estado", "1");
    asegurarResultado(error);
    return data || [];
};

const crearAsignacion = async (supabase, idUsuario, idRol) => {
    const fecha = fechaAuditoria();
    const { error } = await supabase.from("usuario_rol").insert([{
        id_usuario: idUsuario,
        id_rol: idRol,
        f_asignacion: fecha.slice(0, 10),
        vigente: "1",
        estado: "1",
        usucre: AUDITORIA.usuario,
        pccre: AUDITORIA.pc,
        feccre: fecha
    }]);
    asegurarResultado(error);
};

const listarUsuarios = async ({ pagina = 1, pageSize = 25, busqueda = "" } = {}) => {
    const supabase = obtenerSupabaseAdmin();
    const numeroPagina = Math.max(1, Math.floor(Number(pagina) || 1));
    const tamanoPagina = Math.min(100, Math.max(1, Math.floor(Number(pageSize) || 25)));
    const desde = (numeroPagina - 1) * tamanoPagina;
    const termino = String(busqueda || "").trim().replace(/[%_,()]/g, " ").trim();

    let consulta = supabase
        .from("usuario")
        .select("id_usuario,id_tipousuario,id_empleado,logeo,estado", { count: "exact" })
        .eq("estado", "1");
    if (termino) consulta = consulta.ilike("logeo", `%${termino}%`);

    const { data, error, count } = await consulta
        .order("id_usuario", { ascending: true })
        .range(desde, desde + tamanoPagina - 1);
    asegurarResultado(error);

    const usuarios = data || [];
    const ids = usuarios.map((usuario) => usuario.id_usuario);
    let asignaciones = [];
    let idRolAdmin = null;
    if (ids.length) {
        const [consultaAsignaciones, consultaAdmin] = await Promise.all([
            supabase
                .from("usuario_rol")
                .select("id_usuario,id_rol")
                .in("id_usuario", ids)
                .eq("vigente", "1")
                .eq("estado", "1"),
            supabase
                .from("rol")
                .select("id_rol")
                .eq("estado", "1")
                .ilike("n_rol", "ADMINISTRADOR")
                .maybeSingle()
        ]);
        asegurarResultado(consultaAsignaciones.error);
        asegurarResultado(consultaAdmin.error);
        asignaciones = consultaAsignaciones.data || [];
        idRolAdmin = consultaAdmin.data?.id_rol ?? null;
    }

    return {
        data: usuarios.map((usuario) => {
            const asignacionesUsuario = asignaciones.filter(
                (asignacion) => String(asignacion.id_usuario) === String(usuario.id_usuario)
            );
            const rolAdministrador = asignacionesUsuario.find(
                (asignacion) => String(asignacion.id_rol) === String(idRolAdmin)
            );
            return {
                ...usuario,
                id_rol: (rolAdministrador || asignacionesUsuario[0])?.id_rol ?? null,
                tieneRolesDuplicados: asignacionesUsuario.length > 1
            };
        }),
        total: count || 0,
        pagina: numeroPagina,
        totalPaginas: Math.max(1, Math.ceil((count || 0) / tamanoPagina))
    };
};

const crearUsuario = async (entrada) => {
    const supabase = obtenerSupabaseAdmin();
    const datos = validarDatos(entrada, true);
    await validarReferencias(supabase, datos);
    const rol = await obtenerRolActivo(supabase, datos.id_rol);
    if (String(rol.n_rol).trim().toUpperCase() === "ADMINISTRADOR") {
        const cantidad = await contarAdministradoresActivos(supabase);
        if (cantidad >= MAX_ADMINISTRADORES) {
            const error = new Error("Ya se alcanzó el máximo de 3 administradores activos.");
            error.status = 409;
            throw error;
        }
    }

    const ahora = fechaAuditoria();
    const { data: usuario, error } = await supabase
        .from("usuario")
        .insert([{
            id_tipousuario: datos.id_tipousuario,
            id_empleado: datos.id_empleado,
            logeo: datos.logeo,
            clave: "",
            usucre: AUDITORIA.usuario,
            pccre: AUDITORIA.pc,
            feccre: ahora,
            estado: "1"
        }])
        .select("id_usuario")
        .single();
    asegurarResultado(error);

    try {
        const { error: errorCredencial } = await supabase
            .from("usuario_credencial")
            .insert([{
                id_usuario: usuario.id_usuario,
                clave_hash: await hashearClave(datos.clave)
            }]);
        asegurarResultado(errorCredencial);
        await crearAsignacion(supabase, usuario.id_usuario, datos.id_rol);
    } catch (errorAsignacion) {
        const { error: errorBaja } = await supabase
            .from("usuario")
            .update({
                estado: "0",
                usumod: AUDITORIA.usuario,
                pcmod: AUDITORIA.pc,
                fecmod: fechaAuditoria()
            })
            .eq("id_usuario", usuario.id_usuario);
        if (errorBaja) {
            throw new Error(
                `No se asignó el rol y tampoco se pudo dar de baja el usuario creado: ${errorBaja.message}`
            );
        }
        throw errorAsignacion;
    }
};

const actualizarUsuario = async (idEntrada, entrada) => {
    const supabase = obtenerSupabaseAdmin();
    const idUsuario = normalizarId(idEntrada, "usuario");
    const { data: usuarioExistente, error: errorUsuario } = await supabase
        .from("usuario")
        .select("id_usuario")
        .eq("id_usuario", idUsuario)
        .eq("estado", "1")
        .maybeSingle();
    asegurarResultado(errorUsuario);
    if (!usuarioExistente) {
        const noEncontrado = new Error("No se encontró el usuario activo que quieres editar.");
        noEncontrado.status = 404;
        throw noEncontrado;
    }

    const datos = validarDatos(entrada, false);
    await validarReferencias(supabase, datos);
    const rol = await obtenerRolActivo(supabase, datos.id_rol);
    const asignaciones = await obtenerAsignacionesActivas(supabase, idUsuario);

    if (String(rol.n_rol).trim().toUpperCase() === "ADMINISTRADOR") {
        const cantidad = await contarAdministradoresActivos(supabase, idUsuario);
        if (cantidad >= MAX_ADMINISTRADORES) {
            const error = new Error("Ya se alcanzó el máximo de 3 administradores activos.");
            error.status = 409;
            throw error;
        }
    }

    const actualizacion = {
        id_tipousuario: datos.id_tipousuario,
        id_empleado: datos.id_empleado,
        logeo: datos.logeo,
        usumod: AUDITORIA.usuario,
        pcmod: AUDITORIA.pc,
        fecmod: fechaAuditoria()
    };
    const { error } = await supabase
        .from("usuario")
        .update(actualizacion)
        .eq("id_usuario", idUsuario)
        .eq("estado", "1");
    asegurarResultado(error);

    if (datos.clave) {
        const { error: errorCredencial } = await supabase
            .from("usuario_credencial")
            .upsert({
                id_usuario: idUsuario,
                clave_hash: await hashearClave(datos.clave)
            }, { onConflict: "id_usuario" });
        asegurarResultado(errorCredencial);

        const { error: errorClaveAnterior } = await supabase
            .from("usuario")
            .update({ clave: "" })
            .eq("id_usuario", idUsuario);
        asegurarResultado(errorClaveAnterior);
    }

    if (asignaciones.length) {
        const asignacionElegida = asignaciones.find(
            (asignacion) => String(asignacion.id_rol) === String(datos.id_rol)
        ) || asignaciones[0];
        const otrasAsignaciones = asignaciones.filter(
            (asignacion) => asignacion.id_usuariorol !== asignacionElegida.id_usuariorol
        );

        for (const asignacion of otrasAsignaciones) {
            const { error: errorDesactivacion } = await supabase
                .from("usuario_rol")
                .update({
                    vigente: "0",
                    estado: "0",
                    usumod: AUDITORIA.usuario,
                    pcmod: AUDITORIA.pc,
                    fecmod: fechaAuditoria()
                })
                .eq("id_usuariorol", asignacion.id_usuariorol);
            asegurarResultado(errorDesactivacion);
        }

        const { error: errorRol } = await supabase
            .from("usuario_rol")
            .update({
                id_rol: datos.id_rol,
                usumod: AUDITORIA.usuario,
                pcmod: AUDITORIA.pc,
                fecmod: fechaAuditoria()
            })
            .eq("id_usuariorol", asignacionElegida.id_usuariorol);
        asegurarResultado(errorRol);
    } else {
        await crearAsignacion(supabase, idUsuario, datos.id_rol);
    }
};

const darDeBajaUsuario = async (idEntrada, idAdministradorActual) => {
    const supabase = obtenerSupabaseAdmin();
    const idUsuario = normalizarId(idEntrada, "usuario");
    if (idUsuario === Number(idAdministradorActual)) {
        const error = new Error("No puedes dar de baja tu propia cuenta.");
        error.status = 409;
        throw error;
    }

    const asignaciones = await obtenerAsignacionesActivas(supabase, idUsuario);
    const rolAdmin = await supabase
        .from("rol")
        .select("id_rol")
        .eq("estado", "1")
        .ilike("n_rol", "ADMINISTRADOR")
        .maybeSingle();
    asegurarResultado(rolAdmin.error);
    const objetivoEsAdmin = Boolean(
        rolAdmin.data && asignaciones.some(
            (asignacion) => asignacion.id_rol === rolAdmin.data.id_rol
        )
    );
    if (objetivoEsAdmin) {
        const cantidad = await contarAdministradoresActivos(supabase);
        if (cantidad <= 1) {
            const error = new Error("No se puede dar de baja al último administrador activo.");
            error.status = 409;
            throw error;
        }
    }

    const ahora = fechaAuditoria();
    const desactivadas = [];
    for (const asignacion of asignaciones) {
        const { error } = await supabase
            .from("usuario_rol")
            .update({
                vigente: "0",
                estado: "0",
                usumod: AUDITORIA.usuario,
                pcmod: AUDITORIA.pc,
                fecmod: ahora
            })
            .eq("id_usuariorol", asignacion.id_usuariorol);
        asegurarResultado(error);
        desactivadas.push(asignacion);
    }

    const { error } = await supabase
        .from("usuario")
        .update({
            estado: "0",
            usumod: AUDITORIA.usuario,
            pcmod: AUDITORIA.pc,
            fecmod: ahora
        })
        .eq("id_usuario", idUsuario)
        .eq("estado", "1");
    if (error) {
        const erroresRestauracion = [];
        for (const asignacion of desactivadas) {
            const { error: errorRestauracion } = await supabase
                .from("usuario_rol")
                .update({
                    vigente: "1",
                    estado: "1",
                    usumod: AUDITORIA.usuario,
                    pcmod: AUDITORIA.pc,
                    fecmod: fechaAuditoria()
                })
                .eq("id_usuariorol", asignacion.id_usuariorol);
            if (errorRestauracion) erroresRestauracion.push(errorRestauracion.message);
        }
        const errorOriginal = errorBaseDatos(error);
        if (erroresRestauracion.length) {
            throw new Error(
                `${errorOriginal.message} No se pudieron restaurar las asignaciones de rol: ${erroresRestauracion.join("; ")}`
            );
        }
        throw errorOriginal;
    }

};

module.exports = {
    MAX_ADMINISTRADORES,
    actualizarUsuario,
    crearUsuario,
    darDeBajaUsuario,
    listarUsuarios,
    obtenerOpciones
};
