const test = require("node:test");
const assert = require("node:assert/strict");
const { hashearClave, verificarClave } = require("../utils/password");

test("stores a salted password hash and verifies only the matching password", async () => {
    const hash = await hashearClave("clave-segura-123");

    assert.notEqual(hash, "clave-segura-123");
    assert.match(hash, /^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
    assert.equal(await verificarClave("clave-segura-123", hash), true);
    assert.equal(await verificarClave("otra-clave", hash), false);
});

test("rejects malformed or legacy values as password hashes", async () => {
    assert.equal(await verificarClave("clave", "texto-plano"), false);
    assert.equal(await verificarClave("clave", "scrypt$no-es-un-hash"), false);
});
