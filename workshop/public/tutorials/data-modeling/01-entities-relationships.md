## Objetivo del paso

Vas a aprender a convertir una descripción en palabras ("la tienda vende productos etiquetados…") en tablas y relaciones. Al terminar sabrás:

1. Identificar **entidades** y **atributos** en unos requisitos.
2. Determinar la **cardinalidad** de cada relación con dos preguntas.
3. Implementar relaciones 1:N, N:M y 1:1.

## De los requisitos a las tablas

Lee estos requisitos de una funcionalidad nueva de la tienda:

> Los productos pueden tener **etiquetas** como "oferta", "novedad" o "eco". Un producto puede tener varias etiquetas y una etiqueta se usa en muchos productos. Cada etiqueta tiene un nombre único.

:::concept Entidades, atributos y relaciones
- Las **entidades** suelen ser los sustantivos con identidad propia: *producto*, *etiqueta*. Cada una será una tabla.
- Los **atributos** son los datos que describen a una entidad: el *nombre* de la etiqueta. Serán columnas.
- Las **relaciones** suelen ser los verbos o las frases que unen entidades: un producto *tiene* etiquetas.
:::

## Cardinalidad: dos preguntas

Para cada relación entre A y B, pregúntate:

1. ¿Un **A** puede tener **varios** B?
2. ¿Un **B** puede tener **varios** A?

| Respuestas | Cardinalidad | Cómo se implementa |
| --- | --- | --- |
| Sí / No | **1:N** | Clave foránea en B, apuntando a A |
| Sí / Sí | **N:M** | Tabla intermedia con una clave foránea hacia cada lado |
| No / No | **1:1** | Clave foránea **única** en una de las dos tablas |

Para productos y etiquetas: un producto puede tener varias etiquetas (sí) y una etiqueta está en varios productos (sí). Es **N:M**, como pedidos y productos, y necesita una tabla intermedia.

```sql run title="Etiquetas y su tabla intermedia"
CREATE TABLE tags (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE product_tags (
  product_id integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  tag_id integer NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX product_tags_tag_id_idx ON product_tags (tag_id);
```

:::tip ¿Por qué ON DELETE CASCADE aquí?
Una fila de `product_tags` solo dice "este producto tiene esta etiqueta". Si se borra el producto o la etiqueta, esa fila ya no significa nada, así que se borra con él. Compáralo con `order_items`: las líneas de un pedido son historia de ventas, y ahí **no** queremos cascada.
:::

```sql run title="Etiquetar y consultar"
INSERT INTO tags (name)
VALUES ('oferta'), ('novedad'), ('eco');

INSERT INTO product_tags (product_id, tag_id)
SELECT p.id, t.id
FROM products AS p
JOIN tags AS t ON t.name = 'oferta'
WHERE p.price < 20;

SELECT p.name, t.name AS tag
FROM product_tags AS pt
JOIN products AS p ON p.id = pt.product_id
JOIN tags AS t ON t.id = pt.tag_id;
```

## Relaciones 1:1

Pocas veces, una entidad se divide en dos tablas con relación 1:1. Por ejemplo, un perfil con datos opcionales del cliente que solo rellenan algunos, o datos sensibles que quieres separar y proteger con otros permisos:

```sql
CREATE TABLE customer_profiles (
  customer_id integer PRIMARY KEY REFERENCES customers (id) ON DELETE CASCADE,
  birth_date date,
  bio text
);
```

Que `customer_id` sea a la vez **clave primaria y foránea** garantiza que cada cliente tiene como mucho un perfil. Si no tienes un motivo claro para separar, una relación 1:1 suele ser simplemente columnas de la misma tabla.

## Retos

::::challenge Etiquetas de productos
Crea las tablas para etiquetar productos:

- `tags`: `id` (clave primaria generada) y `name` (texto obligatorio y **único**).
- `product_tags`: relaciona productos y etiquetas (N:M). Un producto no puede tener **dos veces** la misma etiqueta. Si se borra un producto o una etiqueta, sus filas de `product_tags` desaparecen.

```sql verify
SELECT 'etiqueta válida' AS item, workshop.try($$INSERT INTO tags (name) VALUES ('oferta')$$) AS outcome
UNION ALL
SELECT 'etiqueta repetida', workshop.try($$INSERT INTO tags (name) VALUES ('oferta'), ('oferta')$$)
UNION ALL
SELECT 'etiquetar un producto', workshop.try($$INSERT INTO tags (name) VALUES ('oferta'); INSERT INTO product_tags (product_id, tag_id) SELECT 1, id FROM tags$$)
UNION ALL
SELECT 'la misma etiqueta dos veces', workshop.try($$INSERT INTO tags (name) VALUES ('oferta'); INSERT INTO product_tags (product_id, tag_id) SELECT 1, id FROM tags; INSERT INTO product_tags (product_id, tag_id) SELECT 1, id FROM tags$$)
UNION ALL
SELECT 'etiqueta inexistente', workshop.try($$INSERT INTO product_tags (product_id, tag_id) VALUES (1, 999)$$)
UNION ALL
SELECT 'filas tras borrar la etiqueta', workshop.try($$INSERT INTO tags (name) VALUES ('oferta'); INSERT INTO product_tags (product_id, tag_id) SELECT 1, id FROM tags; DELETE FROM tags$$, $$SELECT count(*)::text FROM product_tags$$)
UNION ALL
SELECT 'filas tras borrar el producto', workshop.try($$INSERT INTO tags (name) VALUES ('oferta'); INSERT INTO product_tags (product_id, tag_id) SELECT 29, id FROM tags; DELETE FROM products WHERE id = 29$$, $$SELECT count(*)::text FROM product_tags$$);
```

:::hint
`product_tags` tiene dos claves foráneas (con `ON DELETE CASCADE`) y su clave primaria es la combinación de ambas.
:::

:::solution
```sql
CREATE TABLE tags (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE product_tags (
  product_id integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  tag_id integer NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

CREATE INDEX product_tags_tag_id_idx ON product_tags (tag_id);
```
:::
::::

::::challenge Cardinalidades de un gimnasio
Un gimnasio tiene **socios**, **entrenadores**, **clases** (yoga del lunes a las 19:00, spinning del martes…) y **reservas**. Cada clase la imparte un entrenador. Los socios reservan plaza en las clases, y hay que saber cuándo hicieron cada reserva. Cada socio tiene una ficha médica con datos que solo ve el personal sanitario. Para cada par de entidades relacionadas, ¿qué cardinalidad tiene y cómo la implementarías?

:::hint
Haz las dos preguntas para cada par: entrenador y clase, socio y clase, socio y ficha médica.
:::

:::solution
| Relación | Cardinalidad | Implementación |
| --- | --- | --- |
| Entrenador → clases | 1:N | `classes.trainer_id REFERENCES trainers (id)` |
| Socios ↔ clases | N:M | Tabla `bookings (member_id, class_id, booked_at)` con clave primaria `(member_id, class_id)` |
| Socio → ficha médica | 1:1 | `medical_records.member_id` como clave primaria y foránea |

La reserva es la tabla intermedia, y su fecha (`booked_at`) es un dato **de la relación**. La ficha médica va aparte porque tiene otros permisos de acceso: un buen motivo para una relación 1:1.
:::
::::

:::recap
- Sustantivos con identidad propia → **entidades** (tablas); datos que las describen → **atributos** (columnas); frases que las unen → **relaciones**.
- Dos preguntas dan la **cardinalidad**: ¿un A tiene varios B? ¿un B tiene varios A?
- **1:N**: clave foránea en el lado "muchos". **N:M**: tabla intermedia. **1:1**: clave foránea única (o clave primaria y foránea a la vez).
- Los datos de una relación N:M viven en la tabla intermedia.

En el siguiente paso verás qué pasa cuando los datos se duplican, y cómo evitarlo con la normalización.
:::
