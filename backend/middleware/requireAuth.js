const { verificarTokenSesion } = require("../utils/sessionToken");
const { buscarUsuarioActivoPorId } = require("../models/usuarioModel");

const requireAuth = async (req, res, next) => {
    const authorization = req.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            success: false,
            message: "Se requiere una sesión activa."
        });
    }

    try {
        req.sesion = verificarTokenSesion(token);
    } catch {
        return res.status(401).json({
            success: false,
            message: "La sesión no es válida o ha expirado."
        });
    }

    const idUsuario = req.sesion?.usuario?.id_usuario;
    if (!Number.isInteger(idUsuario) || idUsuario < 1) {
        return res.status(401).json({
            success: false,
            message: "La sesión no es válida o ha expirado."
        });
    }

    try {
        if (!await buscarUsuarioActivoPorId(idUsuario)) {
            return res.status(401).json({
                success: false,
                message: "La sesión no es válida o ha expirado."
            });
        }

        return next();
    } catch (error) {
        console.error("No se pudo verificar el estado del usuario de la sesión:", error);
        return res.status(503).json({
            success: false,
            message: "No se pudo validar la sesión en este momento."
        });
    }
};

module.exports = requireAuth;
