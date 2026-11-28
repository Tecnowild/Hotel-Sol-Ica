const {
    autenticarUsuario
} = require("../services/authService");

const login = async (req, res) => {

    try {
        res.set("Cache-Control", "no-store");

        const { logeo, clave } = req.body || {};

        // Validación
        if (typeof logeo !== "string" || !logeo.trim()) {
            return res.status(400).json({
                success: false,
                message: "El usuario es obligatorio."
            });
        }

        if (typeof clave !== "string" || !clave.trim()) {
            return res.status(400).json({
                success: false,
                message: "La contraseña es obligatoria."
            });
        }

        if (logeo.length > 128 || clave.length > 1024) {
            return res.status(400).json({
                success: false,
                message: "El usuario o la contraseña exceden el tamaño permitido."
            });
        }

        const resultado = await autenticarUsuario(
            logeo.trim(),
            clave
        );

        if (!resultado.success) {
            return res.status(401).json(resultado);
        }

        return res.status(200).json(resultado);

    } catch (error) {

        console.error(
            "Error en login:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Ocurrió un error al procesar el inicio de sesión."
        });
    }
};

const obtenerSesion = (req, res) => {
    res.set("Cache-Control", "no-store");
    const { sesion } = req;
    return res.status(200).json({
        success: true,
        usuario: sesion.usuario,
        roles: sesion.roles,
        modulos: sesion.modulos,
        expiraEn: sesion.exp * 1000
    });
};

module.exports = {
    login,
    obtenerSesion
};