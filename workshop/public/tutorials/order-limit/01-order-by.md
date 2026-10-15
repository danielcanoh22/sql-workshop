## Objetivo del paso

Sin `ORDER BY`, la base de datos devuelve las filas en el orden que le resulta más cómodo, y ese orden puede cambiar de una ejecución a otra. En este paso aprendes a ordenar:

1. Por una columna, ascendente o descendente.
2. Por varias columnas, para desempatar.
3. Por expresiones.
4. Decidiendo dónde van los `NULL`.

## `ORDER BY`

`ORDER BY` va al final de la consulta, después de `WHERE`:

```sql run title="Productos del más barato al más caro"
SELECT name, price
FROM products
ORDER BY price;
```

Por defecto el orden es **ascendente** (`ASC`): de menor a mayor, de la A a la Z, de la fecha más antigua a la más reciente. Para invertirlo, `DESC`:

```sql run title="Del más caro al más barato"
SELECT name, price
FROM products
ORDER BY price DESC;
```

:::concept El orden lógico de una consulta
Aunque se escriba primero, `SELECT` no es lo primero que hace la base de datos. El orden en que se **evalúa** una consulta es:

1. `FROM`: de qué tabla salen las filas.
2. `WHERE`: cuáles se quedan.
3. `SELECT`: qué columnas se calculan.
4. `ORDER BY`: en qué orden se devuelven.

Por eso en `ORDER BY` puedes usar un **alias** definido en el `SELECT` (ya existe cuando se ordena), pero en `WHERE` no.
:::

```sql run title="Ordenar por un alias"
SELECT name, round(price * 1.21, 2) AS price_with_vat
FROM products
WHERE category_id = 1
ORDER BY price_with_vat DESC;
```

## Varias columnas: desempatar

Con varias columnas, la segunda solo se usa para **desempatar** las filas que coinciden en la primera:

```sql run title="Clientes por país y, dentro de cada país, por apellido"
SELECT country, last_name, first_name
FROM customers
ORDER BY country, last_name;
```

Cada columna lleva su propia dirección: `ORDER BY country, signup_date DESC` ordena los países de la A a la Z y, dentro de cada país, a los clientes más recientes primero.

:::warning Si hay empates, el orden de las filas empatadas no está garantizado
Si ordenas solo por `country`, los nueve clientes de España pueden salir en cualquier orden entre sí, y ese orden puede cambiar. Para un listado en pantalla quizá no importe; para **paginar** es un desastre, como verás en el siguiente paso. La solución es terminar el `ORDER BY` con una columna **única**, normalmente el `id`: `ORDER BY country, id`.
:::

## Ordenar por una expresión

Puedes ordenar por cualquier expresión, no solo por columnas. Por ejemplo, mostrar primero los productos con stock y al final los agotados:

```sql run title="Agotados al final"
SELECT name, stock
FROM products
ORDER BY stock = 0, name;
```

`stock = 0` es un booleano: `false` va antes que `true`, así que los productos **con** stock (para los que `stock = 0` es falso) salen primero.

:::tip No ordenes por número de columna
SQL permite `ORDER BY 2` para decir "por la segunda columna del `SELECT`". Es cómodo al explorar, pero en una aplicación se rompe en silencio en cuanto alguien añade una columna al principio. Escribe siempre el nombre.
:::

## ¿Dónde van los `NULL`?

En PostgreSQL, `NULL` se considera **mayor** que cualquier valor: va **al final** en orden ascendente y **al principio** en descendente. Puedes decidirlo con `NULLS FIRST` o `NULLS LAST`:

```sql run title="Clientes sin ciudad al principio"
SELECT first_name, city
FROM customers
ORDER BY city NULLS FIRST, first_name;
```

:::postgres El orden de los textos depende de la intercalación
Cómo se ordenan los textos lo decide la **intercalación** (*collation*) de la base de datos. Un PostgreSQL instalado en un servidor suele usar la del idioma (por ejemplo, español), donde *ábaco* va junto a *abeja*. El PostgreSQL del navegador que usa este workshop está configurado con la intercalación `C`, que compara **bytes**: las mayúsculas van antes que las minúsculas y las letras con tilde, después de la *z*.

Con los datos de la tienda no lo notarás (todos los nombres empiezan por mayúscula sin tilde), pero compruébalo con la lista de palabras de abajo. `FROM (VALUES ...)` crea una tabla temporal con esas palabras; no hace falta que entiendas esa sintaxis todavía.

`COLLATE "unicode"` pide un orden lingüístico para esa consulta. Ejecuta el bloque con y sin esa parte para ver la diferencia.
:::

```sql run title="La misma lista, ordenada de dos formas"
SELECT word
FROM (VALUES ('árbol'), ('Zeta'), ('abeja'), ('Ávila')) AS t(word)
ORDER BY word COLLATE "unicode";
```

## Retos

::::challenge Del más barato al más caro
Muestra el **nombre** y el **precio** de todos los productos, del **más barato al más caro**.

:::hint
`ORDER BY` va al final de la consulta. El orden ascendente es el que se aplica por defecto.
:::

:::solution
```sql ordered
SELECT name, price
FROM products
ORDER BY price;
```
En la tienda no hay dos productos con el mismo precio, así que este orden es determinista. Si pudieran repetirse, añadirías `, id` al final.
:::
::::

::::challenge Los pedidos más recientes primero
Muestra el **id**, la **fecha** y el **estado** de todos los pedidos, empezando por el **más reciente**.

:::hint
La fecha del pedido está en `order_date`. "Más reciente primero" es orden descendente.
:::

:::solution
```sql ordered
SELECT id, order_date, status
FROM orders
ORDER BY order_date DESC;
```
:::
::::

::::challenge Clientes por país
Muestra el **país**, el **apellido** y el **nombre** de todos los clientes, ordenados por **país** y, dentro de cada país, por **apellido**.

:::hint
Escribe las dos columnas en el `ORDER BY`, separadas por coma, en orden de importancia.
:::

:::solution
```sql ordered
SELECT country, last_name, first_name
FROM customers
ORDER BY country, last_name;
```
:::
::::

::::challenge Primero los que no tienen ciudad
Muestra el **nombre** y la **ciudad** de todos los clientes ordenados por **ciudad**, con los clientes **sin ciudad al principio**. Si dos clientes tienen la misma ciudad (o ninguna), ordénalos por **nombre**.

:::hint
En orden ascendente los `NULL` van al final. Hay una cláusula para cambiarlo.
:::

:::hint
Añade una segunda columna al `ORDER BY` para desempatar.
:::

:::solution
```sql ordered
SELECT first_name, city
FROM customers
ORDER BY city NULLS FIRST, first_name;
```
Sin `first_name` como desempate, los tres clientes sin ciudad (y los tres de Madrid) podrían salir en cualquier orden entre sí.
:::
::::

:::recap
- `ORDER BY columna` ordena de forma ascendente; `DESC` invierte el orden.
- Con varias columnas, cada una desempata a la anterior; cada una lleva su propia dirección.
- Puedes ordenar por alias y por expresiones (`stock = 0`), pero no por número de columna en una aplicación.
- En PostgreSQL los `NULL` van al final en ascendente; `NULLS FIRST` / `NULLS LAST` lo cambian.
- Si el orden puede tener empates, termina con una columna única (`id`) para que sea **determinista**.

En el siguiente paso usarás el orden para lo que más se necesita en una aplicación: quedarte con las primeras filas y paginar.
:::
