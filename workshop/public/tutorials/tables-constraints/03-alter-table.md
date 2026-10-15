## Objetivo del paso

Las aplicaciones cambian, y sus tablas con ellas: una columna nueva, una regla nueva, un nombre mejor. Pero esas tablas ya tienen datos que no se pueden perder. En este paso aprendes:

1. A añadir, renombrar y quitar columnas con `ALTER TABLE`.
2. A añadir restricciones a una tabla con datos, y qué pasa si los datos no las cumplen.
3. Qué es una **migración** y cómo se gestionan los cambios de esquema en una aplicación.

## Añadir columnas

```sql run title="Un teléfono para cada cliente"
ALTER TABLE customers
ADD COLUMN phone text;
```

Los 30 clientes existentes tienen ahora `phone = NULL`. Si la columna nueva tiene un valor por defecto, las filas existentes lo reciben:

```sql run title="Una columna con valor por defecto"
ALTER TABLE customers
ADD COLUMN newsletter boolean NOT NULL DEFAULT false;

SELECT first_name, phone, newsletter
FROM customers
LIMIT 3;
```

:::postgres Añadir una columna con DEFAULT es instantáneo
Desde PostgreSQL 11, añadir una columna con un valor por defecto constante no reescribe la tabla: guarda el valor una vez y lo aplica al leer. Es instantáneo incluso con millones de filas. En versiones antiguas, y en otras bases de datos, podía bloquear la tabla durante minutos.
:::

## Renombrar y quitar

```sql run title="Renombrar una columna"
ALTER TABLE customers
RENAME COLUMN newsletter TO wants_newsletter;
```

```sql run title="Quitar una columna"
ALTER TABLE customers
DROP COLUMN wants_newsletter;
```

:::warning Renombrar o quitar rompe a quien la usa
La base de datos no sabe qué consultas de tu aplicación usan una columna. Renombrarla o quitarla rompe al instante cualquier código que la mencione. En una aplicación en producción se hace en varias fases: primero se deja de usar la columna en el código, se despliega, y solo después se elimina.
:::

## Restricciones sobre datos que ya existen

Quieres que la ciudad sea obligatoria a partir de ahora:

```sql run error title="Hacer obligatoria una columna con NULL"
ALTER TABLE customers
ALTER COLUMN city SET NOT NULL;
```

`column "city" of relation "customers" contains null values`. PostgreSQL comprueba **las filas existentes** antes de aceptar la regla: tres clientes no tienen ciudad. Hay que corregir primero los datos:

```sql run title="Primero los datos, después la regla"
UPDATE customers
SET city = 'Desconocida'
WHERE city IS NULL;

ALTER TABLE customers
ALTER COLUMN city SET NOT NULL;
```

Lo mismo pasa con un `CHECK` o un `UNIQUE` nuevo: si algún dato actual no lo cumple, el `ALTER TABLE` falla.

```sql run error title="Un CHECK que los datos actuales no cumplen"
ALTER TABLE products
ADD CONSTRAINT products_stock_max CHECK (stock <= 100);
```

*Cargador USB-C* tiene 300 unidades. Primero se arreglan (o se revisan) los datos, y después se añade la regla.

:::postgres NOT VALID
En tablas enormes, comprobar todas las filas al añadir un `CHECK` o una clave foránea puede tardar. PostgreSQL permite `ADD CONSTRAINT ... NOT VALID`: la regla se aplica a las filas nuevas y modificadas desde ya, y las existentes se validan más tarde con `VALIDATE CONSTRAINT`, sin bloquear la tabla.
:::

## Migraciones

En una aplicación real **nadie ejecuta `ALTER TABLE` a mano en producción**. Cada cambio de esquema es una **migración**: un archivo versionado con el SQL del cambio (`003_add_phone_to_customers.sql`) que una herramienta aplica en orden en cada entorno (desarrollo, pruebas, producción). Así todos los entornos tienen exactamente el mismo esquema, y los cambios se revisan como cualquier otro código.

## Retos

::::challenge Teléfono de contacto
Añade a `customers` una columna `phone` de tipo texto, **opcional**.

```sql verify
SELECT 'columna ' || column_name AS item,
       data_type || CASE WHEN is_nullable = 'NO' THEN ', obligatoria' ELSE '' END AS outcome
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customers'
UNION ALL
SELECT 'clientes conservados', (SELECT count(*)::text FROM customers)
UNION ALL
SELECT 'guardar un teléfono', workshop.try($$UPDATE customers SET phone = '+34 600 000 000' WHERE id = 1$$);
```

:::solution
```sql
ALTER TABLE customers
ADD COLUMN phone text;
```
:::
::::

::::challenge Un límite de stock
El almacén no puede guardar más de **10 000** unidades de un producto. Añade a `products` una restricción que impida que el `stock` supere ese valor.

```sql verify
SELECT 'stock de 10 000', workshop.try($$UPDATE products SET stock = 10000 WHERE id = 1$$) AS outcome
UNION ALL
SELECT 'stock de 10 001', workshop.try($$UPDATE products SET stock = 10001 WHERE id = 1$$)
UNION ALL
SELECT 'stock negativo', workshop.try($$UPDATE products SET stock = -1 WHERE id = 1$$);
```

:::hint
`ALTER TABLE ... ADD CONSTRAINT nombre CHECK (...)`. Los datos actuales cumplen la regla (el máximo es 300).
:::

:::solution
```sql
ALTER TABLE products
ADD CONSTRAINT products_stock_max CHECK (stock <= 10000);
```
La regla `stock >= 0` ya existía: un producto puede tener varias restricciones `CHECK` y todas deben cumplirse.
:::
::::

::::challenge Ciudad obligatoria
Haz que la ciudad de los clientes sea **obligatoria**. Los clientes que hoy no tienen ciudad deben quedar con la ciudad `'Desconocida'`.

```sql verify
SELECT 'clientes con ciudad desconocida' AS item, (SELECT count(*)::text FROM customers WHERE city = 'Desconocida') AS outcome
UNION ALL
SELECT 'clientes sin ciudad', (SELECT count(*)::text FROM customers WHERE city IS NULL)
UNION ALL
SELECT 'nuevo cliente sin ciudad', workshop.try($$INSERT INTO customers (first_name, last_name, email, country, signup_date) VALUES ('Leo', 'Paz', 'leo.paz@example.com', 'Chile', '2025-03-01')$$);
```

:::hint
Dos sentencias: un `UPDATE` para los datos y un `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` para la regla. ¿En qué orden?
:::

:::solution
```sql
UPDATE customers
SET city = 'Desconocida'
WHERE city IS NULL;

ALTER TABLE customers
ALTER COLUMN city SET NOT NULL;
```
:::
::::

:::recap
- `ALTER TABLE ... ADD COLUMN`, `RENAME COLUMN`, `DROP COLUMN` cambian la estructura sin perder los datos de las demás columnas.
- Una restricción nueva se comprueba contra **los datos existentes**: si no la cumplen, primero se arreglan los datos.
- Añadir una columna con `DEFAULT` es instantáneo desde PostgreSQL 11; `NOT VALID` evita bloqueos al añadir reglas a tablas grandes.
- En una aplicación, los cambios de esquema son **migraciones** versionadas, nunca cambios a mano en producción.

En el último paso diseñarás una tabla completa con todas sus reglas.
:::
