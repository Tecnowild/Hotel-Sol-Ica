const { obtenerPermisosUsuario } = require("../models/permisosModel");

const requireAdmin = async (req, res, next) => {
    const idUsuario = req.sesion?.usuario?.id_usuario;
    if (!idUsuario) {
        return res.status(401).json({
            success: false,
            message: "La sesión no identifica a un usuario válido."
        });
    }

    try {
        const permisos = await obtenerPermisosUsuario(idUsuario);
        if (
            permisos.roles.length !== 1 ||
            permisos.roles[0].trim().toUpperCase() !== "ADMINISTRADOR"
        ) {
            return res.status(403).json({
                success: false,
                message: "Solo un administrador puede gestionar usuarios."
            });
        }

        req.sesion.roles = permisos.roles;
        req.sesion.modulos = permisos.modulos;
        return next();
    } catch (error) {
        console.error("No se pudo verificar el rol administrador:", error);
        return res.status(500).json({
            success: false,
            message: "No se pudo verificar el acceso administrativo."
        });
    }
};

module.exports = requireAdmin;
