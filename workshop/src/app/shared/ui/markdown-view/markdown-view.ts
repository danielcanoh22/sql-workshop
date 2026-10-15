import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  Injector,
  createComponent,
  inject,
  input,
  output,
} from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { handleCodeCopyClick } from '../../../core/content/code-copy';
import { MARKDOWN_ISLANDS } from '../../../core/content/islands';

/**
 * Renders tutorial Markdown (custom blocks + Prism), wires the code copy buttons by event delegation and mounts the
 * interactive islands (SQL runners, challenges...) on the placeholders the renderer leaves in the HTML.
 */
@Component({
  selector: 'app-markdown-view',
  imports: [MarkdownComponent],
  template: `<markdown class="markdown-body" [data]="content()" (click)="onClick($event)" (ready)="onRendered()" />`,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownView {
  readonly content = input.required<string>();
  /** Emits after each render, once the HTML and its islands are in the DOM. */
  readonly rendered = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly appRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly injector = inject(Injector);
  private readonly islands = inject(MARKDOWN_ISLANDS);
  private mounted: ComponentRef<unknown>[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.unmountIslands());
  }

  protected onClick(event: Event): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      handleCodeCopyClick(event, navigator.clipboard);
    }
  }

  protected onRendered(): void {
    this.unmountIslands();
    for (const element of this.host.nativeElement.querySelectorAll<HTMLElement>('[data-island]')) {
      const type = this.islands[element.dataset['island'] ?? ''];
      if (!type) {
        continue;
      }
      const ref = createComponent(type, {
        environmentInjector: this.environmentInjector,
        elementInjector: this.injector,
        hostElement: element,
      });
      ref.setInput('props', JSON.parse(element.dataset['props'] ?? '{}'));
      this.appRef.attachView(ref.hostView);
      ref.changeDetectorRef.detectChanges();
      this.mounted.push(ref);
    }
    this.rendered.emit();
  }

  private unmountIslands(): void {
    for (const ref of this.mounted) {
      this.appRef.detachView(ref.hostView);
      ref.destroy();
    }
    this.mounted = [];
  }
}
