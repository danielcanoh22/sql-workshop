## Qué vas a aprender

Registrar una venta son varias escrituras: el pedido, sus líneas y el descuento de stock. Si la aplicación se cae entre la segunda y la tercera, ¿queda un pedido sin descontar stock? Las **transacciones** garantizan que un grupo de cambios se aplica **entero o no se aplica**, y son la red de seguridad de cualquier aplicación que escribe datos.

- `BEGIN`, `COMMIT` y `ROLLBACK`: agrupar cambios y decidir si se guardan.
- Qué pasa cuando algo falla dentro de una transacción, y los `SAVEPOINT`.
- Los problemas de **concurrencia** (dos usuarios que compran el último producto a la vez) y cómo evitarlos con actualizaciones atómicas y bloqueos.
- Las propiedades **ACID** y los niveles de aislamiento, sin teoría de más.

## Requisitos previos

**Modificar datos**: aquí agruparás `INSERT`, `UPDATE` y `DELETE` en transacciones.

:::warning Una sola conexión
El PostgreSQL del navegador admite **una sola conexión**, así que no puedes abrir dos sesiones y ver cómo chocan entre sí. Los problemas de concurrencia se explican paso a paso con ejemplos de dos sesiones, y las soluciones (que sí funcionan en una sola sesión) las ejecutarás de verdad.
:::

:::tip Fíjate en los avisos
Cuando un bloque deje una transacción abierta, verás un aviso debajo del resultado, y el panel **Datos** te recordará que lo que ves aún no es definitivo. Si te pierdes, **Restablecer** lo deja todo como al principio.
:::
