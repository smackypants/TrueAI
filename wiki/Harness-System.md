# Harness System

> Bring your own tools. The harness system lets you extend the built-in 14-tool palette with custom tools loaded from a URL or a manifest.
>
> *Audience: end user (with care) · Last reviewed: 2026-05-02*

A **harness** is a manifest + a tool implementation. Once installed,
its tools appear in the agent / workflow tool pickers alongside the
built-ins.

UI: `src/components/harness/HarnessUploadUI.tsx`,
`HarnessCreator.tsx`, `BundleAutomationPanel.tsx`. Type contracts in
`src/lib/types.ts → HarnessManifest` and
`src/lib/workflow-types.ts → CustomTool`.

---

## Two ways to install

### 1. Direct URL

Point at a single tool file:

```
https://example.com/my-search-tool.js
```

The app fetches it, validates the manifest header, and registers the
tool.

### 2. Manifest URL

Point at a manifest that lists multiple tools (typical for harnesses
shipped via GitHub raw):

```
https://raw.githubusercontent.com/you/your-tools/main/manifest.json
```

The manifest includes the tool list, version, author, and per-tool
file URLs. The app fetches each and registers them as a bundle. A
single switch enables/disables the whole harness.

<!-- SCREENSHOT: harness upload dialog with manifest URL filled in -->

---

## Bundle Automation

`BundleAutomationPanel.tsx` automates harness lifecycle:

- Auto-update on app start (re-fetch the manifest, diff, prompt to
  apply updates)
- Pinning to a specific version
- Bulk enable / disable
- Validation reports (which tools failed to register and why)

See [`src/lib/bundle-automation.ts`](https://github.com/smackypants/TrueAI/blob/main/src/lib/bundle-automation.ts).

---

## Building your own tool

See `CustomTool` in `workflow-types.ts`. Minimum:

```js
// my-tool.js
export const manifest = {
  id: 'my-tool',
  name: 'My Tool',
  description: 'Does a thing',
  parameters: [
    { name: 'input', type: 'string', required: true, description: '…' }
  ],
  returnType: 'string',
  runtime: 'javascript',  // or 'api'
}

export async function execute({ input }) {
  return `Got: ${input}`
}
```

For `runtime: 'api'`, supply `endpoint`, `method`, optional
`headers`, and TrueAI proxies the call from the agent loop.

---

## Security caveats ⚠️

> The harness system runs **third-party JavaScript inside your app's
> sandbox**. Treat it like installing a browser extension.

- Only install harnesses you trust.
- Review the manifest URL — make sure it's the upstream you expect,
  not a mirror.
- The app sandboxes JS execution where possible, but a malicious
  tool can still:
  - Make outbound HTTP requests
  - Read whatever the agent passes it
  - Consume your hosted-API quota
- The harness has **no** access to your secure storage (e.g. the LLM
  API key) — that's enforced by the secure KV invariant
  ([Privacy](Privacy)).

---

## See also

- [Agents](Agents) — where harness tools show up
- [Workflows](Workflows) — tool nodes can call them too
- [Tools Reference](Tools-Reference) — built-in tool list
- Canonical: [`FEATURES.md`](https://github.com/smackypants/TrueAI/blob/main/FEATURES.md), [`BUNDLE_AUTOMATION.md`](https://github.com/smackypants/TrueAI/blob/main/BUNDLE_AUTOMATION.md)
