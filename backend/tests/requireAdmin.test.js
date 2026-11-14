const test = require("node:test");
const assert = require("node:assert/strict");

let permisosActuales = {
    roles: ["ADMINISTRADOR"],
    modulos: ["USUARIOS"]
};
const rutaPermisos = require.resolve("../models/permisosModel");
require.cache[rutaPermisos] = {
    exports: {
        obtenerPermisosUsuario: async () => permisosActuales
    }
};

const requireAdmin = require("../middleware/requireAdmin");

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

test("allows a current administrator even when the users module is not listed", async () => {
    const req = { sesion: { usuario: { id_usuario: 1 }, roles: ["ADMINISTRADOR"] } };
    const res = crearRespuesta();
    let continuo = false;
    permisosActuales = { roles: ["ADMINISTRADOR"], modulos: [] };

    await requireAdmin(req, res, () => { continuo = true; });

    assert.equal(continuo, true);
    assert.deepEqual(req.sesion.modulos, []);
});

test("rejects staff roles and users with multiple active roles", async () => {
    const req = { sesion: { usuario: { id_usuario: 2 } } };
    const res = crearRespuesta();
    permisosActuales = { roles: ["GERENTE"], modulos: ["USUARIOS"] };

    await requireAdmin(req, res, () => assert.fail("non-admin must be rejected"));
    assert.equal(res.statusCode, 403);

    permisosActuales = {
        roles: ["ADMINISTRADOR", "GERENTE"],
        modulos: ["USUARIOS"]
    };
    const segundaRespuesta = crearRespuesta();
    await requireAdmin(req, segundaRespuesta, () => assert.fail("multiple roles must be rejected"));
    assert.equal(segundaRespuesta.statusCode, 403);
});
