import { InjectionToken, InputSignal, Type } from '@angular/core';

/** A component mounted on an island placeholder produced by the Markdown renderer (see `islandHtml`). */
export interface IslandComponent<P> {
  /** Parsed from the placeholder's `data-props` and set with `setInput('props', ...)`. */
  readonly props: InputSignal<P>;
}

/**
 * Island name (`data-island`) to component. Every component must implement `IslandComponent` (input signals are
 * invariant, so the map cannot express that generically). Unknown names are left as empty placeholders.
 */
export type IslandRegistry = Readonly<Record<string, Type<unknown>>>;

export const MARKDOWN_ISLANDS = new InjectionToken<IslandRegistry>('MARKDOWN_ISLANDS', { factory: () => ({}) });
