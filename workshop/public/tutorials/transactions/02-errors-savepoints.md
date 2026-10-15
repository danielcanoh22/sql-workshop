## Objetivo del paso

Las transacciones existen para cuando algo sale mal. En este paso aprendes:

1. Qué hace PostgreSQL cuando una sentencia falla dentro de una transacción.
2. Por qué hay que terminar **siempre** con `ROLLBACK` tras un error.
3. A deshacer solo una parte con `SAVEPOINT`.
4. Cómo se usan las transacciones desde el código de una aplicación.

## Un error dentro de una transacción

Empieza una transacción y vende un auricular:

```sql run title="Una venta dentro de una transacción"
BEGIN;

UPDATE products
SET stock = stock - 1
WHERE id = 1
RETURNING name, stock;
```

Ahora intenta vender 5 unidades de *Rayuela*, que tiene el stock a 0. El `CHECK (stock >= 0)` lo rechaza:

```sql run error title="Vender sin stock"
UPDATE products
SET stock = stock - 5
WHERE id = 10;
```

Fíjate en el aviso: la transacción **ha fallado**. A partir de aquí PostgreSQL rechaza todo, incluso una consulta inocente:

```sql run error title="Cualquier sentencia, rechazada"
SELECT name, stock
FROM products
WHERE id = 1;
```

`current transaction is aborted, commands ignored until end of transaction block`. Una transacción que ha fallado ya no puede terminar bien: lo único que acepta es `ROLLBACK`, que lo deshace **todo**, también la venta del auricular que sí había funcionado.

```sql run title="ROLLBACK: volver al principio"
ROLLBACK;

SELECT name, stock
FROM products
WHERE id = 1;
```

Los auriculares vuelven a tener 120 unidades. Es justo lo que quieres en una venta: si una parte falla, no se aplica ninguna.

## `SAVEPOINT`: deshacer solo una parte

A veces quieres poder deshacer **una parte** de la transacción y seguir con el resto. Un `SAVEPOINT` marca un punto al que volver:

```sql run title="Subir un precio y marcar un punto"
BEGIN;

UPDATE products
SET price = round(price * 1.05, 2)
WHERE id = 1;

SAVEPOINT before_stock;
```

```sql run error title="Un cambio de stock que falla"
UPDATE products
SET stock = -1
WHERE id = 1;
```

```sql run title="Volver al punto y confirmar el resto"
ROLLBACK TO SAVEPOINT before_stock;

COMMIT;

SELECT name, price, stock
FROM products
WHERE id = 1;
```

`ROLLBACK TO SAVEPOINT` deshace solo lo que vino después del punto, y la transacción vuelve a estar sana: la subida de precio se confirma con el `COMMIT`.

## Transacciones desde una aplicación

En el código de una aplicación, el patrón es siempre el mismo:

```text
abrir transacción (BEGIN)
try:
    ejecutar las sentencias
    COMMIT
catch error:
    ROLLBACK
    informar del error
```

La mayoría de librerías y ORMs lo hacen por ti (`using var tx = db.BeginTransaction()`, `@Transactional`, `prisma.$transaction(...)`), pero por debajo es exactamente esto.

:::warning Transacciones cortas
Mientras una transacción está abierta, mantiene **bloqueadas** las filas que ha modificado: otras transacciones que quieran cambiarlas tienen que esperar. Una transacción debe durar milisegundos: **nunca** la dejes abierta mientras esperas a que el usuario confirme algo, ni mientras llamas a un servicio externo lento.
:::

## Reto

::::challenge ¿Qué queda guardado?
Una aplicación ejecuta esto, sentencia a sentencia:

```sql
BEGIN;
UPDATE products SET price = 10 WHERE id = 8;   -- funciona
SAVEPOINT a;
UPDATE products SET price = -1 WHERE id = 8;   -- falla: CHECK (price >= 0)
ROLLBACK TO SAVEPOINT a;
UPDATE products SET stock = 0 WHERE id = 8;    -- funciona
COMMIT;
```

¿Qué precio y qué stock tiene el producto 8 al final? ¿Y si en lugar de `ROLLBACK TO SAVEPOINT a` la aplicación hubiera seguido directamente con el último `UPDATE`?

:::hint
`ROLLBACK TO SAVEPOINT` deshace solo lo que vino después del punto, y la transacción vuelve a aceptar sentencias.
:::

:::solution
El producto 8 termina con **precio 10 y stock 0**: el primer `UPDATE` se hizo antes del `SAVEPOINT`, el que falla se deshace con `ROLLBACK TO SAVEPOINT a` y el último se ejecuta con normalidad. El `COMMIT` lo confirma todo.

Sin el `ROLLBACK TO SAVEPOINT`, la transacción estaría **abortada** tras el error: el último `UPDATE` fallaría con `current transaction is aborted`, y el `COMMIT` final no confirmaría nada (PostgreSQL responde `ROLLBACK` a un `COMMIT` sobre una transacción abortada). El producto quedaría como al principio.
:::
::::

:::recap
- Si una sentencia falla dentro de una transacción, la transacción queda **abortada**: solo acepta `ROLLBACK`.
- `ROLLBACK` deshace todo desde el `BEGIN`, también lo que había funcionado.
- `SAVEPOINT` marca un punto; `ROLLBACK TO SAVEPOINT` deshace solo hasta él y la transacción sigue viva.
- En una aplicación: `BEGIN`, sentencias, `COMMIT`, y `ROLLBACK` si algo falla.
- Las transacciones deben ser **cortas**: bloquean las filas que modifican.

En el siguiente paso verás qué pasa cuando dos transacciones quieren cambiar lo mismo a la vez.
:::
