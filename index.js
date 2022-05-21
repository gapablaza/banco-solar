const express = require("express");
const app = express();

const {
  registrarUsuario,
  listarUsuarios,
  editarUsuario,
  registrarTransferencia,
  eliminarUsuario,
  listarTransferencias,
  usuarioTieneTransferencias,
} = require("./consultas.js");

app.listen(3000, () =>
  console.log("Servidor disponible en http://localhost:3000")
);

app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

// Retorna el listado de usuarios registrados
app.get("/usuarios", async (req, res) => {
  const respuesta = await listarUsuarios();
  res.status(200).json(respuesta.rows);
});

// Validaciones generales para los métodos POST, PUT y DELETE
app.use("/usuario", (req, res, next) => {
  if (req.method == "POST") {
    const { nombre, balance } = req.body;

    if (nombre.trim() == "") {
      res
        .status(400)
        .json({ mensaje: "Debe indicar un nombre para el nuevo usuario" });
      return false;
    }

    if (balance == "" || isNaN(balance)) {
      res.status(400).json({
        mensaje: "Debe indicar un valor numérico para el balance inicial",
      });
      return false;
    }
  }

  if (req.method == "PUT") {
    const id = req.query.id;
    const { name: nombre, balance } = req.body;

    if (id.trim() == "" || isNaN(id) || parseInt(id) < 1) {
      res
        .status(400)
        .json({ mensaje: "Debe indicar el ID del usuario a modificar" });
      return false;
    }

    if (nombre.trim() == "") {
      res
        .status(400)
        .json({ mensaje: "Debe indicar un nuevo nombre para el usuario" });
      return false;
    }

    if (balance == "" || isNaN(balance)) {
      res
        .status(400)
        .json({ mensaje: "Debe indicar un valor numérico para el balance" });
      return false;
    }
  }

  if (req.method == "DELETE") {
    const id = req.query.id;

    if (id.trim() == "" || isNaN(id) || parseInt(id) < 1) {
      res
        .status(500)
        .json({ mensaje: "Debe indicar el ID del usuario a eliminar" });
      return false;
    }
  }

  next();
});

// Registra un nuevo usuario
app.post("/usuario", async (req, res) => {
  const { nombre, balance } = req.body;
  const respuesta = await registrarUsuario({ nombre, balance });

  if (respuesta.rows) {
    res.status(201).json({
      message: "Usuario registrado exitosamente",
      usuario: respuesta.rows[0],
    });
  } else {
    res.status(400).json({
      message: "Ocurrió un error al querer registrar el usuario",
      error: respuesta,
    });
  }
});

// Modifica un usuario específico
app.put("/usuario", async (req, res) => {
  const id = req.query.id;
  const { name: nombre, balance } = req.body;
  const respuesta = await editarUsuario({ id, nombre, balance });

  if (respuesta.rows) {
    res.status(200).json({
      message: "Usuario modificado exitosamente",
      usuario: respuesta.rows[0],
    });
  } else {
    res.status(400).json({
      message: "Ocurrió un error al querer modificar el usuario",
      error: respuesta,
    });
  }
});

// Elimina el usuario específico
app.delete("/usuario", async (req, res) => {
  const id = req.query.id;

  // Verifica que el usuario a eliminar no tenga transferencias
  const tieneTransacciones = await usuarioTieneTransferencias(id);
  if (tieneTransacciones > 0) {
    res.status(409).json({
      message:
        "No se puede eliminar al usuario porque tiene transferencias realizadas/recibidas",
    });
    return;
  }

  const respuesta = await eliminarUsuario(id);

  if (respuesta.rows) {
    res.status(200).json({
      message: "Usuario eliminado exitosamente",
      usuario: respuesta.rows[0],
    });
  } else {
    res.status(400).json({
      message: "Ocurrió un error al querer eliminar el usuario",
      error: respuesta,
    });
  }
});

// Retorna el listado de transferencias registradas
app.get("/transferencias", async (req, res) => {
  const respuesta = await listarTransferencias();
  res.status(200).json(respuesta.rows);
});

// Validaciones generales para el método POST
app.use("/transferencia", (req, res, next) => {
  if (req.method == "POST") {
    const { emisor, receptor, monto } = req.body;

    if (emisor.trim() == "") {
      res.status(400).json({ mensaje: "Debe indicar el emisor" });
      return false;
    }

    if (receptor.trim() == "") {
      res.status(400).json({ mensaje: "Debe indicar el receptor" });
      return false;
    }

    if (emisor.trim() == receptor.trim()) {
      res.status(400).json({ mensaje: "El emisor no puede ser el receptor" });
      return false;
    }

    if (monto == "" || isNaN(monto)) {
      res
        .status(400)
        .json({ mensaje: "Debe indicar un valor numérico para el monto" });
      return false;
    }
  }

  if (req.method == "DELETE") {
    const id = req.query.id;

    if (id == "" || isNaN(id) || parseInt(id) < 1) {
      res.status(500).json({ mensaje: "Seleccione un ejercicio" });
      return false;
    }
  }

  next();
});

// Registra una nueva transferencias
app.post("/transferencia", async (req, res) => {
  const respuesta = await registrarTransferencia(req.body);

  if (!respuesta.code) {
    res.status(201).json({
      message: "Transferencia registrada exitosamente",
      transferencia: respuesta,
    });
  } else {
    res.status(400).json({
      message: "Ocurrió un error al querer registrar la transferencia",
      error: respuesta,
    });
  }
});
