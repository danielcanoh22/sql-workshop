## Objetivo del paso

Las tablas por separado no bastan: un pedido tiene que saber de qué cliente es. En este paso aprendes:

1. Qué es una **clave foránea** y cómo representa una relación.
2. Qué es la **integridad referencial** y cómo la base de datos impide referencias rotas.
3. Los tipos de relación más comunes: uno a muchos y muchos a muchos.

## Una tabla que apunta a otra

Mira la tabla `orders` en el panel **Datos**: la columna `customer_id` tiene el icono de un **enlace** y una flecha `→ customers.id`. Eso significa que su valor es el `id` de un cliente.

```sql run title="Los pedidos del cliente 1"
SELECT id, customer_id, order_date, status
FROM orders
WHERE customer_id = 1;
```

El cliente 1 (Ana García) tiene tres pedidos. Ninguno guarda su nombre ni su email: solo el número `1`. Si quieres los datos de Ana, están en `customers`, en la fila con `id = 1`.

:::concept Clave foránea (foreign key)
Una **clave foránea** es una columna cuyo valor debe coincidir con la clave primaria de **otra** tabla. En la tienda:

```sql
customer_id integer NOT NULL REFERENCES customers (id)
```

`REFERENCES customers (id)` le dice a la base de datos que cada `customer_id` de un pedido tiene que existir como `id` en `customers`.
:::

## Integridad referencial: nada de referencias rotas

¿Qué pasa si intentas crear un pedido para el cliente 999, que no existe?

```sql run error title="Un pedido de un cliente inexistente"
INSERT INTO orders (customer_id, order_date, status)
VALUES (999, '2025-05-01', 'pending');
```

`violates foreign key constraint "orders_customer_id_fkey"`: la base de datos lo impide. Y al revés, tampoco te deja borrar un cliente que tiene pedidos, porque esos pedidos quedarían apuntando a la nada:

```sql run error title="Borrar un cliente con pedidos"
DELETE FROM customers
WHERE id = 1;
```

:::why ¿Por qué no lo controla solo la aplicación?
Porque la aplicación no es la única que toca los datos: hay scripts de migración, procesos nocturnos, otro microservicio, alguien ejecutando una consulta a mano. Y porque las aplicaciones tienen errores. La clave foránea es una regla que **se cumple siempre**, venga de donde venga el cambio. Sin ella, tarde o temprano aparecen pedidos huérfanos que rompen los informes y las pantallas.
:::

:::tip ON DELETE: qué hacer con los hijos
Por defecto, borrar un cliente con pedidos falla, como acabas de ver. Al definir la clave foránea se puede elegir otra conducta, por ejemplo `ON DELETE CASCADE` (borrar también sus pedidos). Lo verás en el tutorial de tablas y restricciones; para datos importantes como pedidos, que fallen es casi siempre lo correcto.
:::

## Tipos de relación

### Uno a muchos (1:N)

Un cliente tiene **muchos** pedidos; un pedido es de **un** cliente. Es la relación más común, y siempre se implementa igual: la clave foránea va en la tabla del lado "muchos" (`orders.customer_id`). Lo mismo pasa entre categorías y productos: `products.category_id`.

### Muchos a muchos (N:M)

Un pedido tiene muchos productos y un producto aparece en muchos pedidos. Esto **no** se puede guardar con una columna en ninguna de las dos tablas. Se usa una **tabla intermedia**: `order_items`, con una clave foránea hacia cada lado (`order_id` y `product_id`) y los datos propios de la relación (`quantity`, `unit_price`).

Abre **Datos → Diagrama** y busca las dos flechas que salen de `order_items`.

:::postgres Las claves foráneas no se indexan solas
PostgreSQL crea automáticamente un índice para cada clave primaria y cada `UNIQUE`, pero **no** para las claves foráneas. Como casi siempre se busca por ellas ("los pedidos del cliente 1"), es una buena práctica crear el índice a mano. La tienda ya lo hace:

```sql
CREATE INDEX orders_customer_id_idx ON orders (customer_id);
```

Lo entenderás a fondo en el tutorial de índices.
:::

## Retos

::::challenge Los pedidos de Sofía
Sofía Díaz es la clienta con `id` **7**. Muestra el **id**, la **fecha** y el **estado** de todos sus pedidos.

:::hint
Los pedidos están en `orders` y la columna que apunta al cliente es `customer_id`.
:::

:::solution
```sql
SELECT id, order_date, status
FROM orders
WHERE customer_id = 7;
```
Tiene tres pedidos. Fíjate en que no necesitas su nombre: la relación se hace con el `id`. Unir ambas tablas para ver el nombre junto a cada pedido es lo que harás con los JOINs.
:::
::::

::::challenge Los productos de Deportes
La categoría Deportes tiene el `id` **4**. Muestra el **nombre** y el **precio** de sus productos.

:::hint
Es la misma relación de uno a muchos, entre `categories` y `products`.
:::

:::solution
```sql
SELECT name, price
FROM products
WHERE category_id = 4;
```
:::
::::

::::challenge Diseña las relaciones
Una plataforma de cursos online tiene **profesores**, **cursos** y **alumnos**. Cada curso lo imparte un solo profesor, que puede impartir varios cursos. Un alumno puede inscribirse en muchos cursos y cada curso tiene muchos alumnos; además, hay que guardar la **fecha de inscripción**. ¿Qué tablas crearías y dónde irían las claves foráneas?

:::hint
Una relación es de uno a muchos y la otra de muchos a muchos. ¿Dónde guardarías la fecha de inscripción?
:::

:::solution
| Tabla | Claves foráneas |
| --- | --- |
| `teachers` | — |
| `courses` | `teacher_id → teachers.id` (uno a muchos: la clave va en el lado "muchos") |
| `students` | — |
| `enrollments` | `course_id → courses.id` y `student_id → students.id`, con clave primaria `(course_id, student_id)` |

La fecha de inscripción es un dato **de la relación** (no del alumno ni del curso), así que vive en la tabla intermedia `enrollments`, igual que `quantity` vive en `order_items`.
:::
::::

:::recap
- Una **clave foránea** es una columna que apunta a la clave primaria de otra tabla (`REFERENCES`).
- La **integridad referencial** impide crear referencias a filas inexistentes y borrar filas que otras usan.
- **Uno a muchos**: la clave foránea va en la tabla del lado "muchos".
- **Muchos a muchos**: se usa una **tabla intermedia** con una clave foránea hacia cada lado.
- PostgreSQL no indexa las claves foráneas automáticamente: créale un índice.

En el último paso verás el resto de reglas que protegen los datos: `NOT NULL`, `UNIQUE`, `CHECK` y `DEFAULT`.
:::
