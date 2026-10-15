import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { PostgreSQL, SQLNamespace, sql } from '@codemirror/lang-sql';
import { syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { classHighlighter } from '@lezer/highlight';
import { basicSetup } from 'codemirror';

/**
 * CodeMirror 6 editor for PostgreSQL. Ctrl/Cmd+Enter asks to run. Colors come from CSS (`_sql-editor.scss`)
 * through `classHighlighter`, so the editor follows the light/dark theme like the rest of the page.
 */
@Component({
  selector: 'app-sql-editor',
  template: '',
  host: { class: 'sql-editor' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SqlEditor {
  /** Initial content; later changes go through `setCode`. */
  readonly code = input.required<string>();
  /** Tables and columns offered by autocompletion. */
  readonly schema = input<SQLNamespace>({});
  readonly label = input('Editor SQL');

  readonly codeChange = output<string>();
  readonly runRequested = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly language = new Compartment();
  private view: EditorView | undefined;

  constructor() {
    afterNextRender(() => {
      this.view = new EditorView({
        parent: this.host.nativeElement,
        state: EditorState.create({
          doc: this.code(),
          extensions: [
            Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => (this.runRequested.emit(), true) }])),
            basicSetup,
            this.language.of(this.sqlLanguage(this.schema())),
            syntaxHighlighting(classHighlighter),
            // Wrap long queries instead of scrolling sideways under the line-number gutter.
            EditorView.lineWrapping,
            EditorView.contentAttributes.of({ 'aria-label': this.label() }),
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                this.codeChange.emit(update.state.doc.toString());
              }
            }),
          ],
        }),
      });
    });

    effect(() => {
      const schema = this.schema();
      this.view?.dispatch({ effects: this.language.reconfigure(this.sqlLanguage(schema)) });
    });

    inject(DestroyRef).onDestroy(() => this.view?.destroy());
  }

  /** Replaces the whole document (e.g. "restore the original code"); emits `codeChange`. */
  setCode(code: string): void {
    const view = this.view;
    if (view && view.state.doc.toString() !== code) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
    }
  }

  private sqlLanguage(schema: SQLNamespace) {
    return sql({ dialect: PostgreSQL, schema, upperCaseKeywords: true });
  }
}
