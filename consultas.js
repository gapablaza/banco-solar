const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  password: "postgres",
  host: "localhost",
  database: "bancosolar",
  port: 5432,
});

// Registra un nuevo usuario
// TODO: validar que el nombre no se repita (modificar tabla DB con UNIQUE al nombre de usuario)
const registrarUsuario = async (nuevoUsuario) => {
  const { nombre, balance } = nuevoUsuario;

  try {
    const config = {
      text: "INSERT INTO usuarios(nombre, balance) VALUES($1, $2) RETURNING *",
      values: [nombre, balance],
    };
    const resp = await pool.query(config);
    return resp;
  } catch (error) {
    console.log(error);
    return error;
  }
};

// Retorna el listado de usuarios registrados
const listarUsuarios = async () => {
  try {
    const query =
      "SELECT u.id, u.nombre, u.balance FROM usuarios AS u ORDER BY u.nombre;";
    const resp = await pool.query(query);
    return resp;
  } catch (error) {
    return error;
  }
};

// Modifica un usuario específico
// TODO: validar que el nombre no se repita (modificar tabla DB con UNIQUE al nombre de usuario)
const editarUsuario = async (usuarioModificado) => {
  const { id, nombre, balance } = usuarioModificado;

  try {
    const config = {
      text: "UPDATE usuarios SET nombre = $1, balance = $2 WHERE id = $3 RETURNING *",
      values: [nombre, balance, id],
    };
    const resp = await pool.query(config);
    return resp;
  } catch (error) {
    return error;
  }
};

// Elimina el usuario específico
// TODO: no eliminar si es que tiene historial de transferencias
const eliminarUsuario = async (id) => {
  try {
    await pool.query("BEGIN");

    // const configTransferencias = {
    //     text: "DELETE FROM transferencias WHERE emisor = $1 OR receptor = $1;",
    //     values: [id]
    // };
    // const respTransferencias = await pool.query(configTransferencias);

    const configUsuario = {
      text: "DELETE FROM usuarios WHERE id = $1 RETURNING *",
      values: [id],
    };
    const respUsuario = await pool.query(configUsuario);

    await pool.query("COMMIT");
    return respUsuario;
  } catch (error) {
    console.log(error);
    return error;
  }
};

// Registra una nueva transferencias
const registrarTransferencia = async (transferencia) => {
  const { emisor, receptor, monto } = transferencia;

  try {
    await pool.query("BEGIN");
    const configTransferencia = {
      text: `
                INSERT
                INTO
                    transferencias
                    (
                        emisor
                    , receptor
                    , monto
                    , fecha
                    )
                    VALUES
                    (
                    (
                        SELECT
                            u.id
                        FROM
                            usuarios AS u
                        WHERE
                            u.nombre = $1
                    )
                , (
                        SELECT
                            u.id
                        FROM
                            usuarios AS u
                        WHERE
                            u.nombre = $2)
                , $3
                , NOW()
                    )
                    RETURNING *;`,
      values: [emisor, receptor, monto],
    };
    const respTransferencia = await pool.query(configTransferencia);

    const configEmisor = {
      text: `
                UPDATE
                    usuarios
                SET
                    balance = balance - $1
                WHERE
                    id = (
                    (
                        SELECT
                            u.id
                        FROM
                            usuarios AS u
                        WHERE
                            u.nombre = $2)) RETURNING *;`,
      values: [monto, emisor],
    };
    const respEmisor = await pool.query(configEmisor);

    const configReceptor = {
      text: `
                UPDATE
                    usuarios
                SET
                    balance = balance + $1
                WHERE
                    id = (
                    (
                        SELECT
                            u.id
                        FROM
                            usuarios AS u
                        WHERE
                            u.nombre = $2)) RETURNING *;`,
      values: [monto, receptor],
    };
    const respReceptor = await pool.query(configReceptor);

    await pool.query("COMMIT");
    return { transferencia: respTransferencia.rows[0] };
  } catch (error) {
    await pool.query("ROLLBACK");
    console.log(error);
    return error;
  }
};

// Retorna el listado de transferencias registradas
const listarTransferencias = async () => {
  try {
    const config = {
      text: `
                SELECT
                    t.id
                , u_emisor.nombre   AS nombre_emisor
                , u_receptor.nombre AS nombre_receptor
                , t.monto
                , t.fecha
                , t.emisor   AS id_emisor
                , t.receptor AS id_emisor
                FROM
                    transferencias AS t
                LEFT JOIN
                    usuarios AS u_emisor
                ON
                    u_emisor.id = t.emisor
                LEFT JOIN
                    usuarios AS u_receptor
                ON
                    u_receptor.id = t.receptor
                ORDER BY
                    t.fecha;`,
      rowMode: "array",
    };
    const resp = await pool.query(config);
    return resp;
  } catch (error) {
    return error;
  }
};

// Retorna la cantidad de transferencias que tiene un usuario
const usuarioTieneTransferencias = async (id) => {
  const config = {
    text: "SELECT COUNT(t.id) AS q FROM transferencias AS t WHERE t.emisor = $1 OR t.receptor = $1;",
    values: [id],
    rowMode: "array",
  };
  resp = await pool.query(config);
  return resp.rows[0][0];
};

module.exports = {
  registrarUsuario,
  listarUsuarios,
  editarUsuario,
  eliminarUsuario,
  registrarTransferencia,
  listarTransferencias,
  usuarioTieneTransferencias,
};
