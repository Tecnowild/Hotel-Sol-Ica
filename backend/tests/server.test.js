const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

let servidor;
let baseUrl;
let origenesAnteriores;

before(async () => {
    origenesAnteriores = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = "https://hotel.example";

    const { crearApp } = require("../server");
    servidor = crearApp().listen(0);
    await new Promise((resolve) => servidor.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => {
        servidor.close((error) => error ? reject(error) : resolve());
    });

    if (origenesAnteriores === undefined) {
        delete process.env.CORS_ORIGINS;
    } else {
        process.env.CORS_ORIGINS = origenesAnteriores;
    }
});

test("adds security headers and removes the Express fingerprint", async () => {
    const response = await fetch(baseUrl);

    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-powered-by"), null);
});

test("rejects oversized JSON request bodies", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logeo: "usuario", clave: "x".repeat(110 * 1024) })
    });

    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), {
        success: false,
        message: "El cuerpo de la solicitud supera el tamaño permitido."
    });
});

test("returns a client error for malformed JSON", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{"
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
        success: false,
        message: "El cuerpo JSON de la solicitud no es válido."
    });
});

test("allows configured browser origins and omits CORS access for others", async () => {
    const permitida = await fetch(baseUrl, {
        headers: { Origin: "https://hotel.example" }
    });
    const bloqueada = await fetch(baseUrl, {
        headers: { Origin: "https://otra.example" }
    });

    assert.equal(
        permitida.headers.get("access-control-allow-origin"),
        "https://hotel.example"
    );
    assert.equal(bloqueada.headers.get("access-control-allow-origin"), null);
});

test("limits failed login attempts by client IP", async () => {
    const respuestas = [];

    for (let intento = 0; intento < 6; intento += 1) {
        respuestas.push(await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        }));
    }

    assert.equal(respuestas[4].status, 400);
    assert.equal(respuestas[5].status, 429);
    assert.equal(respuestas[5].headers.has("ratelimit-policy"), true);
});
