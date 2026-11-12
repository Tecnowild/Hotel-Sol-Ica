const {
    buscarUsuarioPorLogeo,
    guardarHashClave
} = require("../models/usuarioModel");
const { obtenerPermisosUsuario } = require("../models/permisosModel");
const { hashearClave, verificarClave } = require("../utils/password");
const { crearTokenSesion } = require("../utils/sessionToken");

const autenticarUsuario = async (logeo, clave) => {

    const usuario = await buscarUsuarioPorLogeo(logeo);

    if (!usuario) {
        return {
            success: false,
            message: "El usuario o la contraseña son incorrectos."
        };
    }

    // En tu BD los registros mostrados tienen estado = 1.
    if (String(usuario.estado) !== "1") {
        return {
            success: false,
            message: "El usuario se encuentra inactivo."
        };
    }

    const claveValida = usuario.clave_hash
        ? await verificarClave(clave, usuario.clave_hash)
        : String(usuario.clave) === String(clave);
    if (!claveValida) {
        return {
            success: false,
            message: "El usuario o la contraseña son incorrectos."
        };
    }

    if (
        !usuario.clave_hash &&
        usuario.clave &&
        usuario.credencialDisponible !== false
    ) {
        await guardarHashClave(usuario.id_usuario, await hashearClave(clave));
    }

    const permisos = await obtenerPermisosUsuario(usuario.id_usuario);
    const datosUsuario = {
        id_usuario: usuario.id_usuario,
        id_tipousuario: usuario.id_tipousuario,
        id_empleado: usuario.id_empleado,
        logeo: usuario.logeo,
        estado: usuario.estado
    };
    const sesion = crearTokenSesion({
        usuario: datosUsuario,
        ...permisos
    });

    return {
        success: true,
        usuario: datosUsuario,
        roles: permisos.roles,
        modulos: permisos.modulos,
        token: sesion.token,
        expiraEn: sesion.expiraEn
    };
};

module.exports = {
    autenticarUsuario
};