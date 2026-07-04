# GastroAI Desktop UI — conventions

Restaurant/food-business SaaS (desktop-first, Electron + React 19). shadcn-style
components (Radix primitives) styled with **Tailwind CSS v4** and a custom token
theme. Import every component from `@gastroai/desktop` (bundle global
`window.GastroUI`). Copy is Spanish (Latin-American).

## Setup — no provider needed for styling
Tokens live in `:root` and load through `styles.css`, so components are styled as
soon as that stylesheet is present — there is **no** required ThemeProvider.
Two things to know:
- **Dark mode** is opt-in: add the class `dark` to an ancestor (the app uses
  `next-themes`). Default (no class) is the light "cream" theme.
- **`Toaster`** is an app-level singleton: mount it **once** near the root, then
  fire toasts with `toast(...)` from `sonner`. It does not render inline content.

## Styling idiom — Tailwind v4 utilities + semantic tokens
Style with Tailwind utility classes. Prefer the **semantic token utilities**
below over raw hex/`slate-*` colors — they carry the brand and flip for dark mode.

| Purpose | Utilities |
|---|---|
| Surfaces | `bg-background` `bg-card` `bg-popover` `bg-muted` `bg-surface-raised` `bg-surface-quiet` |
| Text | `text-foreground` `text-muted-foreground` `text-card-foreground` |
| Brand action | `bg-primary` `text-primary-foreground` (the orange `#ff5a2c`) |
| Secondary/accent | `bg-secondary` `bg-accent` `text-accent-foreground` |
| Status | `bg-success`/`bg-success-soft`, `bg-warning`/`bg-warning-soft`, `bg-destructive`/`bg-danger-soft` |
| Raw brand | `bg-orange` `bg-carbon` `bg-cream` `text-orange` |
| Lines/focus | `border-border` `border-input` `ring-ring` |
| Radius | `rounded-sm` `rounded-md` `rounded-lg` `rounded-xl` |
| Shadow | `shadow-xs` … `shadow-2xl` |

Fonts (three families, shipped): `font-display` (Bricolage Grotesque — headings),
`font-sans` (Hanken Grotesk — default body), `font-mono` (Spline Sans Mono).
Helper classes: **`.nums`** for tabular monospaced figures (money, counts —
use it on every price/total), **`.font-display`** for display headings.

Component-behavior classes worth reusing: `.motion-press` (press-down affordance,
already on `Button`), `.platform-card` (hover-lift card), `.operational-surface`
and `.platform-shell-bg` (page backgrounds), `.touch-target` (44px min tap area).

## Where the truth lives
- Stylesheet: `_ds/<folder>/styles.css` → it `@import`s `_ds_bundle.css` (all
  component CSS) plus the token/font layers. Read it before inventing classes.
- Per component: `<Name>.d.ts` (the props contract) and `<Name>.prompt.md`
  (usage + variants). Compound parts (e.g. `Card` → `CardHeader`, `CardTitle`,
  `CardContent`, `CardFooter`, `CardAction`) are all exported from the same global.

## Idiomatic snippet
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge } from "@gastroai/desktop"

<Card className="w-80">
  <CardHeader>
    <CardTitle>Ventas de hoy</CardTitle>
    <CardDescription>Sucursal Centro · turno tarde</CardDescription>
    <CardAction><Badge variant="secondary">+12%</Badge></CardAction>
  </CardHeader>
  <CardContent>
    <p className="font-display text-3xl font-semibold nums">$ 184.320</p>
    <p className="mt-1 text-sm text-muted-foreground">78 órdenes cobradas</p>
  </CardContent>
  <CardFooter className="border-t">
    <Button variant="outline" size="sm">Ver reporte</Button>
  </CardFooter>
</Card>
```
Layout glue is your own Tailwind (`flex`, `gap-*`, `w-*`); controls come from the
library. Button variants: `default` `secondary` `outline` `ghost` `destructive`
`link`; Badge adds `secondary`/`outline`/`ghost`. Money always uses `.nums`.
