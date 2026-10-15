## Qué vas a aprender

Saber escribir `CREATE TABLE` no te dice **qué tablas** crear. Esa decisión, el **modelo de datos**, es la que más dura en una aplicación: el código se reescribe, pero los datos y su forma se quedan durante años. Un buen modelo hace que las consultas sean sencillas y que los datos no se contradigan; uno malo te persigue en cada funcionalidad nueva.

- Pasar de unos requisitos a entidades, atributos y relaciones (1:1, 1:N, N:M).
- **Normalización** práctica: qué problemas causan los datos duplicados y cómo evitarlos, sin teoría de más.
- Cuándo **desnormalizar** a propósito (como el precio de cada línea de pedido).
- Migrar datos de una tabla mal diseñada a un modelo correcto.
- Patrones habituales: jerarquías, relaciones 1:1, tablas de referencia y columnas de auditoría.

## Requisitos previos

**Tablas y restricciones**: aquí diseñarás modelos y los crearás con `CREATE TABLE`, claves foráneas y restricciones.
