import { supabase } from "../config/supabase";
import { abrirCaja, cerrarCaja, registrarPago } from "./procesosService";

jest.mock("../config/supabase", () => ({
    supabase: {
        from: jest.fn(),
        rpc: jest.fn(),
    },
}));

jest.mock("./reportesService", () => ({
    invalidarCatalogosReportes: jest.fn(),
}));

beforeEach(() => {
    sessionStorage.setItem("usuario", JSON.stringify({ id_usuario: 7 }));
    supabase.rpc.mockReset();
    supabase.from.mockReset();
});

test("opens a cash shift through the transactional database function", async () => {
    const apertura = { id_aperturacaja: 12, numero_turno: "T0012" };
    supabase.rpc.mockResolvedValue({ data: apertura, error: null });

    await expect(abrirCaja({
        id_caja: 3,
        id_usuario: 7,
        monto_inicial: 125.5,
        observacion: " Conteo inicial ",
        turno: "Mañana",
    })).resolves.toEqual({ ...apertura, turno_nombre: "Mañana" });

    expect(supabase.rpc).toHaveBeenCalledWith("abrir_turno_caja", {
        p_id_caja: 3,
        p_id_usuario: 7,
        p_monto_inicial: 125.5,
        p_turno: "Mañana",
        p_observacion: "Conteo inicial",
    });
    expect(supabase.from).not.toHaveBeenCalled();
});

test("does not interpret an empty opening amount as zero", async () => {
    await expect(abrirCaja({
        id_caja: 3,
        id_usuario: 7,
        monto_inicial: "",
        turno: "Mañana",
    })).rejects.toThrow("El monto inicial debe ser un importe válido");

    expect(supabase.rpc).not.toHaveBeenCalled();
});

test("closes a shift with the counted cash and the expected snapshot", async () => {
    const cierre = {
        id_aperturacaja: 12,
        arqueo: [{ clave: "1", esperado: 125.5, contado: 125.5 }],
        fondo_siguiente: 50,
    };
    supabase.rpc.mockResolvedValue({ data: cierre, error: null });

    await expect(cerrarCaja(12, {
        monto_declarado: 125.5,
        fondo_siguiente: 50,
        observacion: "Cierre normal",
        conteo_metodos: [{
            id_metodopago: 1,
            clave: "1",
            metodo: "Efectivo",
            esperado: 125.5,
            contado: "125.50",
        }],
    })).resolves.toEqual(cierre);

    expect(supabase.rpc).toHaveBeenCalledWith("cerrar_turno_caja", {
        p_id_aperturacaja: 12,
        p_id_usuario: 7,
        p_monto_declarado: 125.5,
        p_conteo_metodos: [{
            id_metodopago: 1,
            clave: "1",
            metodo: "Efectivo",
            esperado: 125.5,
            contado: 125.5,
        }],
        p_fondo_siguiente: 50,
        p_observacion: "Cierre normal",
    });
    expect(supabase.from).not.toHaveBeenCalled();
});

test("records a payment and its caja updates in one database call", async () => {
    const movimiento = { id_movimientocaja: 44, numero_operacion: "OP-000044" };
    supabase.rpc.mockResolvedValue({ data: movimiento, error: null });

    await expect(registrarPago({
        id_aperturacaja: 12,
        id_recepcion: 5,
        id_metodopago: 1,
        id_concepto: 2,
        id_tipomovimiento: 3,
        monto: "20.25",
        documento: "V-123",
    })).resolves.toEqual(movimiento);

    expect(supabase.rpc).toHaveBeenCalledWith("registrar_pago_caja", {
        p_id_aperturacaja: 12,
        p_id_usuario: 7,
        p_id_recepcion: 5,
        p_id_metodopago: 1,
        p_id_concepto: 2,
        p_id_tipomovimiento: 3,
        p_monto: 20.25,
        p_documento: "V-123",
        p_descripcion: null,
    });
    expect(supabase.from).not.toHaveBeenCalled();
});

test("does not call the database when the close count is incomplete", async () => {
    await expect(cerrarCaja(12, {
        monto_declarado: 5,
        fondo_siguiente: 0,
        conteo_metodos: [{ clave: "efectivo", esperado: 5, contado: "" }],
    })).rejects.toThrow("Todos los montos contados deben ser válidos");

    expect(supabase.rpc).not.toHaveBeenCalled();
});
