const test = require("node:test");
const assert = require("node:assert/strict");
const { hashearClave } = require("../utils/password");
const hashCredencial = hashearClave("clave-segura-123");

const usuarioModelo = {
    buscarUsuarioPorLogeo: async () => ({
        id_usuario: 9,
        id_tipousuario: 1,
        id_empleado: 3,
        logeo: "recepcion",
        clave: "",
        clave_hash: await hashCredencial,
        estado: "1"
    }),
    guardarHashClave: async () => {}
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
