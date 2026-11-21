const supabase = require("../config/supabase");
const { obtenerSupabaseAdmin } = require("../config/supabaseAdmin");

let avisoTablaCredencialEmitido = false;

const esTablaCredencialNoDisponible = (error) =>
    error?.code === "42P01" ||
    (
        error?.code === "PGRST205" &&
        String(error.message || "").includes("usuario_credencial")
    );

const obtenerClienteUsuario = () => {
    try {
        return {
            cliente: obtenerSupabaseAdmin(),
            privado: true
        };
    } catch (error) {
        if (error.status !== 503) throw error;
        return {
            cliente: supabase,
            privado: false
        };
    }
};

const buscarUsuarioPorLogeo = async (logeo) => {
    const { cliente, privado } = obtenerClienteUsuario();
    const { data: usuario, error } = await cliente
        .from("usuario")
        .select(`
            id_usuario,
            id_tipousuario,
            id_empleado,
            logeo,
            clave,
            estado
        `)
        .eq("logeo", logeo)
        .maybeSingle();

    if (error) throw error;
    if (!usuario || !privado) {
        return usuario
            ? { ...usuario, clave_hash: null, credencialDisponible: false }
            : null;
    }

    const { data: credencial, error: errorCredencial } = await cliente
        .from("usuario_credencial")
        .select("clave_hash")
        .eq("id_usuario", usuario.id_usuario)
        .maybeSingle();
    if (errorCredencial && !esTablaCredencialNoDisponible(errorCredencial)) {
        throw errorCredencial;
    }
    if (errorCredencial && !avisoTablaCredencialEmitido) {
        console.warn(
            "La tabla usuario_credencial todavía no está disponible en Supabase. Se usará la contraseña heredada; aplica la migración para habilitar el almacenamiento seguro de hashes."
        );
        avisoTablaCredencialEmitido = true;
    }

    return {
        ...usuario,
        clave_hash: credencial?.clave_hash || null,
        credencialDisponible: !errorCredencial
    };
};

const buscarUsuarioActivoPorId = async (idUsuario) => {
    const { cliente } = obtenerClienteUsuario();
    const { data: usuario, error } = await cliente
        .from("usuario")
        .select("id_usuario")
        .eq("id_usuario", idUsuario)
        .eq("estado", "1")
        .maybeSingle();

    if (error) throw error;
    return Boolean(usuario);
};

const guardarHashClave = async (idUsuario, claveHash) => {
    const supabasePrivado = obtenerSupabaseAdmin();
    const { error: errorHash } = await supabasePrivado
        .from("usuario_credencial")
        .upsert({
            id_usuario: idUsuario,
            clave_hash: claveHash
        }, { onConflict: "id_usuario" });

    if (errorHash) throw errorHash;

    const { error } = await supabasePrivado
        .from("usuario")
        .update({ clave: "" })
        .eq("id_usuario", idUsuario);

    if (error) throw error;
};

module.exports = {
    buscarUsuarioActivoPorId,
    buscarUsuarioPorLogeo,
    guardarHashClave
};