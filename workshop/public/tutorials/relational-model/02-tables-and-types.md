## Objetivo del paso

Una tabla no es una hoja de cálculo donde cada celda admite cualquier cosa: cada columna tiene un **tipo** y la base de datos lo hace respetar. En este paso aprendes:

1. Las partes de una tabla: filas, columnas y tipos.
2. Los tipos que más vas a usar en una aplicación.
3. Por qué elegir bien el tipo evita errores que no darían ningún aviso.

## Filas, columnas y tipos

Abre el panel **Datos**, pestaña **Tablas**, y mira `products`:

| Columna | Tipo | Qué guarda |
| --- | --- | --- |
| `id` | `integer` | Número que identifica el producto |
| `name` | `text` | Nombre |
| `category_id` | `integer` | Categoría a la que pertenece |
| `price` | `numeric(10,2)` | Precio exacto con dos decimales |
| `stock` | `integer` | Unidades disponibles |
| `is_active` | `boolean` | Si está a la venta |

:::concept El esquema de una tabla
Las columnas y sus tipos forman el **esquema** de la tabla: la forma que deben tener **todas** sus filas. A diferencia de una hoja de cálculo, no puedes guardar un texto en `price` ni dejar una fila con una columna de más. Esa rigidez es una ventaja: los datos son predecibles y la base de datos rechaza lo que no encaja.
:::

Pulsa **Ver filas** en `products` dentro del panel: cada fila es un producto y todas tienen exactamente esas seis columnas.

## Los tipos que más vas a usar

| Tipo | Para qué | Ejemplo |
| --- | --- | --- |
| `integer` / `bigint` | Números enteros: ids, cantidades | `42` |
| `numeric(p, s)` | Números **exactos** con decimales: dinero | `59.90` |
| `text` | Textos de cualquier longitud | `'Teclado mecánico'` |
| `boolean` | Verdadero o falso | `true` |
| `date` | Una fecha (día) | `'2025-03-01'` |
| `timestamptz` | Un instante (fecha y hora con zona horaria) | `'2025-03-01 14:30:00+01'` |

:::postgres text y varchar
En PostgreSQL, `text` y `varchar` funcionan igual de rápido. `varchar(100)` solo añade un límite de longitud. Usa `text` salvo que el límite sea una regla de negocio real (por ejemplo, un código de país de 2 letras).
:::

## Por qué el tipo importa

### Los números guardados como texto se ordenan mal

Comparar `'10'` con `'9'` **como textos** compara carácter a carácter: `'1'` va antes que `'9'`, así que `'10'` es "menor". Como números, obviamente no:

```sql run title="10 y 9: como texto y como número"
SELECT '10' < '9' AS as_text, 10 < 9 AS as_number;
```

Si guardaras precios o cantidades como texto, ordenar o comparar daría resultados absurdos **sin ningún error**.

### El dinero no se guarda en `float`

Los tipos `real` y `double precision` (*float*) son aproximados: guardan los números en binario y muchos decimales no se pueden representar exactamente. `numeric` es exacto:

```sql run title="0.1 + 0.2 con float y con numeric"
SELECT 0.1::float8 + 0.2::float8 AS float_sum,
       0.1::numeric + 0.2::numeric AS numeric_sum;
```

`0.30000000000000004` parece un detalle, pero sumando miles de importes acaba en céntimos que no cuadran. **El dinero siempre en `numeric`.** (El `::` convierte un valor a otro tipo; lo usamos aquí solo para la demostración.)

### Las fechas son fechas, no textos

Con un tipo `date` la base de datos sabe hacer cálculos con fechas:

```sql run title="Días entre dos fechas"
SELECT DATE '2025-03-01' - DATE '2025-02-01' AS days;
```

Sabe que febrero de 2025 tiene 28 días. Con fechas guardadas como texto tendrías que programar el calendario tú.

### La base de datos rechaza lo que no encaja

Si intentas guardar un texto en una columna numérica, PostgreSQL lo rechaza. Este bloque intenta crear un producto con precio `'barato'`:

```sql run error title="Un texto en una columna numérica"
INSERT INTO products (name, category_id, price, stock)
VALUES ('Lápiz', 1, 'barato', 10);
```

El mensaje dice exactamente qué falló: `invalid input syntax for type numeric`. Con una hoja de cálculo, ese "barato" se habría guardado tranquilamente.

## Retos

::::challenge Un año bisiesto
Usa una consulta como la de los días entre dos fechas para calcular cuántos días hay entre el **1 de enero de 2024** y el **1 de marzo de 2024**. Ponle a la columna el nombre `days`.

```sql starter
SELECT DATE '2025-03-01' - DATE '2025-02-01' AS days;
```

:::hint
Cambia las dos fechas. El formato es `'AAAA-MM-DD'`.
:::

:::solution
```sql
SELECT DATE '2024-03-01' - DATE '2024-01-01' AS days;
```
El resultado es 60: 31 días de enero más 29 de febrero, porque 2024 es bisiesto. La base de datos lo sabe porque las fechas son de tipo `date`.
:::
::::

::::challenge Elige los tipos
Una aplicación de eventos guarda, para cada evento: su nombre, la fecha y hora de inicio, el precio de la entrada, el aforo máximo y si está publicado. ¿Qué tipo de PostgreSQL usarías para cada columna?

:::hint
Piensa en cuál necesita ser exacto con decimales y cuál necesita guardar también la hora.
:::

:::solution
| Columna | Tipo | Por qué |
| --- | --- | --- |
| `name` | `text` | Texto libre. |
| `starts_at` | `timestamptz` | Necesita fecha **y hora**, y la zona horaria importa si hay asistentes en distintos países. |
| `ticket_price` | `numeric(10,2)` | Es dinero: exacto. |
| `capacity` | `integer` | Un número entero de personas. |
| `is_published` | `boolean` | Sí o no. |
:::
::::

:::recap
- Una tabla tiene un **esquema**: columnas con un tipo que todas las filas respetan.
- Tipos habituales: `integer`, `numeric` (dinero), `text`, `boolean`, `date` y `timestamptz`.
- Elegir mal el tipo produce errores silenciosos: números ordenados como texto, céntimos perdidos con `float`.
- La base de datos **rechaza** los valores que no encajan con el tipo de la columna.

En el siguiente paso verás cómo se identifica cada fila de una tabla sin ambigüedad: la clave primaria.
:::
