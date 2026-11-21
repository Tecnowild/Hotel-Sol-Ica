import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PwaInstallButton from "./PwaInstallButton";

test("shows desktop install instructions when the browser has no install prompt", async () => {
    render(<PwaInstallButton />);

    await userEvent.click(
        screen.getByRole("button", { name: "Instalar aplicación" })
    );

    expect(screen.getByRole("status")).toHaveTextContent(/Chrome o Edge/);
    expect(screen.getByRole("status")).toHaveTextContent(/Inicio/);
});

test("uses a browser install prompt captured before the dashboard mounts", async () => {
    const prompt = jest.fn().mockResolvedValue();
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(event, {
        prompt: { value: prompt },
        userChoice: {
            value: Promise.resolve({ outcome: "accepted" })
        }
    });

    act(() => {
        window.dispatchEvent(event);
    });
    render(<PwaInstallButton />);

    await userEvent.click(
        screen.getByRole("button", { name: "Instalar aplicación" })
    );

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent(/Instalación aceptada/);
});

test("reports that the app can be opened from the desktop app menu after installation", () => {
    render(<PwaInstallButton />);

    act(() => {
        window.dispatchEvent(new Event("appinstalled"));
    });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Aplicación instalada");
    expect(status).toHaveAttribute(
        "title",
        "Para abrirla después, búscala en Inicio o en el menú de Aplicaciones."
    );
    expect(
        screen.queryByRole("button", { name: "Instalar aplicación" })
    ).not.toBeInTheDocument();
});
