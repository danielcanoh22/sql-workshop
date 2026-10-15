import { InjectionToken, InputSignal, Signal, Type } from '@angular/core';

/** The tutorial step whose Markdown is rendered; lets islands keep per-step state such as saved answers. */
export interface StepContext {
  readonly slug: string;
  readonly stepId: string;
}

/** Provided by the step reader. Islands rendered elsewhere (e.g. tests, overviews) get no context. */
export const STEP_CONTEXT = new InjectionToken<Signal<StepContext | undefined>>('STEP_CONTEXT');

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
