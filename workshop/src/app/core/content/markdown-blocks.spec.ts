import { Marked } from 'marked';
import { workshopMarkdownExtension } from './markdown-blocks';

function render(markdown: string): string {
  return new Marked(workshopMarkdownExtension).parse(markdown, { async: false }) as string;
}

function islandsOf(html: string): { name: string; props: Record<string, unknown>; element: HTMLElement }[] {
  const host = document.createElement('div');
  host.innerHTML = html;
  return [...host.querySelectorAll<HTMLElement>('[data-island]')].map((element) => ({
    name: element.dataset['island']!,
    props: JSON.parse(element.dataset['props']!),
    element,
  }));
}

const CHALLENGE = [
  '::::challenge Clientes de Madrid',
  'Lista el nombre de los clientes de Madrid.',
  '',
  '```sql starter',
  'SELECT',
  '```',
  '',
  ':::hint',
  'Filtra con WHERE.',
  ':::',
  '',
  ':::solution',
  '```sql ordered',
  "SELECT first_name FROM customers WHERE city = 'Madrid' ORDER BY first_name;",
  '```',
  'Explicación de la solución.',
  ':::',
  '::::',
].join('\n');

describe('workshop markdown blocks', () => {
  describe('compare blocks', () => {
    const COMPARE = [
      ':::compare Buscar por email',
      '¿Cuál crees que es más rápida?',
      '',
      '```sql setup',
      'CREATE INDEX customers_email_idx ON customers (email);',
      '```',
      '',
      '```sql variant label="Función sobre la columna"',
      "SELECT id FROM customers WHERE lower(email) = 'ana@example.com';",
      '```',
      'La función impide usar el **índice**.',
      '',
      '```sql variant-setup',
      'ANALYZE customers;',
      '```',
      '```sql variant label="Comparación directa" best',
      "SELECT id FROM customers WHERE email = 'ana@example.com';",
      '```',
      'Usa el índice.',
      ':::',
    ].join('\n');

    it('turns a :::compare block into a compare island with every variant', () => {
      const [island] = islandsOf(render(COMPARE));

      expect(island.name).toBe('compare');
      expect(island.props).toEqual({
        title: 'Buscar por email',
        setupSql: 'CREATE INDEX customers_email_idx ON customers (email);',
        variants: [
          {
            label: 'Función sobre la columna',
            sql: "SELECT id FROM customers WHERE lower(email) = 'ana@example.com';",
            explanationHtml: '<p>La función impide usar el <strong>índice</strong>.</p>\n',
          },
          {
            label: 'Comparación directa',
            sql: "SELECT id FROM customers WHERE email = 'ana@example.com';",
            setupSql: 'ANALYZE customers;',
            best: true,
            explanationHtml: '<p>Usa el índice.</p>\n',
          },
        ],
      });
    });

    it('keeps the introduction as regular content before the island', () => {
      const html = render(COMPARE);

      expect(html.indexOf('¿Cuál crees que es más rápida?')).toBeLessThan(html.indexOf('data-island="compare"'));
      expect(html).not.toContain('<pre>');
    });

    it('labels variants without a label with letters', () => {
      const [island] = islandsOf(render(':::compare\n```sql variant\nSELECT 1;\n```\n```sql variant\nSELECT 2;\n```\n:::'));

      expect((island.props['variants'] as { label: string }[]).map((v) => v.label)).toEqual(['Opción A', 'Opción B']);
    });
  });

  describe('auto-checked challenges', () => {
    it('adds a challenge island with the reference solution, its flags and the starter code', () => {
      const [island] = islandsOf(render(CHALLENGE));

      expect(island.name).toBe('challenge');
      expect(island.props).toEqual({
        solutionSql: "SELECT first_name FROM customers WHERE city = 'Madrid' ORDER BY first_name;",
        ordered: true,
        starter: 'SELECT',
      });
    });

    it('places the island after the statement and before the hints, and hides the starter fence', () => {
      const html = render(CHALLENGE);
      const host = document.createElement('div');
      host.innerHTML = html;
      const body = host.querySelector('.challenge__body')!;
      const order = [...body.children].map((child) => child.getAttribute('data-island') ?? child.className ?? child.tagName);

      expect(order).toEqual(['', 'challenge', 'challenge-hint', 'challenge-solution']);
      expect(body.firstElementChild?.textContent).toContain('Lista el nombre');
      expect(body.querySelectorAll('pre')).toHaveLength(1); // only the solution is shown, inside its <details>
    });

    it('passes hidden verify and setup queries for data-changing challenges', () => {
      const markdown = [
        '::::challenge Desactivar clientes',
        'Desactiva a los clientes sin ciudad.',
        '```sql verify',
        'SELECT id, is_active FROM customers ORDER BY id;',
        '```',
        '```sql setup',
        "INSERT INTO customers (first_name, last_name, email, country, signup_date) VALUES ('X', 'Y', 'x@y.z', 'Chile', '2025-01-01');",
        '```',
        ':::solution',
        '```sql',
        'UPDATE customers SET is_active = false WHERE city IS NULL;',
        '```',
        ':::',
        '::::',
      ].join('\n');

      const [island] = islandsOf(render(markdown));

      expect(island.props).toEqual({
        solutionSql: 'UPDATE customers SET is_active = false WHERE city IS NULL;',
        verifySql: 'SELECT id, is_active FROM customers ORDER BY id;',
        setupSql:
          "INSERT INTO customers (first_name, last_name, email, country, signup_date) VALUES ('X', 'Y', 'x@y.z', 'Chile', '2025-01-01');",
      });
      const challenge = island.element.closest('.challenge')!;
      const shownCode = [...challenge.querySelectorAll('pre')].map((pre) => pre.textContent).join();
      expect(shownCode).toContain('UPDATE customers'); // the solution, inside its <details>
      expect(shownCode).not.toContain('is_active FROM');
    });

    it('keeps challenges without a SQL solution as plain text challenges', () => {
      const html = render('::::challenge Piensa\nTexto\n:::solution\nUna respuesta en palabras.\n:::\n::::');

      expect(islandsOf(html)).toHaveLength(0);
    });
  });

  describe('callouts', () => {
    const cases: [type: string, label: string][] = [
      ['concept', 'Concepto'],
      ['why', '¿Por qué?'],
      ['tip', 'Tip'],
      ['warning', 'Atención'],
      ['postgres', 'En PostgreSQL'],
      ['checkpoint', 'Checkpoint'],
      ['troubleshooting', 'Errores comunes'],
      ['recap', 'Resumen'],
    ];

    it.each(cases)('renders ":::%s" as a styled aside with label "%s"', (type, label) => {
      const html = render(`:::${type} My title\nBody **bold**\n:::`);

      expect(html).toContain(`<aside class="callout callout--${type}">`);
      expect(html).toContain(`<span class="callout__label">${label}</span>`);
      expect(html).toContain('<span class="callout__title">My title</span>');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('material-symbols-outlined');
    });

    it('omits the title element when no title is given', () => {
      const html = render(':::tip\nHello\n:::');

      expect(html).toContain('callout--tip');
      expect(html).not.toContain('callout__title');
    });

    it('lexes the body as full Markdown (lists, inline code, code fences)', () => {
      const html = render(':::concept Title\n- one\n- two\n\nUse `var`.\n\n```csharp\nint x = 1;\n```\n:::');

      expect(html).toContain('<li>one</li>');
      expect(html).toContain('<code>var</code>');
      expect(html).toContain('language-csharp');
    });

    it('supports inline Markdown inside the title', () => {
      const html = render(':::tip Usa `dotnet run`\nx\n:::');

      expect(html).toContain('<code>dotnet run</code>');
    });

    it('interrupts a paragraph that is directly followed by a container', () => {
      const html = render('Before\n:::tip\nInside\n:::\nAfter');

      expect(html).toContain('<p>Before</p>');
      expect(html).toContain('callout--tip');
      expect(html).toContain('<p>After</p>');
    });

    it('leaves unknown container types as plain text', () => {
      const html = render(':::banana\nx\n:::');

      expect(html).not.toContain('callout');
      expect(html).toContain(':::banana');
    });

    it('does not swallow content when a container is never closed', () => {
      const html = render(':::tip\nunclosed');

      expect(html).not.toContain('callout--tip');
      expect(html).toContain('unclosed');
    });

    it('renders several containers in a row', () => {
      const html = render(':::tip\nA\n:::\n\n:::warning\nB\n:::');

      expect(html.match(/<aside/g)).toHaveLength(2);
      expect(html).toContain('callout--tip');
      expect(html).toContain('callout--warning');
    });

    it('handles Windows line endings', () => {
      const html = render(':::tip Title\r\nBody\r\n:::\r\n');

      expect(html).toContain('callout--tip');
      expect(html).toContain('Body');
    });
  });

  describe('challenge', () => {
    const challenge = [
      '::::challenge Implementa GET /api/books/{id}',
      'Enunciado con `code`.',
      '',
      ':::hint',
      'Primera pista',
      ':::',
      '',
      ':::hint',
      'Segunda pista',
      ':::',
      '',
      ':::solution',
      '```csharp title="Controllers/BooksController.cs"',
      'return Ok();',
      '```',
      ':::',
      '::::',
    ].join('\n');

    it('renders a card with label and title', () => {
      const html = render(challenge);

      expect(html).toContain('<section class="challenge">');
      expect(html).toContain('<span class="challenge__label">Reto</span>');
      expect(html).toContain('Implementa GET /api/books/{id}');
      expect(html).toContain('<code>code</code>');
    });

    it('numbers multiple hints as collapsed details', () => {
      const html = render(challenge);

      expect(html).toContain('<summary>Pista 1</summary>');
      expect(html).toContain('<summary>Pista 2</summary>');
      expect(html).toContain('Primera pista');
      expect(html).toContain('Segunda pista');
      expect(html).not.toMatch(/<details[^>]* open/);
    });

    it('renders the solution as details with a "try it first" note', () => {
      const html = render(challenge);

      expect(html).toContain('<summary>Ver solución</summary>');
      expect(html).toContain('Inténtalo primero por tu cuenta');
      expect(html).toContain('Controllers/BooksController.cs');
      expect(html).toContain('return Ok();');
    });

    it('keeps the order: statement, hints, solution', () => {
      const html = render(challenge);

      expect(html.indexOf('Enunciado')).toBeLessThan(html.indexOf('Pista 1'));
      expect(html.indexOf('Pista 2')).toBeLessThan(html.indexOf('Ver solución'));
    });

    it('restarts hint numbering for each challenge', () => {
      const html = render(`${challenge}\n\n${challenge}`);

      expect(html.match(/<summary>Pista 1<\/summary>/g)).toHaveLength(2);
      expect(html.match(/<summary>Pista 2<\/summary>/g)).toHaveLength(2);
    });

    it('allows a callout nested in a challenge', () => {
      const html = render('::::challenge T\nText\n\n:::tip\nNested\n:::\n::::');

      expect(html).toContain('callout--tip');
      expect(html).toContain('<section class="challenge">');
    });
  });

  describe('code fences', () => {
    it('renders title="..." as a filename header and keeps the language for Prism', () => {
      const html = render('```csharp title="Controllers/BooksController.cs"\nvar x = 1 < 2;\n```');

      expect(html).toContain('class="code-block__filename">Controllers/BooksController.cs</span>');
      expect(html).toContain('<code class="language-csharp">');
      expect(html).toContain('var x = 1 &lt; 2;');
    });

    it('adds a copy button to every code block', () => {
      const titled = render('```json title="appsettings.json"\n{}\n```');
      const plain = render('```bash\ndotnet run\n```');

      expect(titled).toContain('data-copy');
      expect(plain).toContain('data-copy');
    });

    it('does not add a filename header to a plain fence', () => {
      const html = render('```bash\ndotnet run\n```');

      expect(html).not.toContain('code-block__filename');
      expect(html).toContain('<code class="language-bash">dotnet run\n</code>');
    });

    it('handles fences without language', () => {
      const html = render('```\nplain\n```');

      expect(html).toContain('plain');
      expect(html).not.toContain('language-undefined');
    });

    it('escapes the title', () => {
      const html = render('```csharp title="<script>.cs"\nx\n```');

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;.cs');
    });
  });

  describe('runnable SQL fences', () => {
    function islands(html: string): HTMLElement[] {
      const host = document.createElement('div');
      host.innerHTML = html;
      return [...host.querySelectorAll<HTMLElement>('[data-island]')];
    }

    it('turns ```sql run into a runner island carrying the code instead of a static block', () => {
      const html = render('```sql run\nSELECT name\nFROM customers\nWHERE name <> \'"x"\';\n```');
      const [island] = islands(html);

      expect(island.dataset['island']).toBe('runner');
      expect(JSON.parse(island.dataset['props']!)).toEqual({ code: 'SELECT name\nFROM customers\nWHERE name <> \'"x"\';' });
      expect(html).not.toContain('<pre>');
    });

    it('keeps the title of a runnable fence', () => {
      const [island] = islands(render('```sql run title="Clientes de Madrid"\nSELECT 1;\n```'));

      expect(JSON.parse(island.dataset['props']!)).toEqual({ code: 'SELECT 1;', title: 'Clientes de Madrid' });
    });

    it('leaves a plain ```sql fence as a static highlighted block', () => {
      const html = render('```sql\nSELECT 1;\n```');

      expect(islands(html)).toHaveLength(0);
      expect(html).toContain('<code class="language-sql">SELECT 1;\n</code>');
    });
  });
});
