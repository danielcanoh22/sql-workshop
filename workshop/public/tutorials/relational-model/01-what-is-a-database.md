## Objetivo del paso

Entender qué problema resuelve una base de datos relacional y qué papel juega SQL. Al terminar sabrás:

1. Por qué una aplicación no guarda sus datos en archivos o en una hoja de cálculo.
2. Qué es una base de datos **relacional** y qué es un **sistema gestor** como PostgreSQL.
3. Qué significa que SQL sea un lenguaje **declarativo**.

## El problema: guardar datos que muchos usan a la vez

Imagina la tienda online guardando sus clientes y pedidos en un archivo JSON o en una hoja de cálculo. Funciona con diez pedidos. Con miles, empiezan los problemas:

| Problema | Qué pasa con un archivo |
| --- | --- |
| **Concurrencia** | Dos clientes compran el último producto a la vez: los dos procesos leen "stock = 1", los dos escriben "stock = 0" y se vendieron dos unidades que no existían. |
| **Integridad** | Nada impide guardar un pedido de un cliente que no existe, un precio negativo o un email repetido. |
| **Consultas** | Para saber "cuánto vendimos en marzo" hay que leer el archivo entero y programar el cálculo a mano. |
| **Fallos** | Si el programa se cae a mitad de escribir, el archivo puede quedar corrupto. |

Una **base de datos** resuelve exactamente estos problemas. No es "un sitio donde guardar datos": es un programa especializado en guardarlos **de forma segura, consistente y consultable**, aunque miles de usuarios los usen a la vez.

:::concept Base de datos y sistema gestor
- La **base de datos** son los datos y su estructura: las tablas de la tienda.
- El **sistema gestor de bases de datos** (SGBD, o *DBMS* en inglés) es el programa que los administra: recibe las consultas, comprueba las reglas, coordina los accesos simultáneos y garantiza que nada se pierda. **PostgreSQL** es un SGBD; también lo son MySQL, SQL Server, Oracle o SQLite.
:::

## Relacional: datos en tablas que se relacionan

Una base de datos **relacional** organiza los datos en **tablas**: una por cada tipo de cosa (clientes, productos, pedidos). Cada tabla tiene **columnas** fijas y una **fila** por cada elemento.

Pulsa el botón **Datos** y abre la pestaña **Diagrama**. Verás las cinco tablas de la tienda y unas líneas que las unen: un pedido apunta a su cliente, una línea de pedido apunta a su pedido y a su producto. Esas líneas son las **relaciones** que dan nombre al modelo. Las estudiarás a fondo en el paso de claves foráneas.

:::why ¿Por qué no guardar el nombre del cliente dentro de cada pedido?
Porque si Ana cambia su email, habría que cambiarlo en todos sus pedidos, y bastaría olvidar uno para tener datos contradictorios. En el modelo relacional, **cada dato vive en un solo sitio** (el email de Ana está una vez, en `customers`) y el pedido solo guarda **a quién pertenece**. Así es imposible que dos copias del mismo dato no coincidan.
:::

## SQL: decir qué quieres, no cómo conseguirlo

**SQL** (*Structured Query Language*) es el lenguaje para hablar con una base de datos relacional. Es **declarativo**: describes **qué** datos quieres, y el SGBD decide **cómo** obtenerlos (qué tabla leer primero, si usar un índice, en qué orden).

Ejecuta tu primera consulta. Pide los nombres de las categorías del catálogo:

```sql run title="Tu primera consulta"
SELECT name
FROM categories;
```

Se lee casi como una frase: "selecciona el nombre de las categorías". No dijiste cómo recorrer la tabla ni dónde está guardada: solo qué querías.

:::postgres ¿Qué PostgreSQL estás usando?
El workshop usa **PGlite**, que es PostgreSQL compilado para ejecutarse dentro del navegador. Es el mismo motor que usarías en un servidor, con una diferencia: solo admite **una conexión a la vez**, porque está pensado para un único usuario. Lo que aprendas aquí funciona igual en un PostgreSQL de producción; la diferencia más visible, cómo se ordenan los textos con tildes, la verás en el tutorial **Ordenar y paginar**.

La siguiente consulta le pregunta al servidor su versión.
:::

```sql run title="La versión del servidor"
SELECT version();
```

## Reto

::::challenge Nombres de los productos
Cambia la consulta de las categorías para que muestre los **nombres de los productos**. La tabla de productos se llama `products` y su columna de nombre también se llama `name`.

```sql starter
SELECT name
FROM categories;
```

:::hint
Solo tienes que cambiar el nombre de la tabla que va después de `FROM`.
:::

:::solution
```sql
SELECT name
FROM products;
```
`SELECT` dice qué columnas quieres y `FROM` de qué tabla salen. Lo verás con todo detalle en el tutorial **SELECT y WHERE**.
:::
::::

::::challenge ¿Qué guardarías en cada tabla?
Una aplicación de **biblioteca** tiene que guardar libros, socios y préstamos (qué socio se llevó qué libro, cuándo y cuándo lo devolvió). Piensa: ¿qué tablas crearías y qué columnas tendría cada una? ¿Dónde guardarías el nombre del socio: en la tabla de préstamos o en otra?

:::hint
Una tabla por cada tipo de cosa. Un préstamo **relaciona** un socio con un libro.
:::

:::solution
Una propuesta razonable:

| Tabla | Columnas |
| --- | --- |
| `books` | id, título, autor, año |
| `members` | id, nombre, email, fecha de alta |
| `loans` | id, id del libro, id del socio, fecha del préstamo, fecha de devolución |

El nombre del socio va **solo** en `members`. El préstamo guarda únicamente el **id** del socio y el del libro: así, si el socio cambia de email, no hay que tocar sus préstamos. Es el mismo patrón que `orders` y `customers` en la tienda.
:::
::::

:::recap
- Una base de datos guarda datos de forma **segura, consistente y consultable**, aunque muchos usuarios los usen a la vez.
- El **SGBD** (PostgreSQL) es el programa que la administra y hace cumplir sus reglas.
- El modelo **relacional** organiza los datos en tablas que se relacionan entre sí; **cada dato vive en un solo sitio**.
- **SQL** es declarativo: dices qué datos quieres y el SGBD decide cómo obtenerlos.

En el siguiente paso verás de qué está hecha una tabla: filas, columnas y tipos de datos.
:::
