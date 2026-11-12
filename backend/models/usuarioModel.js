const supabase = require("../config/supabase");
const { obtenerSupabaseAdmin } = require("../config/supabaseAdmin");

const buscarUsuarioPorLogeo = async (logeo) => {
    let supabasePrivado;
    try {
        supabasePrivado = obtenerSupabaseAdmin();
    } catch (error) {
        if (error.status !== 503) throw error;
    }

    const cliente = supabasePrivado || supabase;
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
    if (!usuario || !supabasePrivado) {
        return usuario
            ? { ...usuario, clave_hash: null, credencialDisponible: false }
            : null;
    }

    const { data: credencial, error: errorCredencial } = await supabasePrivado
        .from("usuario_credencial")
        .select("clave_hash")
        .eq("id_usuario", usuario.id_usuario)
        .maybeSingle();
    if (errorCredencial && errorCredencial.code !== "42P01") {
        throw errorCredencial;
    }

    return {
        ...usuario,
        clave_hash: credencial?.clave_hash || null,
        credencialDisponible: !errorCredencial
    };
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
    buscarUsuarioPorLogeo,
    guardarHashClave
};