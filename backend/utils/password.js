const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);
const PREFIJO_HASH = "scrypt";
const LONGITUD_HASH = 64;

const hashearClave = async (clave) => {
    const sal = crypto.randomBytes(16);
    const hash = await scrypt(clave, sal, LONGITUD_HASH);
    return `${PREFIJO_HASH}$${sal.toString("hex")}$${hash.toString("hex")}`;
};

const verificarClave = async (clave, valorGuardado) => {
    const partes = String(valorGuardado || "").split("$");
    if (partes.length !== 3 || partes[0] !== PREFIJO_HASH) {
        return false;
    }

    const sal = Buffer.from(partes[1], "hex");
    const hashGuardado = Buffer.from(partes[2], "hex");
    if (!sal.length || hashGuardado.length !== LONGITUD_HASH) {
        return false;
    }

    const hashCalculado = await scrypt(clave, sal, LONGITUD_HASH);
    return crypto.timingSafeEqual(hashGuardado, hashCalculado);
};

module.exports = { hashearClave, verificarClave };
