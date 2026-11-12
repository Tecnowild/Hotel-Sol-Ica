import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Reservas from "./Reservas";
import {
    buscarDisponibilidadHabitaciones,
    listarCatalogosReserva,
    registrarReserva,
} from "../services/procesosService";
import { hoy, sumarDias } from "../utils/format";

jest.mock("../services/procesosService", () => ({
    buscarDisponibilidadHabitaciones: jest.fn(),
    listarCatalogosReserva: jest.fn(),
    registrarReserva: jest.fn(),
}));

const huespedes = [
    {
        key: "persona-1",
        id_persona: 1,
        id_cliente: 11,
        nombre: "Ana Huamán",
        documento: "12345678",
        persona: { id_persona: 1, n_documento: "12345678" },
    },
    {
        key: "persona-2",
        id_persona: 2,
        nombre: "Luis Paredes",
        documento: "87654321",
        persona: { id_persona: 2, n_documento: "87654321" },
    },
    {
        key: "persona-3",
        id_persona: 3,
        nombre: "Rosa Paredes",
        documento: "11223344",
        persona: { id_persona: 3, n_documento: "11223344" },
    },
];

beforeEach(() => {
    window.print = jest.fn();
    buscarDisponibilidadHabitaciones.mockResolvedValue([{
        id_habitacion: 7,
        numero: "204",
        precio: 120,
        categoria_nombre: "Doble",
    }]);
    listarCatalogosReserva.mockResolvedValue({
        huespedes,
        metodos: [{ id_metodopago: 2, n_metodopago: "Efectivo" }],
    });
    registrarReserva.mockResolvedValue({
        id_recepcion: 81,
        f_entrada: hoy(),
        f_salida: sumarDias(hoy(), 1),
        huespedes: 2,
        d_inicial: 120,
        totaldeuda: 120,
        cliente_nombre: "Ana Huamán",
        cliente_documento: "12345678",
        tipo_documento: "BOLETA",
        acompanantes: [{ id_persona: 2, nombre: "Luis Paredes", documento: "87654321" }],
    });
});

test("limita y confirma acompañantes según el total de huéspedes y guarda la reserva", async () => {
    render(<Reservas />);

    fireEvent.change(screen.getByLabelText("Número de huéspedes"), { target: { value: "2" } });
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Seleccionar" }));

    await userEvent.selectOptions(await screen.findByLabelText("Huésped registrado"), "persona-1");
    await userEvent.click(screen.getByRole("button", { name: /Siguiente: detalles de reserva/ }));

    const botonAgregar = screen.getByRole("button", { name: /Agregar acompañante/ });
    expect(screen.getByRole("button", { name: "Guardar reserva" })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText("Acompañante registrado"), "persona-2");
    await userEvent.click(botonAgregar);

    expect(screen.getByText("Luis Paredes")).toBeInTheDocument();
    expect(screen.getByText("2 de 2 huésped(es)")).toBeInTheDocument();
    expect(screen.getByLabelText("Acompañante registrado")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar reserva" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Guardar reserva" }));

    await waitFor(() => expect(registrarReserva).toHaveBeenCalledWith(expect.objectContaining({
        acompanantes: [{ id_persona: 2, persona: huespedes[1].persona }],
        cantidad_huespedes: 2,
        tipo_documento: "BOLETA",
    })));
    expect(await screen.findByText("Reserva registrada correctamente")).toBeInTheDocument();
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
});
