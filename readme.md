# The Librarian's Passage

A single-page, pirate-themed **chart + CRM + budget** app for a career move into library work.
One HTML file, no build step, no backend, no accounts. Everything is editable and saves to your
browser; back up to a file to move it between machines.

## Six tabs

1. **The Passage** — a comparison chart of library-technician / library-science programs (California,
   Texas, out-of-state online). The **Passage** column is a dropdown; each program links (↗) to its
   info page. Long Beach is split into its *free noncredit certs* vs. its *paid for-credit B.S.*
2. **Dashboard** — live counts plus a **bar graph** of opportunities; switch the bar dimension
   (Stage / Status / Priority / Source / Company) with the dropdown.
3. **Opportunities** — every role hailed, as **collapsible cards** (collapsed by default to kill the
   whitespace; click a card to expand). Pay shown as clean dollar amounts. No tag clutter.
4. **Companies** — collapsible cards, cleaned names, no tags.
5. **People** — collapsible cards; company and title each get their own labeled field.
6. **Purser's Ledger** — your budget, merged in. The Month / Per-Paycheck toggle, editable income
   and expenses, running totals, remaining coffer, and the Captain's Log.

Controlled fields (Contact Type, Stage, Status, Source, Loss Reason, Priority, Passage) are dropdowns.
Priority is trimmed to Very High / High / Medium / Low / None.

## Deploy to Netlify

**Drag and drop:** [app.netlify.com/drop](https://app.netlify.com/drop) → drop the **unzipped
`deploy-library-chart` folder** (not the .zip). Live in ~10 seconds.

**Or via CLI:** `netlify deploy --prod --dir .`

## Files

| File | What it is |
|---|---|
| `index.html` | The entire app — markup, styles, data, logic |
| `netlify.toml` | Publish directory + security headers |
| `readme.md` | This |

## Your data

- Everything saves to **this browser** (`localStorage`, key `librarians-passage-v3`). No server.
- **Back up data** writes `librarians-passage.json` (chart + CRM + ledger); **Load a copy** reads it back.
- **Reset to defaults** restores the seeded data. **Save as PDF** prints a clean copy.
- Because a saved copy wins over the file's defaults, after redeploying a newer file use **Reset to
  defaults** or re-import a backup to pull in changes.

## Notes on seeded data

- Past opportunities are **Lost / Closed: Lost**; the current **Production Manager @ YAL** role is **Won**.
  UATX Annual Fund Manager is **Lost** (left ~6 months in).
- A plaintext login found in one company note was **redacted** — keep credentials in a password manager.
- Chart figures gathered Aug 2026, approximate; two caveats: **Palo Alto online delivery unconfirmed**,
  **California's cheap rate needs ~1 year residency**.

## Undo / Redo

Made an accidental delete (a ledger line, an opportunity, anything)? Hit **↶ Undo** in the
bottom toolbar — or **Ctrl/Cmd+Z**. **↷ Redo** (or Ctrl/Cmd+Shift+Z) reverses it. Undo covers
deletes, adds, edits, reset, and import across every tab; history lasts for the session.

## Recent refinements

- **Chart of Ports** is a clean, readable table (region-grouped); cells wrap so nothing clips at any window size.
- **Opportunities** show the close date as a tag, and each has a clickable **Application link** pulled from your notes.
- **Contact-type tags** on People/Companies are color-coded (blue/purple/green/etc.) for readability.
- **Purser's Ledger** matches the original: Share-of-takings % bars, dollar signs in the month view, largest-first, and the full Captain's Log.
- **Dashboard is the first tab**: campaign counts, a **Potential ports** tile + by-waters mini-chart, and a status/stage bar graph (dropdown to switch) that lists every category incl. zeros; the **Lost** bar is red.
- **Companies** list the associated **People at this company**, matched from the People tab.
