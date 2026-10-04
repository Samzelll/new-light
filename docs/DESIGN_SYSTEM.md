# Design System

Mobile-first, dark, fast to scan. The product is "Pinterest with battles": people explore, tap, vote.
Everything that is not needed for the next tap is hidden behind one tap (info button, "Show full rules", side menu).

Files: `tailwind.config.js` (token names), `src/app/globals.css` (token values + component classes).
Fonts: **Unbounded** (display, Cyrillic) and **Manrope** (body).

## 1. Rules (how the global styles work)
1. **Tokens only.** Components use classes such as `bg-surface`, `text-muted`, `bg-accent-solid`. No hex values, no Tailwind palette colors (`bg-orange-600`, `text-gray-400`) in components.
2. **Change once, change everywhere.** Colors, radii, fonts live in `:root` of `globals.css`. Rebranding = editing about 15 lines.
3. **Component classes for repeated patterns** (`.btn`, `.card`, `.sheet`, `.pill`). One-off layout stays as normal Tailwind utilities in JSX.
4. **State through attributes, not extra classes**: `aria-selected`, `aria-pressed`, `aria-checked`, `data-open`, `data-picked`, `data-state`. This keeps accessibility and styling in sync.
5. **One primary action per screen** (one `.btn-primary` / `.btn-light` visible at a time).
6. **No numbers that the rules hide.** Never render raw vote counts or the Trust Score. Percentages appear only where the rules allow (see section 6).
7. **Accessibility baseline**: every text/background pair is at least 4.5:1 (checked, see section 2), visible focus ring, icon buttons have `aria-label`, motion respects `prefers-reduced-motion`.
8. **English language standard**: All UI elements, buttons, headers, forms, notifications, empty states, seed data, and code comments must strictly be in English. No bilingual mixes.

## 2. Tokens

| Token (Tailwind) | Value | Use | Contrast |
|---|---|---|---|
| `bg` | `#0b0b0d` | page background | |
| `surface` | `#161619` | cards, list rows | |
| `surface2` / `surface-2` | `#222226` | sheets, drawer, inputs, chips | |
| `ink` | `#ffffff` | primary text; overlays `bg-ink/5`, `/10` | 19.7 on bg |
| `muted` | `#a1a1aa` | secondary text | 7.7 on bg, 7.1 on surface |
| `faint` | `#8b8b94` | captions, placeholders, inactive tabs | 5.8 on bg, 4.7 on surface2 |
| `accent` | `#ff6a2b` | icons, rings, underline, links | 6.9 on bg |
| `accent-solid` | `#c9430b` | filled buttons and pills with white text | 4.9 with white |
| `accent-hover` | `#b13a09` | hover/pressed fill | 6.0 with white |
| `accent-soft` | `#ff8a4d` | text on tinted accent (`pill-soft`) | 7.3 |
| `light` / `on-light` | `#ffffff` / `#0b0b0d` | white button | 19.7 |
| `success`, `danger(.soft)`, `warn` | `#10b981`, `#ef4444` (`#f87171`), `#f59e0b` | status | 5.2 to 7.8 |
| `corner-red` / `corner-green` | `#ef4444` / `#10b981` | battle corners, dark text on them | 5.2 / 7.3 |

- **Radii**: `sm`: 10px, `md`: 14px, `lg`: 20px, `xl`: 24px, `full` for buttons and pills.
- **Type**: `caption`: 11px, `tab`: 13px, `btn`: 13px, `body`: 14px, `title`: 17px, `heading`: 20px, `hero`: 28px (percentages).
- **Column**: `max-w-app` = 448px (28rem), centered.

Note: filled orange buttons use `accent-solid` so white text passes AA contrast. Keep `accent` for icons and lines.

## 3. Component classes
- `.app-shell`, `.app-header`, `.cta-bar`
- `.icon-btn` (`data-dot="true"` adds active-filter dot)
- `.btn` + `.btn-primary` / `.btn-light` / `.btn-outline` / `.btn-ghost`, `.btn-block`, `.btn-sm`
- `.tabs`, `.tab` (`aria-selected`), `.tab-indicator` (set `style="--tab-count:3;--tab-index:1"` on `.tabs`)
- `.pill` + `.pill-accent` / `soft` / `light` / `neutral` / `success` / `danger` / `warn` / `overlay`
- `.chip` (`aria-pressed`)
- `.card`, `.tile` (+ `.tile-value`, `.tile-label`), `.list-row`, `.thumb`, `.avatar`, `.skeleton`
- `.contest-card` (+ `--tall`, `--short`, `__body`, `__badge`)
- `.battle-arena`, `.battle-card` (`data-picked`, `data-state="lost"`), `.corner-tag`, `.corner-red` / `.corner-green`, `.vs-badge`, `.percent`, `.progress`
- `.scrim`, `.sheet`, `.sheet-handle`, `.drawer`, `.menu-item`, `.toast` (all with `data-open`)
- `.field`, `.field-label`, `.switch` (`aria-checked`)
- `.rule-row`, `.rule-num`, `.link-more`

## 4. Navigation model
- **No bottom navigation**. Header row: search/filter button (left), tabs (center), avatar (right).
- **Tabs**: `Contests` (catalog of all contests), `Feed` (direct voting stream of groups of 4), `Battles` (live 1v1 and races). On 360px phones labels stay short: "Contests", not "All contests". Popular / For you are sorting options inside the filter sheet.
- **Search + filter is one button**: opens bottom sheet with search field, category chips, status chips, sort (popular, for you, ending soon), "My subscriptions" chip. Dot shown on icon while filters active.
- **Avatar opens the side drawer**: profile, my votes, my entries, favorites, rules and prizes, help. Admin/moderator tools appear only for those roles.
- **Hidden details pattern**: every screen shows the minimum. More info is one tap away: `i` button on battle, "Show full rules and conditions" on contest page.
