const test = require("node:test");
const assert = require("node:assert/strict");
const { hashearClave } = require("../utils/password");
const hashCredencial = hashearClave("clave-segura-123");
let usarClaveHeredada = false;
let hashCalls = 0;

const usuarioModelo = {
    buscarUsuarioPorLogeo: async () => usarClaveHeredada
        ? {
            id_usuario: 9,
            id_tipousuario: 1,
            id_empleado: 3,
            logeo: "recepcion",
            clave: "clave-heredada",
            clave_hash: null,
            credencialDisponible: false,
            estado: "1"
        }
        : {
            id_usuario: 9,
            id_tipousuario: 1,
            id_empleado: 3,
            logeo: "recepcion",
            clave: "",
            clave_hash: await hashCredencial,
            estado: "1"
        },
    guardarHashClave: async () => { hashCalls += 1; }
};

const rutaUsuario = require.resolve("../models/usuarioModel");
const rutaPermisos = require.resolve("../models/permisosModel");
require.cache[rutaUsuario] = { exports: usuarioModelo };
require.cache[rutaPermisos] = {
    exports: {
        obtenerPermisosUsuario: async () => ({
            roles: ["RECEPCIONISTA"],
            modulos: ["CLIENTES", "RECEPCION", "HABITACIONES"]
        })
    }
};

const { autenticarUsuario } = require("../services/authService");

test("authenticates staff accounts using the stored password hash", async () => {
    const resultado = await autenticarUsuario("recepcion", "clave-segura-123");

    assert.equal(resultado.success, true);
    assert.deepEqual(resultado.roles, ["RECEPCIONISTA"]);
    assert.ok(resultado.token);
});

test("rejects passwords that do not match the stored hash", async () => {
    const resultado = await autenticarUsuario("recepcion", "clave-incorrecta");

    assert.equal(resultado.success, false);
    assert.equal(resultado.message, "El usuario o la contraseña son incorrectos.");
});

test("authenticates with the legacy password without trying to hash it before migration", async () => {
    usarClaveHeredada = true;
    hashCalls = 0;

    try {
        const resultado = await autenticarUsuario("recepcion", "clave-heredada");

        assert.equal(resultado.success, true);
        assert.equal(hashCalls, 0);
    } finally {
        usarClaveHeredada = false;
    }
});
