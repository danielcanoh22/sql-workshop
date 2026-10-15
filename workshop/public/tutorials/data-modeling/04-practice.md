## Objetivo del paso

Vas a diseñar el esquema de otra aplicación a partir de sus requisitos: una **biblioteca**. Antes de escribir SQL, aplica el método de este tutorial:

1. Subraya las **entidades** y sus **atributos**.
2. Para cada relación, haz las dos preguntas de la **cardinalidad**.
3. Convierte cada regla del texto en una **restricción**.

> La biblioteca tiene **libros**, identificados por su **ISBN** (único) y con un título y, si se conoce, el año de publicación. Un libro puede tener **varios autores**, y un autor puede haber escrito varios libros.
>
> Los **socios** se registran con su nombre y un email que no se puede repetir; la fecha de alta es el día del registro.
>
> Un socio se lleva libros en **préstamo**. Cada préstamo registra el libro, el socio, la fecha del préstamo (por defecto, hoy), la fecha límite de devolución, que tiene que ser posterior a la del préstamo, y la fecha en que se devolvió, que queda vacía mientras el libro no vuelve y nunca puede ser anterior al préstamo.

## Retos

::::challenge El catálogo
Crea las tablas del catálogo:

- `authors`: `id` (clave primaria generada) y `name` (texto obligatorio).
- `books`: `id` (clave primaria generada), `isbn` (texto obligatorio y único), `title` (texto obligatorio) y `published_year` (entero, opcional).
- `book_authors`: la relación entre libros y autores. Si se borra un libro, se borran sus relaciones con autores; un autor que tiene libros **no** se puede borrar.

```sql verify
SELECT table_name || '.' || column_name AS item,
       data_type || CASE WHEN is_nullable = 'NO' THEN ', obligatoria' ELSE '' END AS outcome
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('authors', 'books')
UNION ALL
SELECT 'libro válido', workshop.try($$INSERT INTO books (isbn, title) VALUES ('978-84-376-0494-7', 'Cien años de soledad')$$)
UNION ALL
SELECT 'ISBN repetido', workshop.try($$INSERT INTO books (isbn, title) VALUES ('978-1', 'A'), ('978-1', 'B')$$)
UNION ALL
SELECT 'libro sin título', workshop.try($$INSERT INTO books (isbn) VALUES ('978-1')$$)
UNION ALL
SELECT 'libro con dos autores', workshop.try(
  $$INSERT INTO books (isbn, title) VALUES ('978-1', 'Obra conjunta');
    INSERT INTO authors (name) VALUES ('Autora A'), ('Autor B');
    INSERT INTO book_authors (book_id, author_id) SELECT b.id, a.id FROM books AS b CROSS JOIN authors AS a$$,
  $$SELECT count(*)::text FROM book_authors$$)
UNION ALL
SELECT 'el mismo autor dos veces', workshop.try(
  $$INSERT INTO books (isbn, title) VALUES ('978-1', 'Obra');
    INSERT INTO authors (name) VALUES ('Autora A');
    INSERT INTO book_authors (book_id, author_id) SELECT b.id, a.id FROM books AS b CROSS JOIN authors AS a;
    INSERT INTO book_authors (book_id, author_id) SELECT b.id, a.id FROM books AS b CROSS JOIN authors AS a$$)
UNION ALL
SELECT 'relaciones tras borrar el libro', workshop.try(
  $$INSERT INTO books (isbn, title) VALUES ('978-1', 'Obra');
    INSERT INTO authors (name) VALUES ('Autora A');
    INSERT INTO book_authors (book_id, author_id) SELECT b.id, a.id FROM books AS b CROSS JOIN authors AS a;
    DELETE FROM books$$,
  $$SELECT count(*)::text FROM book_authors$$)
UNION ALL
SELECT 'borrar un autor con libros', workshop.try(
  $$INSERT INTO books (isbn, title) VALUES ('978-1', 'Obra');
    INSERT INTO authors (name) VALUES ('Autora A');
    INSERT INTO book_authors (book_id, author_id) SELECT b.id, a.id FROM books AS b CROSS JOIN authors AS a;
    DELETE FROM authors$$);
```

:::hint
Libros y autores son N:M: `book_authors` tiene una clave foránea hacia cada lado y su clave primaria es la combinación de ambas.
:::

:::hint
Solo la clave foránea hacia `books` lleva `ON DELETE CASCADE`. Y no olvides los índices de las claves foráneas que no son la primera columna de la clave primaria.
:::

:::solution
```sql
CREATE TABLE authors (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE books (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  isbn text NOT NULL UNIQUE,
  title text NOT NULL,
  published_year integer
);

CREATE TABLE book_authors (
  book_id integer NOT NULL REFERENCES books (id) ON DELETE CASCADE,
  author_id integer NOT NULL REFERENCES authors (id),
  PRIMARY KEY (book_id, author_id)
);

CREATE INDEX book_authors_author_id_idx ON book_authors (author_id);
```
:::
::::

::::challenge Socios y préstamos
Con el catálogo ya creado (la corrección crea `authors`, `books` y `book_authors` antes de tu respuesta), crea:

- `members`: `id` (clave primaria generada), `name` (texto obligatorio), `email` (texto obligatorio y único) y `joined_on` (fecha obligatoria, por defecto el día actual).
- `loans`: `id` (clave primaria generada), `book_id` y `member_id` (obligatorios, con sus claves foráneas), `loaned_on` (fecha obligatoria, por defecto hoy), `due_on` (fecha obligatoria) y `returned_on` (fecha opcional), con las reglas de fechas de los requisitos.

```sql setup
CREATE TABLE authors (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE books (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  isbn text NOT NULL UNIQUE,
  title text NOT NULL,
  published_year integer
);

CREATE TABLE book_authors (
  book_id integer NOT NULL REFERENCES books (id) ON DELETE CASCADE,
  author_id integer NOT NULL REFERENCES authors (id),
  PRIMARY KEY (book_id, author_id)
);

INSERT INTO books (isbn, title) VALUES ('978-84-376-0494-7', 'Cien años de soledad');
```

```sql verify
SELECT table_name || '.' || column_name AS item,
       data_type || CASE WHEN is_nullable = 'NO' THEN ', obligatoria' ELSE '' END AS outcome
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('members', 'loans')
UNION ALL
SELECT 'socio válido', workshop.try($$INSERT INTO members (name, email) VALUES ('Ana', 'ana@example.com')$$)
UNION ALL
SELECT 'alta hoy por defecto', workshop.try($$INSERT INTO members (name, email) VALUES ('Ana', 'ana@example.com')$$, $$SELECT (joined_on = current_date)::text FROM members$$)
UNION ALL
SELECT 'email repetido', workshop.try($$INSERT INTO members (name, email) VALUES ('Ana', 'ana@example.com'), ('Otra Ana', 'ana@example.com')$$)
UNION ALL
SELECT 'préstamo válido', workshop.try(
  $$INSERT INTO members (name, email) VALUES ('Ana', 'ana@example.com');
    INSERT INTO loans (book_id, member_id, due_on) SELECT b.id, m.id, current_date + 14 FROM books AS b CROSS JOIN members AS m$$,
  $$SELECT (loaned_on = current_date AND returned_on IS NULL)::text FROM loans$$)
UNION ALL
SELECT 'devolver antes de prestar', workshop.try(
  $$INSERT INTO members (name, email) VALUES ('Ana', 'ana@example.com');
    INSERT INTO loans (book_id, member_id, loaned_on, due_on, returned_on)
    SELECT b.id, m.id, '2025-03-10', '2025-03-24', '2025-03-01' FROM books AS b CROSS JOIN members AS m$$)
UNION ALL
SELECT 'devolver el mismo día', workshop.try(
  $$INSERT INTO members (name, email) VALUES ('Ana', 'ana@example.com');
    INSERT INTO loans (book_id, member_id, loaned_on, due_on, returned_on)
    SELECT b.id, m.id, '2025-03-10', '2025-03-24', '2025-03-10' FROM books AS b CROSS JOIN members AS m$$)
UNION ALL
SELECT 'fecha límite el mismo día', workshop.try(
  $$INSERT INTO members (name, email) VALUES ('Ana', 'ana@example.com');
    INSERT INTO loans (book_id, member_id, loaned_on, due_on)
    SELECT b.id, m.id, '2025-03-10', '2025-03-10' FROM books AS b CROSS JOIN members AS m$$)
UNION ALL
SELECT 'socio inexistente', workshop.try($$INSERT INTO loans (book_id, member_id, due_on) SELECT id, 999, current_date + 14 FROM books$$);
```

:::hint
`current_date` es la fecha de hoy: úsala como `DEFAULT` de `joined_on` y de `loaned_on`.
:::

:::hint
Dos `CHECK` que comparan columnas: la fecha límite es **posterior** al préstamo (`>`), y la devolución **no anterior** (`>=`). Un `CHECK` sobre `returned_on` se cumple cuando la columna es `NULL`, así que no impide los préstamos sin devolver.
:::

:::solution
```sql
CREATE TABLE members (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  joined_on date NOT NULL DEFAULT current_date
);

CREATE TABLE loans (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id integer NOT NULL REFERENCES books (id),
  member_id integer NOT NULL REFERENCES members (id),
  loaned_on date NOT NULL DEFAULT current_date,
  due_on date NOT NULL,
  returned_on date,
  CONSTRAINT loans_due_check CHECK (due_on > loaned_on),
  CONSTRAINT loans_returned_check CHECK (returned_on >= loaned_on)
);

CREATE INDEX loans_book_id_idx ON loans (book_id);
CREATE INDEX loans_member_id_idx ON loans (member_id);
```
Un detalle clave: un `CHECK` solo rechaza una fila cuando la condición es **falsa**. Con `returned_on = NULL`, `returned_on >= loaned_on` es *desconocido*, no falso, así que los préstamos pendientes se aceptan sin ninguna regla especial.
:::
::::

:::recap
En este tutorial has aprendido a diseñar antes de escribir SQL:

- Requisitos → **entidades**, **atributos** y **relaciones**; la cardinalidad sale de dos preguntas.
- **1:N** con una clave foránea, **N:M** con una tabla intermedia, **1:1** con una clave primaria que también es foránea.
- **Normaliza** para que cada dato viva en un solo sitio; **desnormaliza** solo cuando el dato duplicado representa otra cosa.
- Patrones habituales: jerarquías con `parent_id`, `CHECK` o tabla de referencia para listas cerradas, columnas de auditoría.
- Cada regla de los requisitos se convierte en una restricción, y los casos límite (`>` o `>=`) importan.

En el siguiente tutorial aprenderás a agrupar varias modificaciones en una unidad que se aplica entera o no se aplica: las **transacciones**.
:::
