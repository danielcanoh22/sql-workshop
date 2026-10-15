## Objetivo del paso

Una aplicación casi nunca quiere **todas** las filas: quiere los productos de una categoría, los clientes activos, los pedidos de este mes. En este paso aprendes a filtrar con `WHERE`:

1. Comparar números, textos, fechas y booleanos.
2. Combinar condiciones con `AND`, `OR` y `NOT`.
3. Evitar el error más común al mezclar `AND` y `OR`.

## Cómo funciona `WHERE`

`WHERE` va después de `FROM` y lleva una **condición**:

```sql
SELECT columnas
FROM tabla
WHERE condición;
```

:::concept La condición se evalúa fila a fila
PostgreSQL recorre las filas de la tabla y, para cada una, evalúa la condición. Solo las filas para las que la condición es **verdadera** pasan al resultado. Las demás se descartan.
:::

```sql run title="Clientes de México"
SELECT first_name, last_name, city
FROM customers
WHERE country = 'México';
```

## Operadores de comparación

| Operador | Significa | Ejemplo |
| --- | --- | --- |
| `=` | igual a | `country = 'Chile'` |
| `<>` | distinto de | `status <> 'cancelled'` |
| `<` / `>` | menor / mayor que | `price > 50` |
| `<=` / `>=` | menor o igual / mayor o igual | `stock <= 10` |

Con números se escriben tal cual, sin comillas:

```sql run title="Productos de más de 50"
SELECT name, price
FROM products
WHERE price > 50;
```

Con textos, entre **comillas simples**. La comparación distingue mayúsculas: `'madrid'` no es igual a `'Madrid'`.

```sql run title="Comparar textos"
SELECT first_name, city
FROM customers
WHERE city = 'Madrid';
```

:::troubleshooting Comillas dobles en un texto
Prueba a cambiar `'Madrid'` por `"Madrid"` en el bloque anterior y ejecuta. El error `column "Madrid" does not exist` aparece porque las comillas dobles indican un **nombre de columna**, no un texto. Si ves ese error con un valor que debería ser texto, revisa las comillas.
:::

## Fechas

Las fechas se escriben como texto en formato **ISO**: `'AAAA-MM-DD'`. PostgreSQL las convierte a fecha al compararlas con una columna de tipo `date`:

```sql run title="Clientes dados de alta desde 2025"
SELECT first_name, last_name, signup_date
FROM customers
WHERE signup_date >= '2025-01-01';
```

:::tip Usa siempre el formato ISO
`'2025-01-01'` no tiene ambigüedad. Formatos como `'01/02/2025'` dependen de la configuración regional del servidor: ¿es 1 de febrero o 2 de enero? Evítalos.
:::

## Booleanos

Una columna `boolean` ya **es** una condición, así que no necesitas compararla con nada:

```sql run title="Productos que no están a la venta"
SELECT name, is_active
FROM products
WHERE NOT is_active;
```

`WHERE is_active` equivale a `WHERE is_active = true`, pero se lee mejor. `NOT` invierte la condición.

## Combinar condiciones: `AND`, `OR` y `NOT`

| Operador | La fila pasa si… |
| --- | --- |
| `a AND b` | se cumplen **las dos** condiciones |
| `a OR b` | se cumple **al menos una** |
| `NOT a` | **no** se cumple `a` |

```sql run title="Electrónica con stock"
SELECT name, price, stock
FROM products
WHERE category_id = 1 AND stock > 0;
```

El `1` es el `id` de la categoría Electrónica; lo puedes ver en el panel **Datos**, en las filas de `categories`. Cuando aprendas JOINs podrás filtrar por el nombre de la categoría directamente.

## La trampa de la precedencia

Queremos los **libros (categoría 2) o juguetes (categoría 6) que cuesten menos de 20**. Esta consulta parece correcta:

```sql run title="Versión con un error escondido"
SELECT name, category_id, price
FROM products
WHERE category_id = 2 OR category_id = 6 AND price < 20;
```

Mira el resultado: aparece *Don Quijote de la Mancha*, que cuesta 24. ¿Por qué?

:::concept AND se evalúa antes que OR
Igual que en matemáticas la multiplicación va antes que la suma, en SQL **`AND` tiene más precedencia que `OR`**. PostgreSQL leyó la condición así:

```sql
category_id = 2 OR (category_id = 6 AND price < 20)
```

Es decir: "todos los libros, cueste lo que cueste, o los juguetes baratos".
:::

La solución es poner **paréntesis** para decir exactamente lo que quieres:

```sql run title="Versión correcta"
SELECT name, category_id, price
FROM products
WHERE (category_id = 2 OR category_id = 6) AND price < 20;
```

:::tip Regla práctica
Siempre que mezcles `AND` y `OR` en la misma condición, **usa paréntesis**, aunque creas que no hacen falta. Quien lea tu consulta (incluido tú dentro de tres meses) no tendrá que recordar reglas de precedencia.
:::

:::warning Cuando el valor lo escribe el usuario
En una aplicación, el valor del filtro muchas veces viene del usuario: el texto de un buscador, un país elegido en un desplegable. **Nunca construyas la consulta pegando ese texto** (`"... WHERE country = '" + input + "'"`): es la puerta a la **inyección SQL**, uno de los ataques más comunes. Se usan **parámetros** (`WHERE country = $1`) y el valor viaja por separado. Lo verás a fondo en el tutorial de parámetros; por ahora, quédate con la regla.
:::

## Retos

::::challenge Productos baratos
Muestra el **nombre** y el **precio** de los productos que cuestan **menos de 20**.

:::hint
El operador "menor que" es `<`. Los números se escriben sin comillas.
:::

:::solution
```sql
SELECT name, price
FROM products
WHERE price < 20;
```
Son 9 productos. Fíjate en que *Puzzle 1000 piezas* (19.00) entra y que si hubiera uno de exactamente 20 no entraría: `<` no incluye el límite, `<=` sí.
:::
::::

::::challenge Clientes inactivos
Muestra el **nombre**, el **apellido** y el **email** de los clientes que **no están activos**.

:::hint
La columna `is_active` es un booleano: no hace falta compararla con nada.
:::

:::solution
```sql
SELECT first_name, last_name, email
FROM customers
WHERE NOT is_active;
```
`WHERE is_active = false` también es correcto, pero `NOT is_active` se lee como una frase: "donde no está activo".
:::
::::

::::challenge Clientes recientes de España
Muestra el **nombre**, el **apellido** y la **fecha de alta** de los clientes de **España** que se dieron de alta **a partir del 1 de julio de 2024** (incluido ese día).

:::hint
Necesitas dos condiciones que se cumplan a la vez: una sobre `country` y otra sobre `signup_date`.
:::

:::hint
"A partir de, incluido" es `>=`. La fecha se escribe `'2024-07-01'`.
:::

:::solution
```sql
SELECT first_name, last_name, signup_date
FROM customers
WHERE country = 'España' AND signup_date >= '2024-07-01';
```
El orden de las condiciones de un `AND` no cambia el resultado: `signup_date >= '2024-07-01' AND country = 'España'` es exactamente lo mismo.
:::
::::

::::challenge Libros y juguetes baratos
Muestra el **nombre** y el **precio** de los productos que son **libros o juguetes** (categorías 2 y 6) y cuestan **menos de 20**. Cuidado con la precedencia.

:::hint
Necesitas un `OR` (libro o juguete) y un `AND` (y barato). ¿Qué se evalúa primero?
:::

:::hint
Agrupa el `OR` entre paréntesis para que se evalúe antes que el `AND`.
:::

:::solution
```sql
SELECT name, price
FROM products
WHERE (category_id = 2 OR category_id = 6) AND price < 20;
```
Sin paréntesis el resultado incluiría *Don Quijote de la Mancha* (24.00), porque `AND` se evalúa antes que `OR`. En el siguiente paso verás una forma más corta de escribir `category_id = 2 OR category_id = 6`.
:::
::::

:::recap
- `WHERE condición` se evalúa **fila a fila**; solo pasan las filas donde la condición es verdadera.
- Comparaciones: `=`, `<>`, `<`, `>`, `<=`, `>=`. Textos entre comillas simples, fechas en formato `'AAAA-MM-DD'`.
- Una columna booleana ya es una condición: `WHERE is_active`, `WHERE NOT is_active`.
- `AND` tiene más precedencia que `OR`: **usa paréntesis** siempre que los mezcles.
- Los valores que escribe el usuario viajan como **parámetros**, nunca pegados a la consulta.

En el siguiente paso aprenderás atajos para filtros muy habituales: listas de valores (`IN`), rangos (`BETWEEN`) y búsquedas de texto (`LIKE`).
:::
