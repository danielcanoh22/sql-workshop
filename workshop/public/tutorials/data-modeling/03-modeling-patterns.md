## Objetivo del paso

Ciertas decisiones de modelado se repiten en casi todas las aplicaciones. Conocerlas te ahorra reinventarlas (y equivocarte). En este paso aprendes:

1. Jerarquías con una clave foránea a la propia tabla.
2. Valores de una lista cerrada: `CHECK` o tabla de referencia.
3. Columnas de auditoría: `created_at` y `updated_at`.
4. Qué diseños conviene evitar.

## Jerarquías: una tabla que se apunta a sí misma

Las categorías suelen tener subcategorías: *Electrónica* → *Portátiles*. No hace falta una tabla por nivel: basta una clave foránea a la **misma** tabla.

```sql run title="Subcategorías con parent_id"
ALTER TABLE categories
ADD COLUMN parent_id integer REFERENCES categories (id);

CREATE INDEX categories_parent_id_idx ON categories (parent_id);

INSERT INTO categories (name, parent_id)
VALUES ('Portátiles', 1), ('Accesorios', 1), ('Novela', 2);

SELECT child.name AS category, parent.name AS parent
FROM categories AS child
LEFT JOIN categories AS parent ON parent.id = child.parent_id
ORDER BY child.id;
```

Las categorías de primer nivel tienen `parent_id = NULL`. Para ver cada categoría junto a su padre, la tabla se une **consigo misma** con dos alias (`child` y `parent`): es un *self-join*. Para recorrer una jerarquía de cualquier profundidad (abuelos, bisabuelos…) se usan las CTEs recursivas, en el bloque opcional de la parte de PostgreSQL.

## Listas cerradas: `CHECK` o tabla de referencia

El estado de un pedido solo puede ser uno de unos pocos valores. Hay dos formas habituales de modelarlo:

| | `CHECK (status IN (...))` | Tabla de referencia `order_statuses` |
| --- | --- | --- |
| Ejemplo | Lo que usa la tienda | `status_id REFERENCES order_statuses (id)` |
| Añadir un valor | Cambiar el `CHECK` (una migración) | Un `INSERT` |
| Datos extra por valor | No | Sí: nombre para mostrar, orden, color… |
| Cuándo | Lista pequeña, estable y ligada a la lógica del código | Lista que gestiona el negocio o que necesita atributos |

Los estados de un pedido forman parte de la lógica de la aplicación (cada uno dispara acciones distintas), así que un `CHECK` encaja. Una lista de países o de motivos de devolución, que el negocio amplía, encaja mejor en una tabla.

## Columnas de auditoría

Saber **cuándo** se creó y se modificó cada fila resuelve muchas dudas ("¿desde cuándo tiene este precio?"). Es tan habitual que conviene añadirlo a casi todas las tablas desde el principio:

```sql
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now()
```

`created_at` se rellena solo con el `DEFAULT`. `updated_at` hay que actualizarlo en cada `UPDATE`: lo hace la aplicación (`SET ..., updated_at = now()`) o un *trigger*, que verás en el bloque opcional.

## Diseños que conviene evitar

- **Una tabla por cliente, por año o por tipo** (`orders_2024`, `orders_2025`): las consultas tendrían que unir tablas que deberían ser una. Usa una columna (`order_date`) y filtra.
- **Columnas numeradas** (`phone1`, `phone2`, `phone3`): es una lista disfrazada. ¿Y si alguien tiene cuatro? Es una tabla 1:N.
- **El modelo "entidad-atributo-valor"**: una tabla genérica `(entity, attribute, value)` para guardar "cualquier cosa". Pierde los tipos, las restricciones y la posibilidad de consultar con SQL normal. Para atributos realmente variables, PostgreSQL tiene `JSONB`, que verás en su parte.

## Retos

::::challenge Subcategorías
Añade a `categories` una columna `parent_id` que referencie a la propia tabla (opcional: las categorías de primer nivel no tienen padre) y crea la subcategoría **Portátiles** dentro de **Electrónica** (id 1).

```sql verify
SELECT child.name AS category, parent.name AS parent
FROM categories AS child
LEFT JOIN categories AS parent ON parent.id = child.parent_id
UNION ALL
SELECT 'padre inexistente', workshop.try($$INSERT INTO categories (name, parent_id) VALUES ('Huérfana', 999)$$);
```

:::hint
`ALTER TABLE categories ADD COLUMN parent_id integer REFERENCES categories (id)`. Después, un `INSERT` con `parent_id = 1`.
:::

:::solution
```sql
ALTER TABLE categories
ADD COLUMN parent_id integer REFERENCES categories (id);

CREATE INDEX categories_parent_id_idx ON categories (parent_id);

INSERT INTO categories (name, parent_id)
VALUES ('Portátiles', 1);
```
:::
::::

::::challenge Perfil del cliente
Crea la tabla `customer_profiles` para datos opcionales del cliente, con relación **1:1**:

- `customer_id`: referencia a `customers`; cada cliente tiene **como mucho un** perfil. Si se borra el cliente, se borra su perfil.
- `birth_date`: fecha, opcional.
- `bio`: texto, opcional.

```sql verify
SELECT 'columna ' || column_name AS item,
       data_type || CASE WHEN is_nullable = 'NO' THEN ', obligatoria' ELSE '' END AS outcome
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customer_profiles'
UNION ALL
SELECT 'perfil válido', workshop.try($$INSERT INTO customer_profiles (customer_id, bio) VALUES (1, 'Lectora')$$)
UNION ALL
SELECT 'segundo perfil del mismo cliente', workshop.try($$INSERT INTO customer_profiles (customer_id) VALUES (1), (1)$$)
UNION ALL
SELECT 'cliente inexistente', workshop.try($$INSERT INTO customer_profiles (customer_id) VALUES (999)$$)
UNION ALL
SELECT 'perfiles tras borrar al cliente', workshop.try($$INSERT INTO customer_profiles (customer_id) VALUES (30); DELETE FROM customers WHERE id = 30$$, $$SELECT count(*)::text FROM customer_profiles$$);
```

:::hint
Que `customer_id` sea la **clave primaria** y, a la vez, una clave foránea garantiza la relación 1:1.
:::

:::solution
```sql
CREATE TABLE customer_profiles (
  customer_id integer PRIMARY KEY REFERENCES customers (id) ON DELETE CASCADE,
  birth_date date,
  bio text
);
```
:::
::::

:::recap
- Una **jerarquía** se modela con una clave foránea a la propia tabla (`parent_id`) y se consulta con un *self-join*.
- Listas cerradas: `CHECK` si son pocas, estables y ligadas al código; **tabla de referencia** si el negocio las amplía o necesitan atributos.
- Añade `created_at` y `updated_at` (`timestamptz`) a casi todas las tablas.
- Evita tablas por periodo, columnas numeradas y el modelo entidad-atributo-valor.

En el último paso diseñarás desde cero el esquema completo de otra aplicación.
:::
