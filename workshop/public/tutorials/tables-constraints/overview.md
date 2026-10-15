## Qué vas a aprender

Hasta ahora usaste las tablas de la tienda tal como venían. En este tutorial creas las tuyas, y lo más importante: les pones las **reglas** que impiden guardar datos incorrectos, para que la base de datos los proteja aunque la aplicación tenga errores.

- Crear tablas con `CREATE TABLE`: tipos, claves primarias generadas, valores por defecto.
- Declarar restricciones: `NOT NULL`, `UNIQUE`, `CHECK`, claves foráneas y qué hacer al borrar (`ON DELETE`).
- Modificar tablas existentes con `ALTER TABLE` sin perder datos, y qué pasa cuando los datos actuales no cumplen una regla nueva.
- Borrar tablas con `DROP TABLE`.

## Requisitos previos

**El modelo relacional** (claves y restricciones, vistas desde fuera) y **Modificar datos** (`INSERT`, `UPDATE`, `DELETE`).

:::tip Cómo se corrigen estos retos
En los retos de este tutorial creas o cambias tablas. La corrección no mira cómo lo escribiste, sino **cómo se comporta** tu tabla: intenta insertar datos válidos e inválidos y comprueba qué acepta y qué rechaza. Si algo falla, verás una tabla con cada comprobación, lo que hizo tu tabla y lo que se esperaba (`ok`, `not null`, `unique`, `check`, `foreign key`…).
:::
