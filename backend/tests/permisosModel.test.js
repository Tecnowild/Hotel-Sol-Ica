const test = require("node:test");
const assert = require("node:assert/strict");

const consultas = [];
const filas = {
    usuario_rol: [
        { id_usuario: 42, id_rol: 1, vigente: "1", estado: "1" },
        { id_usuario: 42, id_rol: 2, vigente: "1", estado: "0" },
        { id_usuario: 42, id_rol: 3, vigente: "0", estado: "1" }
    ],
    rol: [
        { id_rol: 1, n_rol: "ADMINISTRADOR", estado: "1" },
        { id_rol: 2, n_rol: "INACTIVO", estado: "0" }
    ],
    modulo: [
        { id_modulo: 4, n_modulo: "USUARIOS", estado: "1" },
        { id_modulo: 1, n_modulo: "CLIENTES", estado: "1" },
        { id_modulo: 2, n_modulo: "RECEPCION", estado: "1" },
        { id_modulo: 3, n_modulo: "INACTIVO", estado: "0" }
    ]
};

const supabaseSimulado = {
    from(tabla) {
        const consulta = { tabla, filtros: [] };
        consultas.push(consulta);

        const builder = {
            select() {
                return this;
            },
            eq(campo, valor) {
                consulta.filtros.push({ tipo: "eq", campo, valor });
                return this;
            },
            in(campo, valores) {
                consulta.filtros.push({ tipo: "in", campo, valores });
                return this;
            },
            then(resolve, reject) {
                const resultado = (filas[tabla] || []).filter((fila) =>
                    consulta.filtros.every((filtro) => {
                        if (filtro.tipo === "eq") {
                            return String(fila[filtro.campo]) === String(filtro.valor);
                        }
                        return filtro.valores.includes(fila[filtro.campo]);
                    })
                );

                return Promise.resolve({ data: resultado, error: null }).then(resolve, reject);
            }
        };

        return builder;
    }
};

const rutaSupabase = require.resolve("../config/supabase");
require.cache[rutaSupabase] = {
    exports: supabaseSimulado
};

const {
    MODULOS_POR_ROL,
    obtenerPermisosUsuario
} = require("../models/permisosModel");

test("defines the approved module access for each staff role", () => {
    assert.deepEqual(MODULOS_POR_ROL, {
        ADMINISTRADOR: null,
        GERENTE: ["CLIENTES", "RECEPCION", "HABITACIONES", "CAJA", "VENTAS", "REPORTES"],
        SUPERVISOR: ["CLIENTES", "RECEPCION", "HABITACIONES", "CAJA", "VENTAS"],
        RECEPCIONISTA: ["CLIENTES", "RECEPCION", "HABITACIONES"],
        CAJERO: ["CLIENTES", "RECEPCION", "CAJA", "VENTAS"],
        "OPERACIONES/LIMPIEZA": ["HABITACIONES"],
        "OPERACIONES Y LIMPIEZA": ["HABITACIONES"],
        CLIENTE: []
    });
});

test("resolves one active administrator role and every active module", async () => {
    const resultado = await obtenerPermisosUsuario(42);

    assert.deepEqual(resultado, {
        roles: ["ADMINISTRADOR"],
        modulos: ["USUARIOS", "CLIENTES", "RECEPCION"]
    });

    const consultaRoles = consultas.find((consulta) => consulta.tabla === "rol");
    assert.ok(consultaRoles.filtros.some(
        (filtro) => filtro.campo === "estado" && filtro.valor === "1"
    ));
    const consultaModulos = consultas.find((consulta) => consulta.tabla === "modulo");
    assert.ok(consultaModulos.filtros.some(
        (filtro) => filtro.campo === "estado" && filtro.valor === "1"
    ));
});

test("keeps administrator access when cleaning up legacy multiple-role assignments", async () => {
    filas.usuario_rol.push({
        id_usuario: 42,
        id_rol: 4,
        vigente: "1",
        estado: "1"
    });
    filas.rol.push({ id_rol: 4, n_rol: "GERENTE", estado: "1" });

    const resultado = await obtenerPermisosUsuario(42);
    assert.deepEqual(resultado.roles, ["ADMINISTRADOR"]);
    assert.ok(resultado.modulos.includes("USUARIOS"));

    filas.usuario_rol.pop();
    filas.rol.pop();
});

test("does not combine access from multiple non-administrator roles", async () => {
    filas.usuario_rol[0].id_rol = 4;
    filas.rol.push(
        { id_rol: 4, n_rol: "GERENTE", estado: "1" },
        { id_rol: 5, n_rol: "CAJERO", estado: "1" }
    );
    filas.usuario_rol.push({
        id_usuario: 42,
        id_rol: 5,
        vigente: "1",
        estado: "1"
    });

    await assert.rejects(
        obtenerPermisosUsuario(42),
        /más de un rol activo/
    );

    filas.usuario_rol.pop();
    filas.usuario_rol[0].id_rol = 1;
    filas.rol.splice(-2);
});

test("applies the approved module policy to non-administrator roles", async () => {
    filas.usuario_rol[0].id_rol = 5;
    filas.rol.push({ id_rol: 5, n_rol: "RECEPCIONISTA", estado: "1" });
    filas.modulo.push(
        { id_modulo: 5, n_modulo: "HABITACIONES", estado: "1" },
        { id_modulo: 6, n_modulo: "CAJA", estado: "1" }
    );

    const resultado = await obtenerPermisosUsuario(42);
    assert.deepEqual(resultado, {
        roles: ["RECEPCIONISTA"],
        modulos: ["CLIENTES", "RECEPCION", "HABITACIONES"]
    });

    filas.usuario_rol[0].id_rol = 1;
    filas.rol.pop();
    filas.modulo.splice(-2);
});
