const express = require("express");

const requireAuth = require("../middleware/requireAuth");
const requireAdmin = require("../middleware/requireAdmin");
const {
    actualizar,
    crear,
    darDeBaja,
    listar,
    opciones
} = require("../controllers/adminUsuariosController");

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.get("/", listar);
router.get("/opciones", opciones);
router.post("/", crear);
router.put("/:id", actualizar);
router.delete("/:id", darDeBaja);

module.exports = router;
