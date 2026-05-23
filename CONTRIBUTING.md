# Contributing to Marky

Thanks for your interest! This guide covers how to get set up, how to send a good PR, and what to expect.

## Quick links

- Found a bug? [Open a bug report](https://github.com/sid8491/marky/issues/new?template=bug_report.yml).
- Have an idea? [Open a feature request](https://github.com/sid8491/marky/issues/new?template=feature_request.yml).
- For larger changes, **please open an issue first** to discuss the approach before sending a PR.

## Development setup

Prerequisites: Node.js 20.10+ (24.x recommended), npm 10+.

```bash
git clone https://github.com/sid8491/marky.git
cd marky
npm install
npm run dev
```

The Electron window opens with HMR. DevTools open in a detached panel during dev.

## Project layout

See [README — Project structure](./README.md#project-structure) for the file tree. Key conventions:

- **Three Electron processes**: `src/main/` (Node, privileged), `src/preload/` (typed bridge), `src/renderer/` (React UI, sandboxed). The renderer talks to main only through `window.marky` defined in `src/shared/ipc-contract.ts`.
- **State** lives in Zustand stores under `src/renderer/src/store/`.
- **CodeMirror extensions** live in `src/renderer/src/editor/`; UI components in `src/renderer/src/components/`.
- **AI calls** go through the main process — never call provider SDKs from the renderer.

## Coding style

- **TypeScript strict mode** is on. Avoid `any`; prefer explicit types at module boundaries.
- **Named exports** over default exports.
- **No comments explaining _what_** the code does — well-named identifiers should be self-explanatory. Add comments only when _why_ is non-obvious (a workaround, a subtle invariant, a hidden constraint).
- **Prefer composition over abstraction.** Three similar lines is better than a premature generic helper.
- **No new error handling for impossible cases.** Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs, file I/O).

## Before opening a PR

Run all three:

```bash
npm run lint
npm run typecheck
npm run build
```

If any of these fail locally, they'll fail in CI. Format with `npm run format` if you've drifted from Prettier.

## PR guidelines

1. **One concern per PR.** Bundle drive-by refactors only if they're a small, obvious win and stated in the description.
2. **Keep diffs minimal.** Don't reformat unrelated files. Don't bump dependencies in feature PRs.
3. **Title**: short, imperative, no period. Example: `Add Mermaid timeout fallback`, not `Added mermaid timeout fallback.`
4. **Description**: explain the _why_. Include screenshots/GIFs for UI changes.
5. **UI changes**: test in both light and dark themes, and verify the frameless window controls still look right on your OS.

## What we're looking for vs. what we're not

**Welcome contributions:**

- Bug fixes with clear reproduction steps
- Render-pipeline improvements (Mermaid edge cases, KaTeX, Shiki)
- New AI providers behind the existing `AIProvider` interface
- A11y improvements (keyboard, focus rings, screen-reader labels)
- Performance work (bundle size, cold start, preview re-render)
- Test coverage — Vitest setup is on the roadmap; once it lands, tests are very welcome

**Probably out of scope for v1:**

- Cloud sync (Google Drive / Dropbox / GitHub) — planned, but should be designed as a coherent system, not piecemeal
- Vim mode, plugin/extension system — explicit non-goals for v1
- Major UI redesigns — open an issue first; we'll likely say "wait"

## Releasing

Releases are cut by maintainers via git tag:

```bash
git tag v0.X.Y
git push origin v0.X.Y
```

That triggers `.github/workflows/release.yml` which builds installers on Win/Mac/Linux runners and publishes them to a GitHub Release. See [`electron-builder.yml`](./electron-builder.yml) for build configuration.

## License

By contributing, you agree that your contributions will be licensed under the MIT License (see [LICENSE](./LICENSE)).
