## Qué vas a aprender

Una aplicación no solo lee: da de alta clientes, actualiza precios, registra pedidos y borra lo que sobra. En este tutorial aprendes las tres sentencias que modifican datos, y sobre todo a usarlas **sin romper nada**.

- `INSERT`: añadir filas, una o muchas, y copiar datos con `INSERT ... SELECT`.
- `UPDATE`: cambiar filas existentes, con expresiones y subconsultas.
- `DELETE`: borrar filas respetando las claves foráneas, y cuándo es mejor **no** borrar.
- `RETURNING` para ver qué cambió, y cómo registrar un pedido completo en una sola sentencia.
- La regla más importante: **nunca** un `UPDATE` o un `DELETE` sin `WHERE`.

## Requisitos previos

El nivel **Principiante** y **Subconsultas y CTEs**: muchos `UPDATE` y `DELETE` reales eligen las filas con una subconsulta.

:::warning Aquí sí vas a cambiar los datos
Los bloques **Pruébalo** modifican la base de datos de tu navegador, y los cambios se ven en el panel **Datos**. Si algo queda raro, pulsa **Restablecer** en ese panel. Los retos se comprueban siempre sobre una copia limpia: lo que hayas cambiado no afecta a la corrección.
:::
