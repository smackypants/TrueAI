# App Builder & IDE

> Generate small applications from natural-language descriptions, then edit the result in a built-in code editor.
>
> *Audience: end user · Last reviewed: 2026-05-02*

The **Builder** tab combines two related tools:

1. **App Builder** — describe an app, get scaffolded code.
2. **Local IDE** — edit, preview, and save what you (or the builder) generated.

Both run **entirely on your device** against your configured LLM
endpoint (see [LLM Runtime](LLM-Runtime)).

UI: `src/components/builder/`. Type contracts:
[`src/lib/app-builder-types.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/app-builder-types.ts)
and
[`src/lib/framework-configs.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/framework-configs.ts).

---

## App Builder

```
"Build me a Pomodoro timer with start, pause, reset, and a chime when each round ends.
 Use plain HTML + CSS + vanilla JS, single file."
```

The builder turns prompts like this into a small, runnable project.
You can:

- Pick a **framework** (vanilla, React, Vue, Svelte, …) — see
  `framework-configs.ts` for the supported set
- Choose **single file** vs **multi file** scaffolding
- Iterate ("now add dark mode") — the builder rewrites the relevant
  files
- Hand off to the **Local IDE** for manual edits

<!-- SCREENSHOT: app builder prompt + generated file tree -->

The generated files are persisted in KV under the project's id, so
you can come back later.

---

## Local IDE

`LocalIDE.tsx` and `CodeEditor.tsx` give you:

- Syntax highlighting (web-friendly languages)
- Multi-file tree
- Tab-based editing
- Auto-save (debounced)
- Live preview pane (for HTML / JS / CSS projects)
- Export the project as a zip

The editor itself is a Monaco-style component tuned for mobile (soft
keyboard handling, virtual gutter); see also `KeyboardShortcuts` for
chords.

---

## Limits

- Generated projects are intended to be *small* (single screen,
  hundreds of lines, maybe a thousand). For larger work, copy into
  your real IDE.
- The builder cannot install npm packages — it scaffolds only what
  the chosen framework config supports out of the box.
- There is no terminal or process runtime — code runs in the
  preview pane (browser sandbox), not in a Node process.

---

## See also

- [LLM Runtime](LLM-Runtime) — what powers the generation
- [Cost Tracking](Cost-Tracking) — generation calls show up here
- [Keyboard Shortcuts](Keyboard-Shortcuts)
- Canonical: [`APP_BUILDER.md`](https://github.com/smackypants/TrueAI/blob/main/APP_BUILDER.md)
