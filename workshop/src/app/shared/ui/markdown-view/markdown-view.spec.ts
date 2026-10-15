import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MARKDOWN_ISLANDS } from '../../../core/content/islands';
import { provideWorkshopMarkdown } from '../../../core/content/markdown.providers';
import { MarkdownView } from './markdown-view';

@Component({
  selector: 'app-fake-runner',
  template: `<p class="fake-runner">{{ props().code }}</p>`,
})
class FakeRunner {
  readonly props = input.required<{ code: string }>();
  static destroyed = 0;
  ngOnDestroy(): void {
    FakeRunner.destroyed++;
  }
}

const settle = async (fixture: { whenStable(): Promise<unknown> }) => {
  await fixture.whenStable();
  // ngx-markdown renders asynchronously; wait for its pending render task.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await fixture.whenStable();
};

async function mount(content: string) {
  TestBed.configureTestingModule({
    imports: [MarkdownView],
    providers: [
      provideHttpClient(),
      provideWorkshopMarkdown(),
      { provide: MARKDOWN_ISLANDS, useValue: { runner: FakeRunner } },
    ],
  });
  const fixture = TestBed.createComponent(MarkdownView);
  fixture.componentRef.setInput('content', content);
  await settle(fixture);
  return fixture;
}

async function render(content: string) {
  return (await mount(content)).nativeElement as HTMLElement;
}

describe('MarkdownView', () => {
  it('renders the custom callout blocks through ngx-markdown', async () => {
    const root = await render(':::tip Un consejo\nContenido **importante**\n:::');

    expect(root.querySelector('aside.callout--tip')).not.toBeNull();
    expect(root.querySelector('.callout__title')?.textContent).toBe('Un consejo');
    expect(root.querySelector('strong')?.textContent).toBe('importante');
  });

  it('renders titled code blocks highlighted by Prism', async () => {
    const root = await render('```sql title="queries/customers.sql"\nSELECT name FROM customers;\n```');

    expect(root.querySelector('.code-block__filename')?.textContent).toBe('queries/customers.sql');
    expect(root.querySelector('pre code.language-sql .token.keyword')).not.toBeNull();
  });

  it('keeps raw HTML produced by the blocks (sanitizer disabled for trusted content)', async () => {
    const root = await render('::::challenge Reto\nTexto\n\n:::hint\nUna pista\n:::\n::::');

    expect(root.querySelector('section.challenge details.challenge-hint summary')?.textContent).toBe('Pista 1');
  });

  it('copies code through the delegated click handler', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const root = await render('```bash\ndotnet run\n```');

    root.querySelector<HTMLElement>('[data-copy]')!.click();

    expect(writeText).toHaveBeenCalledWith('dotnet run\n');
    vi.unstubAllGlobals();
  });

  describe('islands', () => {
    it('mounts the registered component on each island placeholder with its props', async () => {
      const root = await render('Antes\n\n```sql run\nSELECT 1;\n```\n\n```sql run\nSELECT 2;\n```');

      expect([...root.querySelectorAll('.fake-runner')].map((p) => p.textContent)).toEqual(['SELECT 1;', 'SELECT 2;']);
    });

    it('destroys the previous islands when the content changes or the view is destroyed', async () => {
      FakeRunner.destroyed = 0;
      const fixture = await mount('```sql run\nSELECT 1;\n```');

      fixture.componentRef.setInput('content', '```sql run\nSELECT 2;\n```');
      await settle(fixture);

      expect(FakeRunner.destroyed).toBe(1);
      expect((fixture.nativeElement as HTMLElement).querySelector('.fake-runner')?.textContent).toBe('SELECT 2;');

      fixture.destroy();
      expect(FakeRunner.destroyed).toBe(2);
    });

    it('leaves unknown islands empty', async () => {
      const root = await render('<div data-island="nope" data-props="{}"></div>');

      expect(root.querySelector('[data-island="nope"]')?.childElementCount).toBe(0);
    });
  });
});
