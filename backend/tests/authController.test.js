const { test } = require("node:test");
const assert = require("node:assert/strict");

let intentosAutenticacion = 0;
const rutaAuthService = require.resolve("../services/authService");
require.cache[rutaAuthService] = {
    exports: {
        autenticarUsuario: async () => {
            intentosAutenticacion += 1;
            return { success: true };
        }
    }
};

const { login } = require("../controllers/authController");

const crearRespuesta = () => ({
    statusCode: null,
    contenido: null,
    set() {
        return this;
    },
    status(codigo) {
        this.statusCode = codigo;
        return this;
    },
    json(contenido) {
        this.contenido = contenido;
        return this;
    }
});

test("rejects non-string and oversized login credentials before authentication", async () => {
    intentosAutenticacion = 0;
    const entradasInvalidas = [
        { logeo: 123, clave: "clave" },
        { logeo: "usuario", clave: "x".repeat(1025) }
    ];

    for (const body of entradasInvalidas) {
        const respuesta = crearRespuesta();
        await login({ body }, respuesta);
        assert.equal(respuesta.statusCode, 400);
        assert.equal(respuesta.contenido.success, false);
    }

    assert.equal(intentosAutenticacion, 0);
});
