# design-sync notes — GastroAI Desktop UI

Repo-specific gotchas for future syncs. Read before re-running.

## Shape & entry
- **Not a standalone library** — the DS is the shadcn UI layer inside the Electron
  app at `apps/desktop/src/renderer/src/components/ui/`. There is no `dist/` and no
  barrel export in the app itself.
- We ship a converter barrel at `apps/desktop/ds-barrel.ts` (re-exports every ui
  component) and point `--entry` at it. PKG_DIR resolves to `apps/desktop` (walks up
  from the barrel to its `package.json`, name `@gastroai/desktop`).
- Build command: **none** — the converter uses synth/entry bundling from source via
  `--entry apps/desktop/ds-barrel.ts`. `componentSrcMap` in config enumerates all 21
  roots explicitly (the `.d.ts` export scan finds nothing without a real dist).
- `cfg.tsconfig` is **PKG_DIR-relative** → `"tsconfig.json"` (NOT `apps/desktop/...`).
  It supplies the `@/*` → `src/renderer/src/*` alias esbuild needs for `@/lib/utils`.
- `--node-modules apps/desktop/node_modules` (react/radix/fonts resolve there; repo
  root has no react under bun's isolated install).

## CSS — Tailwind v4, must be compiled
- The app's `index.css` is Tailwind v4 SOURCE (`@import 'tailwindcss'` + `@theme`),
  not shippable CSS. We compile it to a static stylesheet with the Tailwind CLI:
  `apps/desktop/ds-tw-input.css` → `apps/desktop/ds-compiled.css`, and set
  `cfg.cssEntry = "ds-compiled.css"`.
- **Recompile CSS before every build** (source or previews changed):
  `cd apps/desktop && node ../../.ds-sync/node_modules/@tailwindcss/cli/dist/index.mjs -i ./ds-tw-input.css -o ./ds-compiled.css`
- `ds-tw-input.css` `@source`-scans the ui components + `.design-sync/previews`, and
  **`@source inline(...)` safelists the documented token vocabulary** so a design
  agent's generated classes resolve against the static stylesheet (design env does
  not run Tailwind). If you document a new token utility in conventions.md, add it to
  the safelist too, or it won't ship.
- `ds-compiled.css` is gitignored (regenerated); `ds-barrel.ts` + `ds-tw-input.css`
  are committed sync inputs.

## Fonts
- fontsource variable packages. `cfg.extraFonts` points at the three `index.css`
  files under `node_modules/@fontsource-variable/*`. Converter copies the referenced
  woff2 (latin/latin-ext/vietnamese/cyrillic-ext subsets → ~220K) into `fonts/`.
  The compiled CSS's own `./files/...` font urls don't resolve, so extraFonts is what
  actually ships the fonts — keep it.

## Dual-package (React context) fixes
- `Form` needs `useForm` from the bundle's react-hook-form instance → `react-hook-form`
  is in `cfg.extraEntries`. `Toaster` needs `toast()` sharing the bundle's sonner store
  → `sonner` is in `cfg.extraEntries`. Don't remove these or those two previews break.

## Preview overrides
- Overlays render open via `defaultOpen` + `cardMode: single` + a viewport
  (Dialog/AlertDialog/Sheet/DropdownMenu). Sheet/DropdownMenu use `modal={false}` so
  the open state paints without pointer-locking the capture.
- `Toaster` preview fires `toast.success(..., {duration: 100000})` in a mount effect
  and overrides position to `top-center` so the toast stays visible and in-frame.
- `DataTable` and `Table` are `cardMode: column` (wide).

## Playwright
- Chromium 1223/1224 are cached at `~/.cache/ms-playwright`. Install
  `playwright@1.60.0` (+ playwright-core@1.60.0) in `.ds-sync` — it pins chromium 1223.
  Repo has no playwright of its own.

## Known render warns
- Floor-card / blank auto-render warns only ever appeared for UNauthored components
  during intermediate builds; all 21 are now authored. No standing warns.

## Re-sync risks
- **CSS staleness**: forgetting to recompile `ds-compiled.css` ships an old utility
  set. Always recompile first (see CSS section). Deterministic — safe to always run.
- **Safelist drift**: conventions.md documents tokens; the `@source inline` safelist
  must stay in sync with it. Validate documented classes against `ds-compiled.css`.
- **Preview data is inline**: all preview content is literal Spanish restaurant data
  in `.design-sync/previews/*.tsx` (no `$ref`s) — no external files to rot.
- **Component adds**: a new file in `components/ui/` needs a `ds-barrel.ts` re-export
  AND a `componentSrcMap` entry (discovery won't auto-find it without a dist `.d.ts`).
- Toolchain at sync time: Tailwind v4.3.2, playwright 1.60.0, node ≥20, bun workspace.
