const express = require("express");
const { rateLimit } = require("express-rate-limit");

const {
    consultarDocumento
} = require("../controllers/consultasController");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.use(rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Se alcanzó el límite temporal de consultas. Inténtalo nuevamente en un minuto."
    }
}));
router.use(requireAuth);
router.post("/:tipo", consultarDocumento);

module.exports = router;
