const { test: base, expect } = require("@playwright/test");

const test = base.extend({
    browserDiagnostics: async ({ page }, use, testInfo) => {
        const diagnostics = [];

        page.on("console", (message) => {
            if (message.type() === "error") {
                diagnostics.push(`console.error: ${message.text()}`);
            }
        });
        page.on("pageerror", (error) => {
            diagnostics.push(`pageerror: ${error.stack || error.message}`);
        });
        page.on("requestfailed", (request) => {
            diagnostics.push(
                `requestfailed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`
            );
        });

        await use(diagnostics);

        if (diagnostics.length > 0) {
            await testInfo.attach("diagnosticos-del-navegador", {
                body: diagnostics.join("\n"),
                contentType: "text/plain",
            });
        }
    },
});

const configurarAutenticacion = async (page, roles, modulos) => {
    const sesion = {
        success: true,
        usuario: {
            logeo: roles.includes("ADMINISTRADOR") ? "admin-e2e" : "cajero-e2e",
            id_usuario: 1,
        },
        roles,
        modulos,
        token: "token-e2e",
        expiraEn: Date.now() + 60 * 60 * 1000,
    };

    await page.route("**/api/auth/login", (route) =>
        route.fulfill({ status: 200, json: sesion })
    );
    await page.route("**/api/auth/session", (route) =>
        route.fulfill({ status: 200, json: sesion })
    );
};

const iniciarSesion = async (page, usuario) => {
    await page.getByPlaceholder("Ingresa tu usuario").fill(usuario);
    await page.getByPlaceholder("Ingresa tu contraseña").fill("clave-e2e");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();
};

test("admin inicia sesión, consulta su perfil y cierra sesión", async ({
    page,
    browserDiagnostics,
}) => {
    await configurarAutenticacion(
        page,
        ["ADMINISTRADOR"],
        ["CLIENTES", "RECEPCION", "HABITACIONES", "VENTAS", "CAJA", "USUARIOS", "REPORTES"]
    );

    await page.goto("/login");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();
    await expect(page.getByText("El usuario es obligatorio.")).toBeVisible();
    await expect(page.getByText("La contraseña es obligatoria.")).toBeVisible();

    await iniciarSesion(page, "admin-e2e");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Sesión activa")).toBeVisible();

    await page.getByRole("button", { name: "Identificación de usuario" }).click();
    await expect(page.getByRole("region", { name: "Identificación del usuario" })).toContainText(
        "ADMINISTRADOR"
    );

    await page.getByRole("button", { name: /cerrar sesión/i }).first().click();
    await expect(page.getByText("Bienvenido")).toBeVisible();
});

test("el menú solo muestra módulos habilitados para el rol", async ({
    page,
    browserDiagnostics,
}) => {
    await configurarAutenticacion(page, ["CAJERO"], ["CAJA"]);
    await page.goto("/login");
    await iniciarSesion(page, "cajero-e2e");

    await expect(page.getByText("Sesión activa")).toBeVisible();
    await page.getByRole("button", { name: /finanzas y caja/i }).click();
    await expect(page.getByRole("button", { name: "Pagos y caja" })).toBeVisible();
    await expect(
        page.getByRole("button", { name: /administración del sistema/i })
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Usuarios" })).toHaveCount(0);
});
