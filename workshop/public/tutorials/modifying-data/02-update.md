## Objetivo del paso

`UPDATE` cambia los valores de filas que ya existen. Es la sentencia con la que más fácil es causar un desastre. En este paso aprendes:

1. A actualizar una o varias columnas, con valores fijos o calculados.
2. Por qué un `UPDATE` sin `WHERE` es tan peligroso, y un método para no equivocarte.
3. A elegir las filas que se actualizan con una subconsulta.

## La forma de un `UPDATE`

```sql
UPDATE tabla
SET columna1 = valor1, columna2 = valor2
WHERE condición;
```

```sql run title="Cambiar el stock de un producto"
UPDATE products
SET stock = 25
WHERE id = 10
RETURNING name, stock;
```

`WHERE id = 10` elige la fila (*Rayuela*) y `SET` dice qué cambia. `RETURNING` muestra cómo quedó.

## Valores calculados

El nuevo valor puede depender del actual. Subir un 10 % los precios de Libros (categoría 2), redondeando a céntimos:

```sql run title="Subir un 10 % los libros"
UPDATE products
SET price = round(price * 1.10, 2)
WHERE category_id = 2
RETURNING name, price;
```

En `SET`, `price` a la derecha del `=` es el valor **antes** del cambio. Puedes cambiar varias columnas a la vez separándolas con comas: `SET stock = 0, is_active = false`.

## El `UPDATE` sin `WHERE`

Ejecuta esto (después lo arreglarás con **Restablecer**):

```sql run title="Un UPDATE sin WHERE"
UPDATE products
SET price = price * 2;
```

`UPDATE 30`: **todos** los productos cuestan ahora el doble. No hay ningún error, ninguna confirmación, nada que lo deshaga. En producción, esto es una emergencia. Abre el panel **Datos**, comprueba los precios y pulsa **Restablecer**.

:::tip Primero SELECT, después UPDATE
Antes de un `UPDATE` (o un `DELETE`) en datos reales:

1. Escribe un `SELECT` con **el mismo `WHERE`** y comprueba que devuelve exactamente las filas que quieres cambiar.
2. Solo entonces cambia `SELECT ... FROM` por `UPDATE ... SET`, sin tocar el `WHERE`.
3. Fíjate en el número de filas afectadas que devuelve (`UPDATE 5`). Si esperabas 5 y dice 30, algo va mal.

En el tutorial de **Transacciones** verás la red de seguridad definitiva: hacer el cambio dentro de una transacción y deshacerlo con `ROLLBACK` si el resultado no es el esperado.
:::

## Elegir las filas con una subconsulta

A menudo las filas a cambiar dependen de otra tabla. Cancelar los pedidos pendientes de los clientes **inactivos**:

```sql run title="Cancelar pedidos de clientes inactivos"
UPDATE orders
SET status = 'cancelled'
WHERE status = 'pending'
  AND customer_id IN (SELECT id FROM customers WHERE NOT is_active)
RETURNING id, customer_id, status;
```

:::postgres UPDATE ... FROM
PostgreSQL permite además unir otra tabla directamente en un `UPDATE` con `FROM`:

```sql
UPDATE orders AS o
SET status = 'cancelled'
FROM customers AS c
WHERE c.id = o.customer_id AND NOT c.is_active AND o.status = 'pending';
```

Es útil cuando el nuevo valor sale de la otra tabla. Para solo elegir filas, `IN` o `EXISTS` son igual de claros y funcionan en cualquier base de datos.
:::

## Retos

::::challenge Libros un 10 % más caros
Sube un **10 %** el precio de los productos de **Libros** (categoría 2), **redondeado a dos decimales**. Los demás productos no deben cambiar.

```sql verify
SELECT id, name, price
FROM products;
```

:::hint
`SET price = round(price * 1.10, 2)` con un `WHERE` sobre `category_id`.
:::

:::solution
```sql
UPDATE products
SET price = round(price * 1.10, 2)
WHERE category_id = 2;
```
La corrección compara **todos** los productos: si olvidas el `WHERE`, verás que fallan los precios de las demás categorías.
:::
::::

::::challenge Retirar los agotados
Marca como **no activos** (`is_active = false`) los productos que tienen **stock 0**.

```sql verify
SELECT id, name, stock, is_active
FROM products;
```

:::solution
```sql
UPDATE products
SET is_active = false
WHERE stock = 0;
```
:::
::::

::::challenge Cancelar pedidos antiguos
Los pedidos **pendientes** anteriores al **1 de abril de 2025** se consideran abandonados. Cámbiales el estado a `'cancelled'`.

```sql verify
SELECT id, status
FROM orders;
```

:::hint
Dos condiciones en el `WHERE`: el estado y la fecha (con `<`, porque el 1 de abril no se incluye).
:::

:::solution
```sql
UPDATE orders
SET status = 'cancelled'
WHERE status = 'pending' AND order_date < '2025-04-01';
```
Son 8 pedidos. Prueba primero con `SELECT id, status FROM orders WHERE ...` para ver cuáles serán.
:::
::::

::::challenge Clientes sin pedidos, inactivos
Marca como **inactivos** a los clientes que **no tienen ningún pedido**.

```sql verify
SELECT id, first_name, is_active
FROM customers;
```

:::hint
Las filas a cambiar se eligen con una subconsulta: `NOT EXISTS` sobre `orders`.
:::

:::solution
```sql
UPDATE customers AS c
SET is_active = false
WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.id);
```
El alias en `UPDATE customers AS c` permite referirse a la fila que se está actualizando desde la subconsulta.
:::
::::

:::recap
- `UPDATE tabla SET columna = valor WHERE condición`; los valores pueden calcularse a partir de los actuales.
- **Nunca un `UPDATE` sin `WHERE`**, salvo que de verdad quieras cambiar todas las filas.
- Método seguro: primero un `SELECT` con el mismo `WHERE`, después el `UPDATE`, y comprueba el número de filas afectadas.
- Las filas a cambiar se pueden elegir con subconsultas (`IN`, `EXISTS`); PostgreSQL también tiene `UPDATE ... FROM`.

En el siguiente paso borrarás filas con `DELETE`, y verás cuándo es mejor no borrarlas.
:::
