## Objetivo del paso

`OFFSET` tiene un coste oculto: para saltarse 80 000 filas, PostgreSQL **las tiene que recorrer igualmente** y descartarlas una a una. Cuanto más profunda la página, más lenta la consulta. En este paso aprendes:

1. Por qué `OFFSET` empeora con cada página, midiéndolo.
2. La **paginación por clave** (*keyset* o *seek*): pedir "las filas que vienen después de la última que vi".
3. Cuándo usar cada una.

## La idea: continuar desde la última fila

En vez de decir "sáltate 80 000 filas", la aplicación recuerda **la última fila que mostró** y pide las que vienen después **en el mismo orden**. Si el listado se ordena por `price, id` y la última fila vista fue la de precio `24.00` e id `9`:

```sql run title="La página siguiente a Don Quijote (24.00, id 9)"
SELECT name, price, id
FROM products
WHERE (price, id) > (24.00, 9)
ORDER BY price, id
LIMIT 10;
```

:::concept Comparar filas: (a, b) > (x, y)
`(price, id) > (24.00, 9)` compara **en orden**, como el diccionario compara palabras letra a letra: es verdadero si `price > 24.00`, o si `price = 24.00` **y** `id > 9`. Es exactamente "lo que viene después de (24.00, 9) en el orden `price, id`". Por eso el `WHERE` y el `ORDER BY` deben usar **las mismas columnas en el mismo orden**.
:::

El resultado es el mismo que la página 3 con `OFFSET`, pero PostgreSQL no tiene que recorrer las filas anteriores: con un índice sobre `(price, id)` va **directo** a la posición `(24.00, 9)` y lee 10 filas.

## Medirlo con 100 000 filas

La comparación crea 100 000 clientes y un índice sobre `(signup_date, id)`, y pide la **página 4001** (20 clientes por página) del listado ordenado por fecha de alta, de las dos formas. Los clientes de prueba tienen ids del 1001 al 101000; la última fila de la página 4000 es la del cliente de id `80970`, dado de alta el `2025-03-10`.

:::compare Página 4001 del listado de clientes
```sql setup
INSERT INTO customers (id, first_name, last_name, email, country, signup_date)
SELECT 1000 + g, 'Cliente', 'Prueba ' || g, 'prueba' || g || '@example.com', 'España', DATE '2023-01-01' + g / 100
FROM generate_series(1, 100000) AS g;
CREATE INDEX customers_signup_date_id_idx ON customers (signup_date, id);
ANALYZE customers;
```

```sql variant label="OFFSET"
SELECT id, first_name, last_name, signup_date
FROM customers
ORDER BY signup_date, id
LIMIT 20 OFFSET 80000;
```
Para devolver 20 filas, PostgreSQL produce las **80 020** primeras en orden y tira a la basura las 80 000 que no necesitas. La página 1 es rápida; la 4001 hace 4000 veces más trabajo. Y el coste se paga en **cada** petición.

```sql variant label="Keyset" best
SELECT id, first_name, last_name, signup_date
FROM customers
WHERE (signup_date, id) > ('2025-03-10', 80970)
ORDER BY signup_date, id
LIMIT 20;
```
Con el índice sobre `(signup_date, id)`, PostgreSQL salta directamente a la posición `('2025-03-10', 80970)` y lee **solo 20 filas**. La página 4001 cuesta lo mismo que la primera.
:::

## Ventajas e inconvenientes

| | `OFFSET` | Keyset |
| --- | --- | --- |
| Coste de la página `n` | Crece con `n` | Constante (con el índice adecuado) |
| Saltar a la página 37 | Sí | No: solo "siguiente" (y "anterior") |
| Si se insertan filas mientras navegas | Se pueden repetir o saltar filas | Estable: continúas desde donde estabas |
| Complejidad | Mínima | Hay que recordar los valores de la última fila |

:::tip ¿Cuál usar?
- **Keyset** para listados largos con "cargar más", *scroll* infinito o APIs con cursores (`?after=...`). Es lo que usan las aplicaciones con mucho volumen.
- **`OFFSET`** para listados pequeños, paneles de administración o cuando de verdad necesitas números de página y las páginas profundas son raras.
:::

## Retos

::::challenge La página siguiente
El catálogo se ordena por **precio** y luego por **id**, 10 productos por página. La última fila de la página 2 es *Kit de química*, con precio **42.00** e id **30**. Escribe la consulta de la **página siguiente** con paginación por clave. Muestra **nombre**, **precio** e **id**.

:::hint
Las filas que vienen "después" de `(42.00, 30)` en el orden `price, id`.
:::

:::hint
`WHERE (price, id) > (42.00, 30)`, el mismo `ORDER BY` y `LIMIT 10`. Sin `OFFSET`.
:::

:::solution
```sql ordered
SELECT name, price, id
FROM products
WHERE (price, id) > (42.00, 30)
ORDER BY price, id
LIMIT 10;
```
Son los 10 productos más caros de la tienda, así que es la última página: la siguiente petición, desde la *Bicicleta estática* (299.00, id 20), devolvería 0 filas, y así sabe la aplicación que no hay más.
:::
::::

::::challenge Cargar más pedidos
La pantalla de pedidos muestra los **más recientes primero** (por `order_date` y, a igual fecha, por `id`, ambos descendentes), 5 por vez. El último pedido mostrado es el **87**, del **2025-12-08**. Escribe la consulta del botón **Cargar más**: **id**, **fecha** y **estado** de los 5 pedidos siguientes.

:::hint
En orden descendente, "lo que viene después" es lo **menor**: la comparación se invierte.
:::

:::hint
`WHERE (order_date, id) < ('2025-12-08', 87)` con `ORDER BY order_date DESC, id DESC`.
:::

:::solution
```sql ordered
SELECT id, order_date, status
FROM orders
WHERE (order_date, id) < ('2025-12-08', 87)
ORDER BY order_date DESC, id DESC
LIMIT 5;
```
La comparación de filas solo funciona si **todas** las columnas del orden van en la misma dirección. Aquí las dos son `DESC`, así que basta con invertir `>` por `<`.
:::
::::

:::recap
- `OFFSET n` recorre y descarta `n` filas: cada página profunda es más lenta que la anterior.
- La **paginación por clave** continúa desde la última fila vista: `WHERE (a, b) > (último_a, último_b) ORDER BY a, b LIMIT n`.
- Necesita un orden total (con la clave primaria al final) y, para ser rápida, un índice sobre esas columnas.
- Keyset para listados largos y APIs; `OFFSET` para listados pequeños o cuando hacen falta números de página.

En el último paso pondrás en práctica todo el tutorial con pantallas típicas de la tienda.
:::
