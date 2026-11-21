const express = require("express");

const {
    login,
    obtenerSesion
} = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

router.post("/login", login);
router.get("/session", requireAuth, obtenerSesion);

module.exports = router;