# Neal's Passage

A pirate-themed single-page app for a career move into library work — a comparison chart of
programs, a mini-CRM, an employment/doc workspace, a budget ledger, and an AI command console.
One `index.html`, no build step; a single Netlify function powers the AI. Auto-deploys from GitHub.

## Tabs
- **Dashboard** — campaign counts, a colored bar chart (switch dimension), a "potential ports by
  waters" chart, and the **Captain's Quarters** AI console (plain-English edits to your data).
- **The Passage** — 35 library-tech / library-science programs, region headings collapsible,
  editable, with colored delivery chips and links to each program.
- **Opportunities / Companies / People** — collapsible editable cards; colored tag dropdowns;
  people ⇄ company cross-links; application links on opportunities.
- **Employment** — Resumes / Cover Letters / Notes; editable docs with Download PDF & Word.
- **Purser's Ledger** — monthly / per-paycheck budget with share-of-takings and a Captain's Log.

## Deploy
Git-connected to Netlify (`neals-passage`). Any push to `main` auto-deploys. Netlify **server-side
password protection is ON**. To change the AI key/model/passcode use Netlify env vars:
`GEMINI_API_KEY` (or `GEMINI_KEY`), `GEMINI_MODEL` (default `gemini-3.6-flash`), `CQ_PASSCODE`
(default `neal-admin`).

## Files
| File | What it is |
|---|---|
| `index.html` | The whole app |
| `netlify/functions/gemini.js` | AI proxy (key stays server-side) |
| `netlify.toml` | publish dir, headers, functions dir |
| `HANDOFF.md` | Full state + how-to for continuing in a new session |
| `readme.md` | This |

Data lives in your browser (`localStorage`), with Back up / Load / Reset and full Undo/Redo.
