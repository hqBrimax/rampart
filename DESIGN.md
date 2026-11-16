# Rampart design system

## Product principles
- Explain enforcement before features: an agent requests; the program evaluates; the instruction either moves funds or reverts.
- Treat operational data as evidence. Never substitute fixture values for live API state.
- Label deployment scope on every security claim: deployed devnet, source/CI only, or planned.
- Dense, legible infrastructure UI; decoration never outranks comprehension.

## Visual tokens
| Token | Value | Use |
|---|---|---|
| `--bg` | `#090b0d` | page canvas |
| `--surface` | `#101418` | navigation and panels |
| `--surface-raised` | `#151b20` | nested data surfaces |
| `--line` | `#273139` | dividers and boundaries |
| `--text` | `#edf2ef` | primary text |
| `--muted` | `#89969a` | secondary text |
| `--accent` | `#a3e6bd` | primary actions and positive state |
| `--warning` | `#e7bd79` | degraded / caution |
| `--danger` | `#e58b8b` | refusal / failure |
| `--mono` | system monospace stack | addresses, codes, values |

## Typography
Use system sans-serif for reading and a system monospace stack for identifiers, code, statuses, and numeric telemetry. Headlines are compact, high-contrast, and sentence case. Avoid display fonts that reduce legibility.

## Spacing and layout
Use a 4px base scale (4, 8, 12, 16, 24, 32, 48, 64, 88). Content width is capped at 1200px with 24px desktop gutters and 16px mobile gutters. Use 1px borders and square-to-small-radius geometry; reserve larger radii for controls only.

## Components
- Header: persistent, semantic navigation; active page is clear; mobile links wrap without overflow.
- Buttons: 44px minimum height, explicit disabled state, visible focus ring.
- Section headings: eyebrow, title, concise explanatory copy.
- Status indicators: text plus restrained color; never color alone.
- Data rows: label/value alignment; identifiers wrap safely.
- Demo: separate API availability, token authorization, execution status, and returned steps.
- Empty/error/loading states: explicit copy; never imply success while data is unavailable.
- Documentation: readable measure, clear sub-navigation, tables scroll within their own container.

## Responsive breakpoints
- Wide: 1120px and above; two-column operational layout.
- Tablet: 760–1119px; stack hero and dashboard, allow two-column telemetry.
- Mobile: below 760px; single-column layout, wrapped navigation, full-width actions and horizontally contained tables.

## Interaction
Use native links and buttons. Keep the demo token in component memory only and send it in the `x-rampart-token` header. Do not persist credentials or put them in URLs. Surface HTTP 401, 403, 409, 5xx, malformed responses, and network failures distinctly.

## Motion
Motion is optional and brief. Respect `prefers-reduced-motion`; no looping decorative animation or motion that implies live activity.

## Accessibility
Semantic landmarks and heading order; explicit form labels; keyboard-operable controls; visible focus; 44px touch targets; sufficient contrast; reduced-motion support; status and errors announced with appropriate live regions.
