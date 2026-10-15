## Qué vas a aprender

Antes de escribir consultas conviene entender **cómo están organizados los datos**. Este tutorial es el cimiento de todo lo demás: qué es una base de datos relacional, cómo se guardan los datos en tablas, cómo se identifica cada fila y cómo se relacionan las tablas entre sí.

Trabajarás sobre la base de datos de una **tienda online** (clientes, categorías, productos, pedidos y líneas de pedido), la misma que usarás en los siguientes tutoriales. Es un PostgreSQL real que corre en tu navegador.

- Qué es una base de datos relacional, qué es SQL y por qué una aplicación no guarda sus datos en un archivo.
- Tablas, filas, columnas y **tipos de datos**, y por qué el tipo correcto importa.
- **Claves primarias**: cómo se identifica cada fila sin ambigüedad.
- **Claves foráneas**: cómo se relacionan las tablas y cómo la base de datos impide referencias rotas.
- **Restricciones** (`NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`): reglas que protegen tus datos aunque la aplicación tenga un error.

## Cómo funciona el workshop

:::tip Todo es interactivo
- Los bloques **Pruébalo** tienen un botón **Ejecutar** (o `Ctrl + Enter`). Puedes editar la consulta; **Restaurar** vuelve al código original.
- Los bloques marcados con **Error esperado** fallan a propósito: sirven para ver cómo la base de datos rechaza datos incorrectos.
- Los **retos** se comprueban solos con **Comprobar**. Tu respuesta y los retos resueltos se guardan en tu navegador.
- El botón **Datos** abre un panel con las tablas, sus columnas, sus filas y un diagrama de relaciones.
:::

:::warning Todavía no hace falta saber SQL
En este tutorial vas a ejecutar algunas consultas sencillas para ver los conceptos en acción. No te preocupes por entender cada palabra de la sintaxis: `SELECT`, `WHERE` e `INSERT` se explican en detalle en sus propios tutoriales. Fíjate en **qué hace** cada consulta y en lo que responde la base de datos.
:::

## Requisitos previos

Ninguno. Es el primer tutorial del workshop.
