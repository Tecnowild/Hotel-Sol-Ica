import { supabase } from "../config/supabase";
import { insertar, listar, listarPaginado } from "./crudService";

jest.mock("../config/supabase", () => ({
    supabase: { from: jest.fn() },
}));

const crearConsulta = () => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    then(resolve, reject) {
        return Promise.resolve({
            data: [{ id_usuario: 1, logeo: "admin" }],
            error: null,
            count: 1,
        }).then(resolve, reject);
    },
});

beforeEach(() => {
    supabase.from.mockReset().mockReturnValue(crearConsulta());
});

test("user reference lists never select credential columns", async () => {
    await listar("usuario", "id_usuario");
    expect(supabase.from.mock.results[0].value.select).toHaveBeenCalledWith(
        "id_usuario,logeo"
    );

    await listarPaginado("usuario", "id_usuario");
    expect(supabase.from.mock.results[1].value.select).toHaveBeenCalledWith(
        "id_usuario,logeo",
        { count: "exact" }
    );
});

test("the generic CRUD cannot write user accounts directly", async () => {
    await expect(insertar("usuario", { logeo: "nuevo" })).rejects.toThrow(
        "Las cuentas de usuario solo se gestionan desde el CRUD protegido de Usuarios."
    );
    expect(supabase.from).not.toHaveBeenCalled();
});
