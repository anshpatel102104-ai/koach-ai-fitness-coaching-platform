# KOACH design system

The app's visual language, taken from the *KOACH AI — App Visual Styles*
reference set, with one change: the reference's red accent is replaced by
**the logo blue** (`#0A5CFF`). Read this before touching any screen.

## The idea in one paragraph

A coaching tool, not a dashboard demo. Cool grey canvas, flat white panels,
ink-black primary actions, a matte graphite sidebar, and one accent colour
used sparingly. Headlines are heavy and condensed; body copy is plain and
written like a coach talks ("15 things need you today. Start with the red
column."). Data is the decoration: compliance strips, real numbers, names.
Nothing glows, floats, or gradients.

## Tokens (src/index.css, tailwind.config.js)

| Use | Class | Notes |
|---|---|---|
| Canvas | `bg-background` | `#EEEFF1` light |
| Panel | `bg-card` / `.panel` / `<Panel>` | white, 12px radius, hairline ring, no shadow |
| Ink text | `text-foreground` | `#111318` |
| Secondary text | `text-muted-foreground` | one level only — don't stack opacities |
| Primary action | `bg-primary text-primary-foreground` / `<Button>` | **ink**, not blue |
| Secondary action | `<Button variant="outline">` | white, 1px border |
| Text action | `<Button variant="link">` / `<TextLink>` | ink, underlined ("Open the review queue") |
| Accent | `bg-brand`, `text-brand`, `bg-brand-soft` | logo blue. Active nav icon, counts waiting on the coach, the client app's main CTA ("Start workout"), today marker, focus ring, chart highlight. **Max one or two accent uses per screen.** White-label overrides this family. |
| On plan / good | `bg-success`, `text-success`, `bg-success-soft` | client data only |
| Partial | `bg-partial` (fill), `text-warning`, `bg-warning-soft` | |
| Missed / error | `.hatch-missed`, `text-destructive`, `bg-destructive/10` | errors, missed weeks, allergy/injury flags |
| AI output | `bg-ai text-ai-foreground` / `<InkPanel>` | ink panel with white text. Never violet, never gradient. |
| Hover / selected row | `bg-accent` | neutral grey |

Dark mode flips every token above; never hardcode hex or `text-white` on
surfaces that flip. (`text-white` is fine on `bg-primary` only via
`text-primary-foreground`.)

## Type

* Display / headings: **Archivo**, condensed (`font-stretch: 78%`), 800.
  `h1`–`h3` get it automatically. Page title 40px (32px mobile), panel title
  22px, card title 18–20px.
* Big numbers: `.num` (same face, tabular). "184.2 lb", "98%", "1,850".
* Body: **Hanken Grotesk** 15px for primary lines, 13–14px for context.
* Labels are **sentence case**, 13px, `text-muted-foreground`. No
  ALL-CAPS tracked-out micro labels. No `text-[9px]`/`[10px]`.

## Layout

* Desktop: 248px graphite sidebar (Coaching / Build / Business), white
  topbar (search, bell, Create), content in `<Page>` (max 1360px, 32px pad).
* Page header: optional eyebrow → title → one sentence → actions right
  (outline + ink button). Use `<PageHeader>` from `@/components/kit`.
* Grids of white panels separated by 16–20px gaps on the grey canvas.
  Prefer list rows with hairline dividers over grids of little cards.
* Work screens split into panes: list column (white) + detail (canvas) +
  context column (Check-ins, Messages, Client profile).
* Mobile: graphite top bar, bottom tab bar (white, brand-blue active icon).
  Client app: dark hero with the day's one action in brand blue.

## Components (`@/components/kit`)

`Page`, `PageHeader`, `Panel`, `PanelHeader`, `InkPanel`, `Stat`,
`ComplianceStrip` + `ComplianceLegend` + `complianceState()`, `Initials`,
`PersonRow`, `Segmented`, `TextLink`, `CountBadge`, `EmptyState`,
`KeyValue`. Plus shadcn primitives in `@/components/ui` (already restyled:
Button variants `default|brand|outline|secondary|ghost|link|destructive`,
Badge variants `default|secondary|brand|success|warning|destructive|outline`,
Tabs = segmented control).

## Patterns from the references

* **Today** — date headline + one sentence; week strip of day tiles (today
  = ink); three-column "needs you" panel (big count + label, 3 people rows,
  underlined link); Roster pulse (compliance grid); ink "Your AI briefing"
  with Review / Dismiss buttons and a "Based on …" evidence line.
* **Clients** — segmented filters with counts, search right; table rows:
  avatar (red ring if at risk), name + one-line status, program "Fat loss,
  week 2", 8-week compliance strip, weight delta (`.num`), next check-in.
* **Client profile** — left identity column (big initials, name, one line,
  Message + Adjust plan, stat pairs, coach notes); underline tabs; weight
  chart (ink line, dashed target, brand dot for today); week tiles; ink
  "What the AI sees".
* **Program builder** — week segmented control, red injury flag chip,
  day columns of exercise cells (grey `bg-secondary` tiles: name, `4 × 6`
  bold + RPE muted), dashed "Add exercise", library column.
* **Meal plan** — calorie headline + stacked macro bar (ink/grey ramps),
  timeline rows (time, meal, ingredients, macros, kcal, Swap), green
  bordered "Allergy check passed", supplements list, ink "Grocery list ready".
* **Check-ins / Messages** — queue list column with selected row marked by a
  brand left rule; detail on canvas; reply composer with tone segmented
  control and "Drafted by AI … edit before sending" disclosure.
* **Client app** — Today hero (dark, brand CTA), calories ring, last 8
  weeks strip, check-in due card with brand left rule, coach note.
  Workout logger: progress segments, demo tile, set table, ink rest timer,
  brand "Log set 3".

## Anti-slop rules (enforced in review)

1. No gradients (backgrounds, text, borders, buttons, avatars). Solid tokens.
2. No glows, blurs, glassmorphism, `shadow-lg+` on panels, floating blobs.
3. No violet/purple/indigo/fuchsia. AI = ink panel.
4. No sparkle icons as decoration; no emoji in UI chrome.
5. No ALL-CAPS micro labels, no letter-spaced eyebrows.
6. No icon-in-a-coloured-circle stat tiles. Numbers stand on their own.
7. Copy is specific and human: "Priya has gone quiet for 9 days", not
   "AI-powered insights to supercharge your coaching". No exclamation marks,
   no "Unlock", "Supercharge", "Elevate", "Seamless", "🚀".
8. Motion is functional only (sheet slide, list reorder) — no bouncing
   entrances, staggered card reveals, or pulsing.
9. One accent use per region. If everything is blue, nothing is.
10. Rounded corners: 8px controls, 12px panels, full only for avatars/pills.
