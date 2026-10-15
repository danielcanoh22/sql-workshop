## Objetivo del paso

La **normalización** suena a teoría, pero resuelve un problema muy práctico: los datos duplicados acaban contradiciéndose. En este paso aprendes:

1. Qué problemas causa una tabla con datos repetidos.
2. Las reglas de la normalización, en palabras sencillas.
3. Cuándo duplicar un dato **a propósito** es lo correcto.
4. A migrar datos de una tabla mal diseñada a un modelo normalizado.

## Una tabla "cómoda" que se vuelve un problema

Imagina que alguien guardó los eventos de la tienda en una sola tabla, con todos los datos del lugar en cada fila:

```sql run title="Una tabla de eventos sin normalizar"
CREATE TABLE events_flat (
  event_name text NOT NULL,
  event_date date NOT NULL,
  venue_name text NOT NULL,
  venue_city text NOT NULL
);

INSERT INTO events_flat (event_name, event_date, venue_name, venue_city)
VALUES ('Feria del libro', '2025-04-23', 'Palacio de Congresos', 'Madrid'),
       ('Concierto de primavera', '2025-05-10', 'Auditorio Nacional', 'Madrid'),
       ('Taller de cerámica', '2025-05-17', 'Centro Cultural Norte', 'Bogotá'),
       ('Taller de fotografía', '2025-06-07', 'Centro Cultural Norte', 'Bogotá'),
       ('Concierto de otoño', '2025-10-04', 'Auditorio Nacional', 'Madrid'),
       ('Feria del libro', '2026-04-23', 'Palacio de Congresos', 'Madrid');

SELECT event_name, event_date, venue_name, venue_city
FROM events_flat;
```

Funciona, y para leer es cómodo. Pero la ciudad de cada lugar está **repetida** en varias filas. Mira qué pasa si el *Centro Cultural Norte* se muda y alguien actualiza solo una fila:

```sql run title="Actualizar solo una de las copias"
UPDATE events_flat
SET venue_city = 'Medellín'
WHERE event_name = 'Taller de cerámica';

SELECT DISTINCT venue_name, venue_city
FROM events_flat
WHERE venue_name = 'Centro Cultural Norte';
```

Ahora el mismo lugar está en **dos ciudades a la vez**. ¿Cuál es la verdadera? La base de datos no lo sabe, y ningún `CHECK` puede evitarlo.

:::concept Anomalías de una tabla sin normalizar
- **De actualización**: un dato repetido se cambia en unas copias y no en otras (lo que acabas de ver).
- **De inserción**: no puedes registrar un lugar nuevo hasta que tenga algún evento.
- **De borrado**: si borras el último evento de un lugar, pierdes también los datos del lugar.
:::

## Las reglas, en palabras sencillas

Las formas normales tienen definiciones formales, pero en la práctica se resumen así:

| Regla | Significa | Ejemplo de lo que hay que evitar |
| --- | --- | --- |
| **1FN** | Cada celda guarda **un solo valor** | Una columna `tags` con `'oferta,novedad,eco'` |
| **2FN y 3FN** | Cada columna describe **la entidad de su tabla**, no otra | `venue_city` en la tabla de eventos describe al **lugar**, no al evento |

Una forma de recordarlo: cada columna debe depender de **la clave, toda la clave y nada más que la clave**.

:::warning Listas dentro de una columna
Guardar `'oferta,novedad,eco'` en una columna parece práctico hasta que necesitas "todos los productos con la etiqueta *eco*": tendrías que buscar con `LIKE '%eco%'` (que también encontraría *ecológico*), no podrías usar índices normales, ni impedir etiquetas inexistentes con una clave foránea. Una lista de cosas es casi siempre una **tabla intermedia**, como `product_tags`.
:::

La solución para los eventos es separar el lugar en su propia tabla: cada lugar se guarda **una vez**, y cada evento lo referencia por su `id`.

## Desnormalizar a propósito

Mira la tabla `order_items` de la tienda: guarda `unit_price`, aunque el precio ya está en `products`. ¿Es un error de normalización?

```sql run title="El precio de una línea no es el precio actual"
UPDATE products
SET price = round(price * 1.10, 2)
WHERE id = 10;

SELECT p.name, p.price AS current_price, oi.order_id, oi.unit_price
FROM order_items AS oi
JOIN products AS p ON p.id = oi.product_id
WHERE p.id = 10
LIMIT 3;
```

No es un error: `unit_price` es **el precio en el momento de la venta**, un dato distinto del precio actual. Si el pedido leyera el precio de `products`, cada subida de precios cambiaría el importe de todos los pedidos pasados, y las facturas ya emitidas dejarían de cuadrar.

:::tip Cuándo duplicar es correcto
Duplicar un dato está bien cuando **representa otra cosa**: una foto del valor en un momento (el precio de venta, la dirección de envío de un pedido). Duplicar solo para ahorrarte un JOIN casi nunca compensa: los JOINs por clave con índice son muy rápidos, y los datos contradictorios son muy caros de arreglar.
:::

## Retos

::::challenge Normalizar los eventos
La corrección crea la tabla `events_flat` con los seis eventos de arriba (puedes crearla tú en el editor con el primer bloque de este paso para probar). Crea un modelo normalizado y **migra los datos**:

- `venues`: `id` (clave primaria generada), `name` (texto obligatorio y **único**) y `city` (texto obligatorio).
- `events`: `id` (clave primaria generada), `name` (texto obligatorio), `event_date` (fecha obligatoria) y `venue_id` (obligatorio, referencia a `venues`).
- Copia los datos de `events_flat`: cada lugar una sola vez, y cada evento apuntando a su lugar.

Si en el editor ejecutaste el ejemplo que muda el *Centro Cultural Norte* a Medellín, ese lugar tendrá dos ciudades y tu migración chocará con el `UNIQUE`: es exactamente la anomalía de este paso. Pulsa **Restablecer** en el panel **Datos** y vuelve a crear `events_flat` antes de probar. La corrección siempre usa los datos originales.

```sql setup
CREATE TABLE events_flat (
  event_name text NOT NULL,
  event_date date NOT NULL,
  venue_name text NOT NULL,
  venue_city text NOT NULL
);

INSERT INTO events_flat (event_name, event_date, venue_name, venue_city)
VALUES ('Feria del libro', '2025-04-23', 'Palacio de Congresos', 'Madrid'),
       ('Concierto de primavera', '2025-05-10', 'Auditorio Nacional', 'Madrid'),
       ('Taller de cerámica', '2025-05-17', 'Centro Cultural Norte', 'Bogotá'),
       ('Taller de fotografía', '2025-06-07', 'Centro Cultural Norte', 'Bogotá'),
       ('Concierto de otoño', '2025-10-04', 'Auditorio Nacional', 'Madrid'),
       ('Feria del libro', '2026-04-23', 'Palacio de Congresos', 'Madrid');
```

```sql verify
SELECT e.name AS item, e.event_date::text AS detail, v.name AS venue, v.city
FROM events AS e
JOIN venues AS v ON v.id = e.venue_id
UNION ALL
SELECT 'lugares', (SELECT count(*)::text FROM venues), NULL, NULL
UNION ALL
SELECT 'lugar repetido', workshop.try($$INSERT INTO venues (name, city) VALUES ('Auditorio Nacional', 'Madrid')$$), NULL, NULL
UNION ALL
SELECT 'evento en un lugar inexistente', workshop.try($$INSERT INTO events (name, event_date, venue_id) VALUES ('X', '2025-01-01', 999)$$), NULL, NULL;
```

:::hint
Crea primero las dos tablas. Para los lugares, `INSERT INTO venues (name, city) SELECT DISTINCT venue_name, venue_city FROM events_flat`.
:::

:::hint
Para los eventos necesitas el `id` de cada lugar: une `events_flat` con `venues` por el nombre del lugar en un `INSERT ... SELECT`.
:::

:::solution
```sql
CREATE TABLE venues (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  city text NOT NULL
);

CREATE TABLE events (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  event_date date NOT NULL,
  venue_id integer NOT NULL REFERENCES venues (id)
);

CREATE INDEX events_venue_id_idx ON events (venue_id);

INSERT INTO venues (name, city)
SELECT DISTINCT venue_name, venue_city
FROM events_flat;

INSERT INTO events (name, event_date, venue_id)
SELECT f.event_name, f.event_date, v.id
FROM events_flat AS f
JOIN venues AS v ON v.name = f.venue_name;
```
Es exactamente lo que hace una migración real cuando se corrige un mal diseño: crear las tablas nuevas, copiar los datos con `INSERT ... SELECT` y, en un paso posterior, borrar la tabla antigua. Ahora la ciudad de cada lugar vive en un solo sitio: cambiarla es un `UPDATE` de una fila.
:::
::::

:::recap
- Los datos repetidos producen **anomalías**: copias que se contradicen, datos que no se pueden crear o que se pierden al borrar.
- **1FN**: un valor por celda; una lista es una tabla intermedia.
- **2FN/3FN**: cada columna describe la entidad de su tabla; lo que describe a otra cosa va en otra tabla.
- **Desnormalizar** está bien cuando el dato duplicado representa otra cosa, como el precio en el momento de la venta.
- Corregir un mal diseño es una migración: tablas nuevas, `INSERT ... SELECT` y después borrar la antigua.

En el siguiente paso verás patrones de modelado que aparecen en casi todas las aplicaciones.
:::
