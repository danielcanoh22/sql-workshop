## Objetivo del paso

Una pantalla muestra 10, 20 o 50 filas, no la tabla entera. En este paso aprendes:

1. A quedarte con las primeras filas con `LIMIT` (el "top N").
2. A paginar con `LIMIT` y `OFFSET`.
3. Por qué paginar sin un orden determinista hace que se pierdan o se repitan filas.

## `LIMIT`: las primeras N filas

`LIMIT` va después de `ORDER BY` y corta el resultado:

```sql run title="Los 5 productos más caros"
SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 5;
```

:::warning LIMIT sin ORDER BY no tiene sentido
"Los 5 primeros" ¿según qué orden? Sin `ORDER BY`, PostgreSQL devuelve las 5 filas que le resulten más cómodas, que no tienen por qué ser las mismas en la siguiente ejecución. **Siempre que uses `LIMIT`, usa `ORDER BY`.**
:::

:::postgres LIMIT y el estándar
`LIMIT` es la forma habitual en PostgreSQL, MySQL y SQLite. El estándar SQL define otra, que PostgreSQL también entiende y es la que usan SQL Server u Oracle:

```sql
ORDER BY price DESC
FETCH FIRST 5 ROWS ONLY;
```
:::

## `OFFSET`: saltarse filas

`OFFSET n` se salta las primeras `n` filas. Combinado con `LIMIT`, da páginas:

```sql run title="Productos por precio: página 1 (10 por página)"
SELECT name, price, id
FROM products
ORDER BY price, id
LIMIT 10 OFFSET 0;
```

```sql run title="Página 2"
SELECT name, price, id
FROM products
ORDER BY price, id
LIMIT 10 OFFSET 10;
```

:::concept La fórmula de la página
Con páginas de tamaño `size`, la página `n` (empezando en 1) es:

```sql
LIMIT size OFFSET (n - 1) * size
```

Página 1: `OFFSET 0`. Página 2: `OFFSET 10`. Página 3: `OFFSET 20`.
:::

## Paginar exige un orden determinista

Fíjate en que las consultas de arriba ordenan por `price, id` y no solo por `price`. Imagina que dos productos cuestan lo mismo y caen justo en el borde entre la página 1 y la 2. Si el orden entre ellos no está definido, cada consulta puede ordenarlos distinto: el usuario podría ver **el mismo producto en las dos páginas y no ver nunca el otro**.

:::tip Regla de paginación
Termina siempre el `ORDER BY` de una consulta paginada con una columna **única** (normalmente la clave primaria). Así el orden es **total**: no hay empates, y cada fila tiene exactamente un lugar.
:::

En la tienda no hay dos productos con el mismo precio, así que aquí no verías el problema. Pero en datos reales los empates son lo normal: pedidos del mismo día, productos al mismo precio, clientes de la misma ciudad.

## Retos

::::challenge Los 3 clientes más recientes
Muestra el **nombre**, el **apellido** y la **fecha de alta** de los **3 clientes que se registraron más recientemente**, del más reciente al más antiguo.

:::hint
Ordena por `signup_date` en orden descendente y corta el resultado.
:::

:::solution
```sql ordered
SELECT first_name, last_name, signup_date
FROM customers
ORDER BY signup_date DESC
LIMIT 3;
```
:::
::::

::::challenge Los 3 productos más baratos de Electrónica
Muestra el **nombre** y el **precio** de los **3 productos más baratos** de la categoría **Electrónica** (id 1), del más barato al más caro.

:::hint
Primero se filtra (`WHERE`), luego se ordena y al final se corta.
:::

:::solution
```sql ordered
SELECT name, price
FROM products
WHERE category_id = 1
ORDER BY price
LIMIT 3;
```
El orden de las cláusulas es siempre `SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT`.
:::
::::

::::challenge Página 2 del catálogo
El catálogo muestra los productos **ordenados por nombre**, **10 por página**. Muestra el **nombre** y el **precio** de los productos de la **página 2**. Haz que el orden sea determinista.

:::hint
Página 2 con 10 por página: te saltas 10 filas y te quedas con 10.
:::

:::hint
Para que el orden sea determinista, desempata por una columna única: `ORDER BY name, id`.
:::

:::solution
```sql ordered
SELECT name, price
FROM products
ORDER BY name, id
LIMIT 10 OFFSET 10;
```
`id` no aparece en el resultado, pero se puede usar en `ORDER BY`: ordenar por una columna no obliga a mostrarla.
:::
::::

:::recap
- `LIMIT n` se queda con las primeras `n` filas; usarlo sin `ORDER BY` da resultados arbitrarios.
- `OFFSET n` se salta las primeras `n` filas; la página `n` es `LIMIT size OFFSET (n - 1) * size`.
- Para paginar, el orden tiene que ser **total**: termina el `ORDER BY` con una columna única.

`OFFSET` funciona y es lo más sencillo, pero tiene un coste oculto que crece con cada página. En el siguiente paso lo medirás y verás la alternativa que usan las aplicaciones con mucho tráfico.
:::
