## Objetivo del paso

Vas a escribir tus primeras consultas. Al terminar sabrás:

1. Leer columnas de una tabla con `SELECT ... FROM ...`.
2. Por qué en una aplicación **nunca** deberías usar `SELECT *`.
3. Renombrar columnas con alias y calcular columnas nuevas.
4. Eliminar filas repetidas con `DISTINCT`.

## La base de datos de la tienda

Antes de escribir nada, mira con qué datos vas a trabajar. Pulsa el botón **Datos** de la barra superior: verás cinco tablas.

| Tabla | Qué guarda |
| --- | --- |
| `customers` | Los clientes: nombre, email, ciudad, país, fecha de alta y si están activos. |
| `categories` | Las categorías del catálogo (Electrónica, Libros, Hogar…). |
| `products` | Los productos: nombre, categoría, precio, stock y si están a la venta. |
| `orders` | Los pedidos: qué cliente lo hizo, cuándo y en qué estado está. |
| `order_items` | Las líneas de cada pedido: qué producto, cuántas unidades y a qué precio. |

En la pestaña **Diagrama** del panel verás cómo se relacionan: un pedido pertenece a un cliente, una línea pertenece a un pedido y a un producto. En este tutorial trabajarás sobre todo con `customers` y `products`; las relaciones entre tablas llegarán con los JOINs.

:::concept Tablas, filas y columnas
Una **tabla** guarda datos de un mismo tipo de cosa (clientes, productos). Cada **fila** es una de esas cosas (un cliente concreto) y cada **columna** es un dato que todas las filas tienen (el email). Cada columna tiene un **tipo**: `integer`, `text`, `numeric(10,2)`, `date`, `boolean`… El panel **Datos** te muestra el tipo de cada columna.
:::

## Tu primera consulta

Una consulta de lectura tiene esta forma:

```sql
SELECT columna1, columna2
FROM tabla;
```

- `SELECT` dice **qué columnas** quieres.
- `FROM` dice **de qué tabla** salen.
- El `;` marca el final de la sentencia.

Ejecuta esta consulta. Puedes pulsar el botón o usar `Ctrl + Enter` dentro del editor:

```sql run title="Nombre y apellido de cada cliente"
SELECT first_name, last_name
FROM customers;
```

Obtienes una fila por cada cliente (30 en total) y solo las dos columnas que pediste. Prueba a añadir `email` a la lista, separada por una coma, y vuelve a ejecutar.

:::tip Convenciones de estilo
SQL no distingue mayúsculas en las palabras clave: `select` y `SELECT` son lo mismo. La convención más extendida, y la que usaremos, es escribir las **palabras clave en mayúsculas** y los **nombres de tablas y columnas en minúsculas** con guiones bajos (`first_name`). Partir la consulta en varias líneas, una por cláusula, la hace mucho más fácil de leer cuando crece.
:::

## `SELECT *`: útil para explorar, peligroso en una aplicación

El asterisco significa "todas las columnas":

```sql run title="Todas las columnas de las categorías"
SELECT *
FROM categories;
```

Es cómodo para **explorar** una tabla que no conoces, como acabas de hacer. Pero en el código de una aplicación es una mala práctica.

:::why ¿Por qué evitar SELECT * en una aplicación?
- **Transfiere datos que no usas.** Si la pantalla solo muestra nombre y precio, traer también la descripción larga, las imágenes o el historial es trabajo y red desperdiciados.
- **Rompe sin avisar cuando la tabla cambia.** Si mañana alguien añade una columna (o cambia el orden), tu código recibe datos distintos de los que esperaba.
- **Puede filtrar datos sensibles.** Si alguien añade `password_hash` a `customers`, un `SELECT *` lo empezará a devolver en todas partes.
- **Impide optimizaciones.** Más adelante verás que PostgreSQL puede responder algunas consultas leyendo solo un índice, pero únicamente si pides las columnas que el índice contiene.

La regla es simple: **pide siempre las columnas que necesitas, por su nombre**. En todos los retos del workshop las soluciones siguen esta regla.
:::

## Alias: renombrar columnas

Con `AS` le das otro nombre a una columna **en el resultado**. La tabla no cambia:

```sql run title="Alias con AS"
SELECT name AS product, price AS unit_price
FROM products;
```

Los alias son útiles para que el resultado tenga nombres claros, sobre todo cuando la columna es un cálculo.

:::warning Comillas simples y comillas dobles
En SQL las **comillas simples** (`'Madrid'`) delimitan **textos**. Las **comillas dobles** (`"Mi columna"`) delimitan **nombres** de tablas o columnas, y solo hacen falta si el nombre tiene espacios o mayúsculas. Evita esos nombres: un alias como `unit_price` no necesita comillas y no da problemas.
:::

## Columnas calculadas

En el `SELECT` puedes escribir expresiones, no solo nombres de columnas. Por ejemplo, el precio con el 21 % de IVA:

```sql run title="Precio con IVA"
SELECT name, price, round(price * 1.21, 2) AS price_with_vat
FROM products;
```

- `price * 1.21` se calcula **para cada fila**.
- `round(valor, 2)` redondea a dos decimales.
- `AS price_with_vat` le da nombre a la nueva columna. Sin alias, PostgreSQL la llamaría `round`, que no dice nada.

Para unir textos se usa el operador `||`:

```sql run title="Unir textos con ||"
SELECT first_name || ' ' || last_name AS full_name, email
FROM customers;
```

:::postgres Tipos numéricos y redondeo
`price` es de tipo `numeric(10, 2)`: un número **exacto** con dos decimales, el tipo correcto para dinero (nunca uses `real` o `double precision` para importes: acumulan errores de redondeo). Al multiplicar por `1.21` el resultado tiene más decimales; por eso usamos `round`.
:::

## `DISTINCT`: quitar repetidos

¿En qué países tenemos clientes? Si pides la columna `country`, verás países repetidos, uno por cliente:

```sql run title="País de cada cliente (con repetidos)"
SELECT country
FROM customers;
```

`DISTINCT` se queda con una sola copia de cada fila del resultado:

```sql run title="Países distintos"
SELECT DISTINCT country
FROM customers;
```

:::warning El orden de las filas no está garantizado
Fíjate en que los países no salen en orden alfabético. **Sin `ORDER BY`, la base de datos devuelve las filas en el orden que le resulte más cómodo**, y ese orden puede cambiar de una ejecución a otra. Ordenar es el tema del siguiente tutorial; por ahora, en los retos de este tutorial el orden de las filas no importa.
:::

## Retos

::::challenge Datos de contacto
El equipo de soporte necesita una lista con el **nombre**, el **apellido** y el **email** de todos los clientes.

```sql starter
SELECT
```

:::hint
Las columnas se llaman `first_name`, `last_name` y `email`, y están en la tabla `customers`.
:::

:::solution
```sql
SELECT first_name, last_name, email
FROM customers;
```
Tres columnas, por su nombre y separadas por comas. Sin `SELECT *`: el equipo de soporte no necesita la fecha de alta ni el país.
:::
::::

::::challenge Precio con IVA
Muestra el **nombre** y el **precio** de cada producto, y una tercera columna llamada `price_with_vat` con el precio más un 21 % de IVA, **redondeado a dos decimales**.

:::hint
Multiplicar por `1.21` suma un 21 %.
:::

:::hint
`round(expresión, 2)` redondea a dos decimales. Ponle nombre a la columna con `AS price_with_vat`.
:::

:::solution
```sql
SELECT name, price, round(price * 1.21, 2) AS price_with_vat
FROM products;
```
La corrección compara valores, no nombres de columna, así que el alias es por claridad. Pero en una aplicación el alias importa mucho: es el nombre con el que tu código leerá el dato.
:::
::::

::::challenge Países con clientes
Muestra la lista de **países** en los que hay clientes, **sin repetir** ninguno.

:::hint
La palabra clave para eliminar filas repetidas va justo después de `SELECT`.
:::

:::solution
```sql
SELECT DISTINCT country
FROM customers;
```
Son 9 países. `DISTINCT` se aplica a la fila completa del resultado: si pidieras `country, city`, quitaría las combinaciones repetidas de país y ciudad.
:::
::::

::::challenge Nombre completo
Muestra una columna `full_name` con el nombre y el apellido de cada cliente separados por un espacio (por ejemplo, `Ana García`) y, a su lado, su **email**.

:::hint
El operador `||` une textos. El espacio también es un texto: `' '`.
:::

:::solution
```sql
SELECT first_name || ' ' || last_name AS full_name, email
FROM customers;
```
:::
::::

:::recap
- `SELECT columnas FROM tabla` lee datos. Una fila del resultado por cada fila de la tabla.
- En una aplicación pide **siempre las columnas por su nombre**; `SELECT *` solo para explorar.
- `AS` pone un alias a una columna del resultado; los textos van entre **comillas simples**.
- Puedes calcular columnas: `price * 1.21`, `round(...)`, `first_name || ' ' || last_name`.
- `DISTINCT` elimina filas repetidas del resultado.
- Sin `ORDER BY` **no hay orden garantizado**.

En el siguiente paso dejarás de leer todas las filas: aprenderás a quedarte solo con las que te interesan usando `WHERE`.
:::
