import { fireEvent, render, screen } from "@testing-library/react";
import CentroAyuda from "./CentroAyuda";

test("muestra la guía de usuario con las áreas y operaciones principales", () => {
    render(<CentroAyuda />);

    fireEvent.click(screen.getByRole("button", { name: /Manual de usuario/ }));

    expect(screen.getByRole("heading", { name: "Manual de usuario" })).toBeInTheDocument();
    expect(screen.getByText("Finanzas y caja")).toBeInTheDocument();
    expect(screen.getByText("Recepción y reservas")).toBeInTheDocument();
    expect(screen.getByText("Cómo usar los formularios CRUD")).toBeInTheDocument();
});

test("explica el soporte pendiente y mantiene visibles los manuales técnicos", () => {
    render(<CentroAyuda />);

    fireEvent.click(screen.getByRole("button", { name: /Manual del programador/ }));
    expect(screen.getByRole("heading", { name: "Manual del programador" })).toBeInTheDocument();
    expect(screen.getByText("Configuración del entorno")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver al centro de ayuda" }));
    fireEvent.click(screen.getByRole("button", { name: /Contacto y soporte/ }));

    expect(screen.getByRole("heading", { name: "Contacto y soporte" })).toBeInTheDocument();
    expect(screen.getByText(/correo y el teléfono de soporte todavía no están configurados/i)).toBeInTheDocument();
    expect(screen.getByText(/Nunca envíes contraseñas, tokens ni claves de Supabase/i)).toBeInTheDocument();
});
