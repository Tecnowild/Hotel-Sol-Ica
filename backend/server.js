const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const consultasRoutes = require("./routes/consultasRoutes");
const adminUsuariosRoutes = require("./routes/adminUsuariosRoutes");

const obtenerOrigenesPermitidos = () => {
    const configurados = (process.env.CORS_ORIGINS || "")
        .split(",")
        .map((origen) => origen.trim())
        .filter(Boolean);

    if (configurados.length > 0) {
        return new Set(configurados);
    }

    return new Set(
        process.env.NODE_ENV === "production"
            ? []
            : ["http://localhost:3000"]
    );
};

const crearApp = () => {
    const app = express();
    const origenesPermitidos = obtenerOrigenesPermitidos();
    const saltosProxy = (process.env.TRUST_PROXY_HOPS || "").trim();

    if (saltosProxy) {
        const cantidadSaltos = Number(saltosProxy);
        if (!Number.isInteger(cantidadSaltos) || cantidadSaltos < 1) {
            throw new Error("TRUST_PROXY_HOPS debe ser un entero positivo.");
        }
        app.set("trust proxy", cantidadSaltos);
    }

    app.disable("x-powered-by");
    app.use(helmet());
    app.use(cors({
        origin: (origen, callback) => {
            callback(null, !origen || origenesPermitidos.has(origen));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        maxAge: 600
    }));
    app.use(express.json({ limit: "100kb" }));

    app.get("/", (req, res) => {
        res.json({
            success: true,
            message: "API Hotel Sol Ica funcionando correctamente."
        });
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/consultas", consultasRoutes);
    app.use("/api/admin/usuarios", adminUsuariosRoutes);

    app.use((error, req, res, next) => {
        if (error.type === "entity.too.large") {
            return res.status(413).json({
                success: false,
                message: "El cuerpo de la solicitud supera el tamaño permitido."
            });
        }

        if (error.type === "entity.parse.failed") {
            return res.status(400).json({
                success: false,
                message: "El cuerpo JSON de la solicitud no es válido."
            });
        }

        return next(error);
    });

    return app;
};

if (require.main === module) {
    const app = crearApp();
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(
            `Servidor Hotel Sol Ica ejecutándose en http://localhost:${PORT}`
        );
    });
}

module.exports = { crearApp };