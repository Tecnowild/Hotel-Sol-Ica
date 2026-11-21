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
let ultimaConsulta;
const crearClienteSimulado = () => ({
    from(tabla) {
        ultimaConsulta = { tabla, filtros: [] };
        return {
            select() { return this; },
            eq(campo, valor) {
                ultimaConsulta.filtros.push([campo, valor]);
                return this;
            },
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

const {
    buscarUsuarioActivoPorId,
    buscarUsuarioPorLogeo
} = require("../models/usuarioModel");

test("only treats an active user row as an active account", async () => {
    respuestaUsuario = { data: { id_usuario: 9 }, error: null };

    assert.equal(await buscarUsuarioActivoPorId(9), true);
    assert.equal(ultimaConsulta.tabla, "usuario");
    assert.deepEqual(ultimaConsulta.filtros, [
        ["id_usuario", 9],
        ["estado", "1"]
    ]);

    respuestaUsuario = { data: null, error: null };
    assert.equal(await buscarUsuarioActivoPorId(9), false);
});

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
