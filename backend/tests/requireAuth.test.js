const test = require("node:test");
const assert = require("node:assert/strict");

let buscarUsuarioActivo = async () => true;
const rutaUsuarioModel = require.resolve("../models/usuarioModel");
require.cache[rutaUsuarioModel] = {
    exports: {
        buscarUsuarioActivoPorId: async (idUsuario) =>
            buscarUsuarioActivo(idUsuario)
    }
};

const requireAuth = require("../middleware/requireAuth");
const { crearTokenSesion } = require("../utils/sessionToken");

const crearRespuesta = () => ({
    statusCode: null,
    contenido: null,
    status(codigo) {
        this.statusCode = codigo;
        return this;
    },
    json(contenido) {
        this.contenido = contenido;
        return this;
    }
});

test("rejects requests without a bearer session", async () => {
    const respuesta = crearRespuesta();
    let continuo = false;

    await requireAuth(
        { get: () => undefined },
        respuesta,
        () => { continuo = true; }
    );

    assert.equal(respuesta.statusCode, 401);
    assert.equal(continuo, false);
});

test("attaches verified claims before allowing an authorized request", async () => {
    const claims = {
        usuario: { id_usuario: 9 },
        roles: ["CAJERO"],
        modulos: ["CAJA"]
    };
    const { token } = crearTokenSesion(claims);
    const solicitud = { get: () => `Bearer ${token}` };
    const respuesta = crearRespuesta();
    let continuo = false;

    await requireAuth(solicitud, respuesta, () => { continuo = true; });

    assert.equal(continuo, true);
    assert.deepEqual(solicitud.sesion.usuario, claims.usuario);
    assert.deepEqual(solicitud.sesion.modulos, claims.modulos);
});

test("rejects a valid session when its account is inactive", async () => {
    buscarUsuarioActivo = async () => false;
    const { token } = crearTokenSesion({
        usuario: { id_usuario: 9 },
        roles: ["CAJERO"],
        modulos: ["CAJA"]
    });
    const respuesta = crearRespuesta();
    let continuo = false;

    await requireAuth(
        { get: () => `Bearer ${token}` },
        respuesta,
        () => { continuo = true; }
    );

    assert.equal(respuesta.statusCode, 401);
    assert.equal(continuo, false);
});

test("fails closed when the account status cannot be checked", async () => {
    buscarUsuarioActivo = async () => {
        throw new Error("Supabase unavailable");
    };
    const { token } = crearTokenSesion({
        usuario: { id_usuario: 9 }
    });
    const respuesta = crearRespuesta();
    const errorOriginal = console.error;
    console.error = () => {};

    try {
        await requireAuth(
            { get: () => `Bearer ${token}` },
            respuesta,
            () => {}
        );
    } finally {
        console.error = errorOriginal;
    }

    assert.equal(respuesta.statusCode, 503);
    assert.equal(respuesta.contenido.success, false);
});
