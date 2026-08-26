# Neal's Passage — Session Handoff

A pirate-themed single-page web app that helps Neal Gillespie's pivot into library work.
Six working tabs + an AI console. This doc lets a new Claude session continue seamlessly.

## Where it lives
- **Live:** https://neals-passage.netlify.app  (Netlify has **server-side password protection ON** — ask Neal for it.)
- **GitHub:** `git@github.com:Account-User1312/librarians-passage.git` (private). Auto-deploys to Netlify on push.
- **Local working copy:** `/Users/nealgillespie/Downloads/deploy-library-chart/`
- Pushing works over Neal's SSH key (`~/.ssh/id_ed25519_fkl`) — a new session can `git push` and it auto-deploys.

## Files
- `index.html` — the entire app (markup + CSS + JS + seeded data). Seed CRM data is a JSON blob in `<script type="application/json" id="seed-crm">`; the ports chart (`SCHOOLS`) and budget (`LEDGER_DEFAULTS`) are inline JS literals.
- `netlify/functions/gemini.js` — server-side model proxy for the AI console.
- `netlify.toml` — publish dir + security headers + functions dir.
- `readme.md`, `HANDOFF.md`.

## The tabs
1. **Dashboard** (default) — stat tiles, a colored bar chart (dropdown: Stage/Status/Priority/Source/Company; zero-filled; Lost=red, Won=green, each category its own color), a "Potential ports by waters" mini-chart, and the **Captain's Quarters** AI console at the bottom.
2. **The Passage** — a table of **35 library-tech / library-science programs** grouped by region (California Waters / The Texas Coast / Distant Shores). Region headings are **collapsible** (collapsed by default). Every cell editable; **Passage** is a colored badge-chip dropdown; info link is a ↗ (opens) + ✎ (edit URL via prompt). Data + real program links came from the ALA + ACRL/CJCLS national directories.
3. **Opportunities / Companies / People** — collapsible editable cards. Header tags (Stage, Contact Type) are **badge-chip dropdowns** (colored). People link to their Company and Companies list their People (fuzzy name match). Opportunities show a blue **date tag**; each has an **Application link ↗** pulled from the notes.
4. **Employment** — collapsible **Resumes / Cover Letters / Miscellaneous Notes / Credentials & Files** sections with **Open all / Collapse all**. Category tags are colour-coded via `CAT_COLOR` (Resumes blue / Cover Letters teal / Notes amber / Credentials purple). Credentials cards are **asset cards**: an image or PDF preview straight from `assets/`, with *View full size / Open PDF*, *Download*, and *Drive original* — no editor and no descriptive text block. Seeded with the **28 real documents imported from Neal's Drive Employment folder** (5 resumes, 13 cover letters, 4 notes, 6 linked binaries). Each doc is a **rich-text `contenteditable`** with a formatting toolbar (bold/italic/underline, heading, bullet + numbered list, link/unlink, clear), **Download PDF** (print) + **Download Word** (.doc), and a link back to its Drive original. Doc cards are collapsed by default; category headings are open.
5. **Purser's Ledger** — budget tracker (Water & Sundries is the **3-month average, 122.36**; Tavern Provisions = dining out, **Ship's Provisions** = groceries): The Month / Per-Paycheck toggle, editable income+expenses, share-of-takings % bars, $ signs, largest-first, view-aware Captain's Log.

## State & behavior
- All data persists in `localStorage` key **`librarians-passage-v5`**. Everything is inline-editable.
- **Undo/Redo:** ↶/↷ buttons + Ctrl/Cmd+Z / Shift+Z. Back up data / Load a copy / Reset / Save as PDF in the footer toolbar.
- One-time merge migration adds any new default ports to an existing saved copy without wiping edits (`d.portsMerged`).

## AI console (Captain's Quarters)
- Panel POSTs `{instruction, data, passcode}` to `/.netlify/functions/gemini`.
- **Model:** default `gemini-3.6-flash` (env `GEMINI_MODEL` overrides; Gemma models like `gemma-4-31b-it` also supported via a code branch). Google free tier — **slow on the first call (~15–23s) then fast**; the client has a 32s timeout + one auto-retry.
- **Key:** Netlify env var — function accepts `GEMINI_API_KEY` **or** `GEMINI_KEY` (Neal named it `GEMINI_KEY`).
- **Console passcode:** env `CQ_PASSCODE`, default `neal-admin`. The function returns `{reply, ops[]}`; ops are applied client-side via `applyOps()` (add/update/delete/set_income across schools/opportunities/companies/people/expenses) with Undo.

## How to edit safely (workflow that's been working)
1. Edit `index.html` with Python string-replace patches in Bash (avoids the Read-gate and unicode-escape pitfalls; anchor on exact strings, assert count==1).
2. Extract the last `<script>` block to `app.js`, syntax-check with JavaScriptCore: `osascript -l JavaScript` running `new Function(src)`.
3. Optionally headless-render with a DOM-shim JXA harness (see scratchpad `h*.jxa`) to catch runtime errors across tabs.
4. `git add -A && git commit && git push` → Netlify auto-deploys. Confirm live with `curl`.

## DONE: the Employment Google Drive import
Imported 2026-08-26. The folder is owned by Neal's **personal** account (`nealtgill@gmail.com`); the Drive MCP connector is authenticated as his **work** account (`@yaliberty.org`), which is why the earlier session could not list the folder's children. **Neal fixed this by sharing the Employment folder with his work account** — after that, `search_files` with `parentId = '<folder id>'` lists children normally. Folder ids: Resumes `1hBRp14GJHiC7N7_3C1ycFI0uaxdhYaL8`, Cover Letters `1AI_ZAWOwmibH0ckrsmwFcWW7bcZqIcY4`, Misc Notes `1-Sjw7aElfwLdiYm_ABktG4ZETJClOlih`.

**How the content was extracted.** `read_file_content` (not `download_file_content`) — it returns a compact markdown-ish text rendering that preserves headings and bullets, and the 5 resumes are ~517 KB `.docx` files whose base64 would be far too large to pull through the tool channel. That text was converted to clean semantic HTML by a generator kept in the scratchpad (`emp/conv.py` + `emp/gen.py`, sources in `emp/src/*.txt`), then embedded as `<script type="application/json" id="seed-employment">` and read into `SEEDEMP`.

**Fidelity note:** formatting is *reconstructed* (semantic h1–h4/ul/li/p in the app's own type), not a byte-copy of Google's export. Every doc keeps a `source` link to the Drive original for exact formatting.

**Binary assets** (4 PDFs, a 2.8 MB JPEG headshot, a 1.9 MB HEIC) are **linked, not embedded** — the 27 MB degree scan alone would blow past the ~5 MB localStorage budget. They live in a **Credentials & Files** category as link-only cards.

**Migration:** `d.employmentImported` merges the 28 docs into an already-saved copy by title and drops the old "How this tab works" placeholder, mirroring the `portsMerged` pattern.

**Pasting is the escape hatch:** the editor sanitizes pasted HTML (`docSanitize`) and *inlines Google Docs' class-based `<style>` rules*, so Neal can paste straight out of a Google Doc and keep its formatting. The sanitizer strips script/style/iframe/form nodes, `on*` handlers, `javascript:` URLs, and all but a safe list of CSS properties — verified against a hostile paste.

## Assets (`assets/`)
Binary credentials live as **real files in the repo**, not in `localStorage` (a 5 MB budget can't hold them) and not hot-linked from Drive:
`neal-headshot.jpg` (from Neal's Mac, downscaled to 1400px), `neal-degree-chapman-photo.jpg` (the Drive **.heic** converted with `sips` — browsers can't render HEIC), `neal-degree-chapman.pdf`, `neal-typing-certification.pdf`, `neal-transcripts-chapman.pdf`. ~880 KB total.

**Pulling a binary out of Drive without blowing up context:** `download_file_content` on anything sizeable returns an *error* saying the result was written to a file under `…/tool-results/…txt`. That file is JSON `{content: <base64>, …}` — decode it with python straight to disk. This is the trick that makes multi-MB assets practical; never paste base64 through the transcript.

**Still Drive-only:** `Neal SCC Degree Chapman Univ.pdf` (27 MB) — byte-for-byte the same document as the 80 KB compressed copy, so it is deliberately not committed. Its card shows a "not aboard yet" note plus the Drive link. To add any asset later: drop the file in `assets/` and set the matching `asset.file` path in `emp/gen.py`, then regenerate.

## Migrating saved copies — read this before changing seed data
Every migration is gated on its own one-shot flag on the saved object (`portsMerged`,
`employmentImported`, `employmentAssets`, `ledgerProvisions`). **A flag that is already
true blocks every later change to that slice of seed data.** This bit us once: the asset
cards shipped after `employmentImported` was already set, so browsers that had loaded the
previous deploy kept rendering the six credentials as ordinary editable docs with a
placeholder paragraph. The fix was a *new* flag (`employmentAssets`) that re-matches saved
records against `DEFAULTS.employment` by Drive `source` first, then by title, and rewrites
them in place.

So: when you change seeded content that users may already have saved, **add a new flag and
a migration** — never just edit the seed and assume it propagates. Match on `source` where
possible, since titles can change (the .heic entry was retitled "(photo)").

## Document export
**One renderer, two wrappers.** `docPageHtml(d, forWord)` builds the whole document; `docWord` blobs it as `.doc`, `docPrint` opens and prints it. Body HTML and the shared `DOCCSS` are byte-identical between the two — only the page-setup rule differs (`@page{size:letter;margin:1in}` for print vs `@page WordSection1{…}` for Word). That is deliberate: **the PDF is a print of the Word document, not a second recreation of it.** If you touch one, you have touched both; keep it that way.

Styling drops the ship's livery on purpose: Times New Roman 12pt, 1.15 line-height, 1in letter margins, Google-Docs link blue, **no injected title heading**. Units stay in pt/in so Word honours them. Note `docSanitize` strips `class`, so document CSS must be **element-keyed**; class-keyed rules silently do nothing.

## Mobile (iOS + Android)
**The root bug was that `.scroller` had no CSS rule at all.** Both wide tables sit in `<div class="scroller">`, but with no `overflow-x` the 1080px ports table was simply *clipped* by `body{overflow-x:hidden}` — those columns were unreachable on a phone, not merely off-screen. `.scroller` now has `overflow-x:auto`.

Under 700px the chart of ports **stops being a table**: `display:block` on the rows and cells, the column-header row hidden, and each `td` renders its column name from `data-label` via `::before`, so a port reads as a stacked label/value card with no sideways scrolling. Desktop is untouched — real table, real headers, `::before` set to `none`.

Fields that hold long values are now autosizing textareas rather than single-line inputs, which is the only way text wraps in a form control: the Employment doc title, the CRM card subtitle (`.csub`), ledger expense name/kind, and the `name` / `company` / `title` / `email` / `emailDomain` / `address` entries in `FMETA` (address genuinely contains a newline that an `<input>` silently ate). Ledger columns were rebalanced so the amount stops eating the entry column.

Long **URLs** are still truncated on purpose — some run 200+ chars, wrapping them would swamp the card, and every one has a ↗ to open it.

Audited by walking every element on every tab and flagging `scrollWidth > clientWidth` or anything past the viewport edge, with all cards expanded, at **320 / 360 / 414** — zero non-URL clipping at every width. Also verified at 375×812: no horizontal overflow on any tab, `.docrich` forced to **16px** on small screens (below 16px iOS zooms the page on focus), toolbar and action buttons at a 44px minimum, and the embedded `<object>` PDF preview is **hidden under 700px** (iOS Safari renders it blank) leaving the Open/Download buttons.

## Neal's preferences (this session)
- Wants clean **tag/chip** styling matching the badges; **honest** data (never fabricate tuition — mark "verify"); **collapsible** sections; **mobile-friendly**; keep **Gemini 3.6 Flash**.
- He deploys via git push (a session can push for him). He has Netlify Pro.
