## Objetivo del paso

Una aplicación real tiene muchos usuarios a la vez, y cada uno usa su propia conexión. En este paso aprendes:

1. El problema de la **actualización perdida**: dos personas compran el último producto.
2. La solución más sencilla y robusta: actualizaciones **atómicas** con condición.
3. `SELECT ... FOR UPDATE` para bloquear filas que vas a cambiar.
4. Qué son los **niveles de aislamiento**, sin entrar en teoría.

## El problema: dos clientes, un solo producto

Queda **1** unidad de un producto. Dos clientes pulsan "Comprar" a la vez, y la aplicación hace, para cada uno: leer el stock, comprobar que es mayor que 0 y guardar el stock menos uno.

| Momento | Sesión de Ana | Sesión de Luis |
| --- | --- | --- |
| 1 | `SELECT stock` → **1** | |
| 2 | | `SELECT stock` → **1** |
| 3 | "Hay stock": `UPDATE ... SET stock = 0` | |
| 4 | | "Hay stock": `UPDATE ... SET stock = 0` |
| 5 | Pedido confirmado | Pedido confirmado |

Se han vendido **dos** unidades de un producto que solo tenía **una**, y el stock dice 0. Ningún error, ninguna restricción violada: la venta de Luis "pisó" la de Ana. Es una **actualización perdida**, y ocurre porque la aplicación **decide con un dato que ya no es cierto** cuando escribe.

:::warning En tu navegador no puedes reproducirlo
El PostgreSQL del workshop tiene una sola conexión, así que dos sesiones a la vez no son posibles aquí. En un servidor real, este problema aparece en cuanto hay tráfico, y suele descubrirse en producción, en el peor momento (el día de las rebajas).
:::

## Solución 1: que la base de datos decida

En lugar de leer, decidir en la aplicación y escribir, pide a la base de datos que haga las tres cosas **en una sola sentencia**:

```sql run title="Vender una unidad solo si queda stock"
UPDATE products
SET stock = stock - 1
WHERE id = 1 AND stock >= 1
RETURNING name, stock;
```

`stock = stock - 1` se calcula con el valor **actual** de la fila en el momento de escribir, y la condición `stock >= 1` se comprueba en ese mismo instante. Si dos sesiones lo ejecutan a la vez sobre la última unidad, PostgreSQL hace esperar a la segunda hasta que la primera termina, y entonces la condición ya no se cumple: su `UPDATE` afecta a **0 filas**.

```sql run title="Intentar vender algo sin stock"
UPDATE products
SET stock = stock - 1
WHERE id = 10 AND stock >= 1
RETURNING name, stock;
```

`UPDATE 0`: no se vendió nada. La aplicación solo tiene que mirar **cuántas filas** se actualizaron (o si `RETURNING` devolvió algo) para saber si la venta fue posible.

:::tip La regla
Siempre que puedas, **no leas un valor para decidir y luego escribirlo**: escribe con una condición en el `WHERE` y comprueba cuántas filas cambiaron. El `CHECK (stock >= 0)` de la tienda es la segunda red de seguridad: aunque la aplicación tuviera un error, el stock nunca podría ser negativo.
:::

## Solución 2: bloquear la fila con `FOR UPDATE`

A veces la decisión es demasiado compleja para un `WHERE` (por ejemplo, depende de varias tablas o de un cálculo en la aplicación). Entonces se **bloquea** la fila al leerla:

```sql run title="Leer bloqueando la fila"
BEGIN;

SELECT name, stock
FROM products
WHERE id = 1
FOR UPDATE;
```

`FOR UPDATE` bloquea las filas leídas hasta que la transacción termine: otra sesión que intente leerlas con `FOR UPDATE` o modificarlas **espera**. Así, lo que leíste sigue siendo cierto cuando escribes.

```sql run title="Decidir, escribir y liberar"
UPDATE products
SET stock = stock - 1
WHERE id = 1;

COMMIT;
```

Con el `COMMIT` se libera el bloqueo. Es otra razón para que las transacciones sean cortas: mientras dura, los demás esperan.

## Niveles de aislamiento

El **aislamiento** decide qué ve una transacción de los cambios que otras confirman mientras ella está en marcha. PostgreSQL ofrece tres niveles:

| Nivel | Qué garantiza | Cuándo |
| --- | --- | --- |
| `READ COMMITTED` (por defecto) | Cada sentencia ve lo confirmado hasta su inicio | Casi siempre, con actualizaciones atómicas o `FOR UPDATE` |
| `REPEATABLE READ` | Toda la transacción ve una "foto" fija de los datos | Informes que leen varias veces y deben cuadrar entre sí |
| `SERIALIZABLE` | El resultado es como si las transacciones fueran una detrás de otra | Reglas complejas; la aplicación debe **reintentar** cuando PostgreSQL cancela una transacción por conflicto (error `40001`) |

Se elige al empezar: `BEGIN ISOLATION LEVEL REPEATABLE READ;`. Para la mayoría de las aplicaciones, `READ COMMITTED` con las dos soluciones de este paso es suficiente.

## Retos

::::challenge Vender solo si hay stock
Vende **una unidad** de los productos **1** y **10** con una sola sentencia que **solo** descuente stock de los productos que tengan al menos una unidad.

```sql verify
SELECT id, stock
FROM products
WHERE id IN (1, 10);
```

:::hint
Un `UPDATE` con `WHERE id IN (1, 10)` y una condición más.
:::

:::solution
```sql
UPDATE products
SET stock = stock - 1
WHERE id IN (1, 10) AND stock >= 1;
```
Los auriculares (1) pasan de 120 a 119; *Rayuela* (10) sigue en 0. `UPDATE 1` indica que solo se vendió uno de los dos.
:::
::::

::::challenge ¿Qué falla aquí?
Este es el código de "canjear un cupón de un solo uso" de una aplicación:

```text
cupon = SELECT used FROM coupons WHERE code = 'BIENVENIDA'
si cupon.used es false:
    UPDATE coupons SET used = true WHERE code = 'BIENVENIDA'
    aplicar el descuento al pedido
```

¿Qué puede pasar si dos pedidos intentan canjear el mismo cupón a la vez? Propón cómo arreglarlo con una sola sentencia SQL.

:::hint
Es el mismo problema que el del último producto: se decide con un dato leído antes de escribir.
:::

:::solution
Las dos sesiones pueden leer `used = false` antes de que ninguna escriba, y las dos aplicarían el descuento: el cupón de un solo uso se usa dos veces.

La solución es dejar que la base de datos decida con una actualización atómica:

```sql example
UPDATE coupons
SET used = true
WHERE code = 'BIENVENIDA' AND NOT used
RETURNING code;
```

Si devuelve una fila, el canje es tuyo y aplicas el descuento; si devuelve cero, otro pedido lo canjeó antes. Si además el descuento se guarda en la misma transacción, todo el canje es atómico.
:::
::::

:::recap
- Leer un valor, decidir en la aplicación y escribir después produce **actualizaciones perdidas** cuando hay varios usuarios a la vez.
- **Actualización atómica**: `UPDATE ... SET x = x - 1 WHERE ... AND condición`, y comprueba cuántas filas cambiaron.
- `SELECT ... FOR UPDATE` bloquea las filas leídas hasta el final de la transacción.
- `READ COMMITTED` es el nivel por defecto; `SERIALIZABLE` exige reintentar cuando hay conflictos.
- Las restricciones (`CHECK`, `UNIQUE`) son la última red de seguridad.

En el último paso combinarás todo en operaciones completas de la tienda.
:::
