# Project Upskill design system

Use this when you rebuild the app in React and React Native, so every screen stays consistent.

## Principles

1. One primary action per screen. On Today it is the hero tile's button.
2. The heading says it. No small label above a heading, and no badge above a page title.
3. Choose the edge or the shadow, never both. This app uses a 1px edge and no shadows.
4. Flat structure. No cards inside cards; use spacing and dividers.
5. Colour means something. Each track has one colour, used for small icons, bars and chips only.
6. Still by default. No pulsing dots, bouncing dialogs or auto-scrolling text.

## Type

| Role | Font | Size / weight |
|---|---|---|
| Page title (h1) | Bricolage Grotesque | 30 / 600 |
| Section and tile titles (h2) | Bricolage Grotesque | 19 / 600 |
| Card heading (h2.ch) | Instrument Sans | 14 / 600 |
| Body | Instrument Sans | 16 / 400, line height 1.55 |
| Secondary | Instrument Sans | 13.5 / 400 |
| Smallest allowed | Instrument Sans | 12 |
| Code | JetBrains Mono | 12.5 |
| Sketch labels | Caveat | 17 to 20 |

Headings use `text-wrap: balance`. Paragraphs use `text-wrap: pretty` and stay under 66 characters wide.

## Colour

| Token | Light | Dark |
|---|---|---|
| bg | #F7F8FA | #0C0E12 |
| surface | #FFFFFF | #14171C |
| surface2 | #F2F4F7 | #1B1F26 |
| line | #E4E7EC | #262B33 |
| ink | #101828 | #F2F4F7 |
| ink2 | #475467 | #C2C8D0 |
| ink3 (secondary text) | #5B6472 | #A6AFBD |
| primary | #3457C4 | #6E8EF0 |

Track colours: DSA #378ADD, Design + AWS #1D9E75, Build #7F77DD, Speaking #EF9F27, Research #D85A30, Reading #888780.

All text meets WCAG AA: 4.5:1 for body text, 3:1 for large text.

## Shape and space

- Radius: 12 for cards and tiles, 14 for the hero tile, 8 for buttons and inputs, full for chips.
- Spacing scale: 4, 8, 12, 16, 20, 28, 40.
- Touch targets: at least 44px tall.
- Borders: 1px `line`. No shadows.

## Components

Button (primary, secondary, ghost), Badge, Tile, Card, List row, Checklist item, Tabs (segmented), Progress bar, Field, Sheet, Toast, Lesson stepper, Code block, Sketch frame.

## Copy

- Buttons say what happens: "Start lesson", "Save to tracker", "Mark as done".
- Sentence case everywhere.
- One idea per sentence. No hype words.
