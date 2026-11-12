const {
    actualizarUsuario,
    crearUsuario,
    darDeBajaUsuario,
    listarUsuarios,
    obtenerOpciones
} = require("../services/adminUsuariosService");

const responderError = (res, error, operacion) => {
    console.error(`Error al ${operacion} usuarios:`, error);
    const status = error.status || 500;
    return res.status(status).json({
        success: false,
        message: status >= 500
            ? error.message || "No se pudo completar la operación de usuarios."
            : error.message
    });
};

const listar = async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        const resultado = await listarUsuarios({
            pagina: req.query.pagina,
            pageSize: req.query.pageSize,
            busqueda: req.query.busqueda
        });
        return res.status(200).json({ success: true, ...resultado });
    } catch (error) {
        return responderError(res, error, "listar");
    }
};

const opciones = async (_req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        const resultado = await obtenerOpciones();
        return res.status(200).json({ success: true, ...resultado });
    } catch (error) {
        return responderError(res, error, "consultar opciones de");
    }
};

const crear = async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        await crearUsuario(req.body || {});
        return res.status(201).json({
            success: true,
            message: "Usuario creado correctamente."
        });
    } catch (error) {
        return responderError(res, error, "crear");
    }
};

const actualizar = async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        await actualizarUsuario(req.params.id, req.body || {});
        return res.status(200).json({
            success: true,
            message: "Usuario actualizado correctamente."
        });
    } catch (error) {
        return responderError(res, error, "actualizar");
    }
};

const darDeBaja = async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        await darDeBajaUsuario(req.params.id, req.sesion.usuario.id_usuario);
        return res.status(200).json({
            success: true,
            message: "Usuario dado de baja correctamente."
        });
    } catch (error) {
        return responderError(res, error, "dar de baja");
    }
};

module.exports = { actualizar, crear, darDeBaja, listar, opciones };
