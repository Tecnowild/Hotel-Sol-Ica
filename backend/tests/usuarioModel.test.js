const test = require("node:test");
const assert = require("node:assert/strict");

const usuarioDePrueba = {
    id_usuario: 9,
    id_tipousuario: 1,
    id_empleado: 3,
    logeo: "administracion",
    clave: "clave-heredada",
    estado: "1"
};

let respuestaUsuario;
let respuestaCredencial;
const crearClienteSimulado = () => ({
    from(tabla) {
        return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: async () => tabla === "usuario"
                ? respuestaUsuario
                : respuestaCredencial
        };
    }
});

const rutaSupabase = require.resolve("../config/supabase");
const rutaSupabaseAdmin = require.resolve("../config/supabaseAdmin");
require.cache[rutaSupabase] = {
    exports: crearClienteSimulado()
};
require.cache[rutaSupabaseAdmin] = {
    exports: {
        obtenerSupabaseAdmin: () => crearClienteSimulado()
    }
};

const { buscarUsuarioPorLogeo } = require("../models/usuarioModel");

test("uses the legacy password while the private credential table is not published", async () => {
    respuestaUsuario = { data: usuarioDePrueba, error: null };
    respuestaCredencial = {
        data: null,
        error: {
            code: "PGRST205",
            message: "Could not find the table public.usuario_credencial in the schema cache"
        }
    };
    const advertenciaOriginal = console.warn;
    const advertencias = [];
    console.warn = (mensaje) => advertencias.push(mensaje);

    try {
        const usuario = await buscarUsuarioPorLogeo("administracion");

        assert.equal(usuario.clave, "clave-heredada");
        assert.equal(usuario.clave_hash, null);
        assert.equal(usuario.credencialDisponible, false);
        assert.equal(advertencias.length, 1);
        assert.match(advertencias[0], /aplica la migración/i);
    } finally {
        console.warn = advertenciaOriginal;
    }
});

test("does not hide errors other than the missing credential table", async () => {
    respuestaUsuario = { data: usuarioDePrueba, error: null };
    respuestaCredencial = {
        data: null,
        error: { code: "42501", message: "permission denied" }
    };

    await assert.rejects(
        buscarUsuarioPorLogeo("administracion"),
        (error) => error?.code === "42501" && error.message === "permission denied"
    );
});
