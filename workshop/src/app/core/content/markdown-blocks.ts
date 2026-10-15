import type { MarkedExtension, RendererThis, Token, TokenizerThis, Tokens } from 'marked';

/**
 * Custom Markdown syntax of the workshop (the contract with the tutorial authors):
 *
 *   :::concept Optional title        callouts: concept | why | tip | warning | postgres |
 *   Markdown body...                           checkpoint | troubleshooting | recap
 *   :::
 *
 *   ::::challenge Title              4+ colons so the inner 3-colon blocks can nest
 *   Statement...
 *   :::hint                          one or more, numbered automatically
 *   ...
 *   :::
 *   :::solution
 *   ...
 *   :::
 *   ::::
 *
 *   ```sql title="queries/top-customers.sql"   -> filename header above the block
 *   ```sql run title="Optional caption"         -> editable SQL block with a Run button (an interactive island)
 *   ```sql run error                             -> same, for an example that fails on purpose
 *   ```sql example (inside :::solution)          -> code in the answer of a conceptual (not auto-checked) challenge
 *
 * A container closes on the first line made of exactly the same number of colons that opened it.
 */

const TOKEN_TYPE = 'workshopContainer';

type CalloutKind =
  | 'concept'
  | 'why'
  | 'tip'
  | 'warning'
  | 'postgres'
  | 'checkpoint'
  | 'troubleshooting'
  | 'recap';
type ContainerKind = CalloutKind | 'challenge' | 'hint' | 'solution' | 'compare';

interface CalloutMeta {
  readonly label: string;
  readonly icon: string;
}

const CALLOUTS: Record<CalloutKind, CalloutMeta> = {
  concept: { label: 'Concepto', icon: 'psychology' },
  why: { label: '¿Por qué?', icon: 'help' },
  tip: { label: 'Tip', icon: 'lightbulb' },
  warning: { label: 'Atención', icon: 'warning' },
  postgres: { label: 'En PostgreSQL', icon: 'database' },
  checkpoint: { label: 'Checkpoint', icon: 'check_circle' },
  troubleshooting: { label: 'Errores comunes', icon: 'local_fire_department' },
  recap: { label: 'Resumen', icon: 'push_pin' },
};

const CONTAINER_KINDS: ReadonlySet<string> = new Set<ContainerKind>([
  ...(Object.keys(CALLOUTS) as CalloutKind[]),
  'challenge',
  'hint',
  'solution',
  'compare',
]);

interface ContainerToken extends Tokens.Generic {
  type: typeof TOKEN_TYPE;
  kind: ContainerKind;
  titleTokens: Token[];
  /** Raw title text, for islands that render it themselves. */
  titleText: string;
  tokens: Token[];
  /** 1-based position among the hints of the parent challenge. */
  hintNumber?: number;
  /** Props of the auto-check island of a challenge that has a SQL solution. */
  checkIsland?: ChallengeIslandProps;
}

export interface ChallengeIslandProps {
  /** Identifies the challenge for saved progress, together with the tutorial and the step. */
  readonly title?: string;
  readonly solutionSql: string;
  readonly ordered?: boolean;
  readonly verifySql?: string;
  readonly setupSql?: string;
  readonly starter?: string;
}

/** Fences that configure a challenge instead of being shown: ```sql starter | verify | setup. */
const HIDDEN_FENCE_ROLES = ['starter', 'verify', 'setup'] as const;

// Opening line: 3+ colons, a lowercase type, optional title.
const OPENING_LINE = /^(:{3,})([a-z]+)[ \t]*([^\n]*)(?:\n|$)/;

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function isContainer(token: Token): token is ContainerToken {
  return token.type === TOKEN_TYPE;
}

function icon(name: string, cssClass: string): string {
  return `<span class="material-symbols-outlined ${cssClass}" aria-hidden="true">${name}</span>`;
}

function tokenizeContainer(this: TokenizerThis, src: string): ContainerToken | undefined {
  const opening = OPENING_LINE.exec(src);
  if (!opening) return undefined;

  const [openingRaw, colons, kind, title] = opening;
  if (!CONTAINER_KINDS.has(kind)) return undefined;

  const rest = src.slice(openingRaw.length);
  const closing = new RegExp(`^:{${colons.length}}[ \\t]*$`, 'm').exec(rest);
  if (!closing) return undefined; // Unclosed: leave the text alone instead of swallowing the page.

  const closingEnd = closing.index + closing[0].length;
  const trailingNewline = rest[closingEnd] === '\n' ? 1 : 0;
  const body = rest.slice(0, closing.index);

  const token: ContainerToken = {
    type: TOKEN_TYPE,
    raw: openingRaw + rest.slice(0, closingEnd + trailingNewline),
    kind: kind as ContainerKind,
    titleTokens: this.lexer.inlineTokens(title.trim()),
    titleText: title.trim(),
    tokens: this.lexer.blockTokens(body, []),
  };

  if (token.kind === 'challenge') {
    let hintCount = 0;
    for (const child of token.tokens) {
      if (isContainer(child) && child.kind === 'hint') child.hintNumber = ++hintCount;
    }
    token.checkIsland = extractChallengeCheck(token);
  }

  return token;
}

/**
 * A challenge becomes auto-checked when its `:::solution` holds a ```sql fence (the reference solution; the
 * `ordered` flag makes row order count). Hidden ```sql starter / verify / setup fences are removed from the body
 * and travel to the island instead.
 */
function extractChallengeCheck(token: ContainerToken): ChallengeIslandProps | undefined {
  const hidden: Partial<Record<(typeof HIDDEN_FENCE_ROLES)[number], string>> = {};
  token.tokens = token.tokens.filter((child) => {
    if (child.type !== 'code') return true;
    const { language, flags } = parseInfoString((child as Tokens.Code).lang);
    const role = HIDDEN_FENCE_ROLES.find((r) => flags.has(r));
    if (language !== 'sql' || !role) return true;
    hidden[role] = (child as Tokens.Code).text;
    return false;
  });

  const solution = token.tokens.find((child): child is ContainerToken => isContainer(child) && child.kind === 'solution');
  const fence = solution?.tokens.find(
    (child): child is Tokens.Code => {
      if (child.type !== 'code') return false;
      const info = parseInfoString((child as Tokens.Code).lang);
      // ```sql example shows code in the explanation of a conceptual challenge without making it auto-checked.
      return info.language === 'sql' && !info.flags.has('example');
    },
  );
  if (!fence) return undefined;

  return {
    ...(token.titleText ? { title: token.titleText } : {}),
    solutionSql: fence.text,
    ...(parseInfoString(fence.lang).flags.has('ordered') ? { ordered: true } : {}),
    ...(hidden.verify !== undefined ? { verifySql: hidden.verify } : {}),
    ...(hidden.setup !== undefined ? { setupSql: hidden.setup } : {}),
    ...(hidden.starter !== undefined ? { starter: hidden.starter } : {}),
  };
}

function renderContainer(this: RendererThis, token: Tokens.Generic): string {
  const container = token as ContainerToken;
  const title = container.titleTokens.length
    ? this.parser.parseInline(container.titleTokens)
    : '';

  if (container.kind === 'challenge') {
    // The auto-check island goes right after the statement, before the first hint or the solution.
    const split = container.tokens.findIndex((t) => isContainer(t) && (t.kind === 'hint' || t.kind === 'solution'));
    const at = container.checkIsland && split !== -1 ? split : container.tokens.length;
    const body =
      this.parser.parse(container.tokens.slice(0, at)) +
      (container.checkIsland ? islandHtml('challenge', container.checkIsland) : '') +
      this.parser.parse(container.tokens.slice(at));
    return (
      `<section class="challenge">` +
      `<header class="challenge__header">${icon('ads_click', 'challenge__icon')}` +
      `<span class="challenge__label">Reto</span>` +
      (title ? `<span class="challenge__title">${title}</span>` : '') +
      `</header><div class="challenge__body">${body}</div></section>\n`
    );
  }

  if (container.kind === 'compare') {
    return renderCompare(this, container);
  }

  const body = this.parser.parse(container.tokens);
  switch (container.kind) {
    case 'hint':
      return (
        `<details class="challenge-hint"><summary>Pista ${container.hintNumber ?? 1}</summary>` +
        `<div class="challenge-detail__body">${body}</div></details>\n`
      );
    case 'solution':
      return (
        `<details class="challenge-solution"><summary>Ver solución</summary>` +
        `<div class="challenge-detail__body">` +
        `<p class="challenge-solution__note">Inténtalo primero por tu cuenta.</p>${body}</div></details>\n`
      );
    default: {
      const meta = CALLOUTS[container.kind];
      return (
        `<aside class="callout callout--${container.kind}">` +
        `<header class="callout__header">${icon(meta.icon, 'callout__icon')}` +
        `<span class="callout__label">${meta.label}</span>` +
        (title ? `<span class="callout__title">${title}</span>` : '') +
        `</header><div class="callout__body">${body}</div></aside>\n`
      );
    }
  }
}

const COPY_BUTTON =
  '<button type="button" class="code-block__copy" data-copy aria-label="Copiar código">' +
  `${icon('content_copy', 'code-block__copy-icon')}<span class="code-block__copy-label">Copiar</span></button>`;

export interface CompareVariantProps {
  readonly label: string;
  readonly sql: string;
  readonly setupSql?: string;
  readonly best?: boolean;
  /** Rendered Markdown explaining this variant; shown after the comparison runs. */
  readonly explanationHtml: string;
}

export interface CompareIslandProps {
  readonly title?: string;
  readonly setupSql?: string;
  readonly variants: readonly CompareVariantProps[];
}

/**
 * `:::compare Title` holds ```sql variant label="..." [best] fences, each followed by the Markdown that explains it.
 * ```sql setup runs once before every variant (e.g. to generate a large table); ```sql variant-setup prepares only
 * the next variant (e.g. `CREATE INDEX`). Content before the first variant stays as an introduction.
 */
function renderCompare(renderer: RendererThis, container: ContainerToken): string {
  const intro: Token[] = [];
  const variants: { label: string; sql: string; setupSql?: string; best?: boolean; explanation: Token[] }[] = [];
  let setupSql: string | undefined;
  let nextVariantSetup: string | undefined;

  for (const child of container.tokens) {
    const code = child.type === 'code' ? (child as Tokens.Code) : undefined;
    const info = code ? parseInfoString(code.lang) : undefined;
    if (code && info?.language === 'sql' && info.flags.has('setup')) {
      setupSql = code.text;
    } else if (code && info?.language === 'sql' && info.flags.has('variant-setup')) {
      nextVariantSetup = code.text;
    } else if (code && info?.language === 'sql' && info.flags.has('variant')) {
      variants.push({
        label: info.attrs['label'] ?? `Opción ${String.fromCharCode(65 + variants.length)}`,
        sql: code.text,
        ...(nextVariantSetup !== undefined ? { setupSql: nextVariantSetup } : {}),
        ...(info.flags.has('best') ? { best: true } : {}),
        explanation: [],
      });
      nextVariantSetup = undefined;
    } else if (variants.length) {
      variants[variants.length - 1].explanation.push(child);
    } else {
      intro.push(child);
    }
  }

  const props: CompareIslandProps = {
    ...(container.titleText ? { title: container.titleText } : {}),
    ...(setupSql !== undefined ? { setupSql } : {}),
    variants: variants.map(({ explanation, ...variant }) => ({
      ...variant,
      explanationHtml: renderer.parser.parse(explanation),
    })),
  };
  return `<div class="compare-block">${renderer.parser.parse(intro)}${islandHtml('compare', props)}</div>\n`;
}

interface InfoString {
  readonly language: string;
  readonly title: string | undefined;
  /** Bare words after the language, e.g. `run` in `sql run title="..."`. */
  readonly flags: ReadonlySet<string>;
  /** `key="value"` pairs, e.g. `label` in `sql variant label="Con índice"`. */
  readonly attrs: Readonly<Record<string, string>>;
}

/** Splits a fence info string such as `sql run title="queries/top-customers.sql"`. */
export function parseInfoString(info: string | undefined): InfoString {
  const trimmed = (info ?? '').trim();
  const language = /^\S*/.exec(trimmed)?.[0] ?? '';
  const rest = trimmed.slice(language.length);
  const attrs = Object.fromEntries([...rest.matchAll(/\b(\w+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
  const flags = new Set(
    rest
      .replace(/\b\w+="[^"]*"/g, '')
      .split(/\s+/)
      .filter(Boolean),
  );
  return { language, title: attrs['title'], flags, attrs };
}

/**
 * Placeholder for an interactive Angular component ("island"). The renderer only produces HTML, so the component
 * is mounted on this element after rendering (see `MarkdownView`). Props travel as JSON in `data-props`.
 */
export function islandHtml(name: string, props: object): string {
  const safeName = escapeHtml(name);
  const json = escapeHtml(JSON.stringify(props));
  return `<div class="island island--${safeName}" data-island="${safeName}" data-props="${json}"></div>\n`;
}

function renderCode({ text, lang }: Tokens.Code): string {
  const { language, title, flags } = parseInfoString(lang);
  const code = text.replace(/\n$/, '');

  if (language === 'sql' && flags.has('run')) {
    return islandHtml('runner', {
      code,
      ...(title ? { title } : {}),
      ...(flags.has('error') ? { expectError: true } : {}),
    });
  }
  const languageClass = language ? ` class="language-${escapeHtml(language)}"` : '';
  const pre = `<pre><code${languageClass}>${escapeHtml(code)}\n</code></pre>`;

  if (title) {
    return (
      `<div class="code-block"><div class="code-block__header">` +
      `<span class="code-block__filename">${escapeHtml(title)}</span>${COPY_BUTTON}</div>${pre}</div>\n`
    );
  }
  return `<div class="code-block code-block--bare">${COPY_BUTTON}${pre}</div>\n`;
}

export const workshopMarkdownExtension: MarkedExtension = {
  extensions: [
    {
      name: TOKEN_TYPE,
      level: 'block',
      // Lets a paragraph end right before a container, so no blank line is required before `:::`.
      start: (src: string) => src.search(/^:{3,}[a-z]/m),
      tokenizer: tokenizeContainer,
      renderer: renderContainer,
    },
  ],
  renderer: { code: renderCode },
};
