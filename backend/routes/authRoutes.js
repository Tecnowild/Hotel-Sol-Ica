const express = require("express");
const { rateLimit } = require("express-rate-limit");

const {
    login,
    obtenerSesion
} = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
const limitarIntentosLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        success: false,
        message: "Demasiados intentos de inicio de sesión. Inténtalo nuevamente en 15 minutos."
    }
});

router.post("/login", limitarIntentosLogin, login);
router.get("/session", requireAuth, obtenerSesion);

module.exports = router;