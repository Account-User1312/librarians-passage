// Captain's Quarters — server-side model proxy (Google Generative Language API).
// The API key lives ONLY here, as a Netlify environment variable, so it works from
// any device and is never exposed in the page.
//
// Netlify → Site configuration → Environment variables:
//   GEMINI_API_KEY (or GEMINI_KEY)  — required, your Google AI Studio key
//   GEMINI_MODEL   — optional, overrides the default (e.g. gemma-4-31b-it, gemini-3.6-flash)
//   CQ_PASSCODE    — optional, overrides the default console passcode
//
// Works with Gemini models (JSON mode) and open Gemma models (prompt-folded + parsed).

const FIELDS = {
  schools: ['region','name','berth','papers','passage','toll','firstPapers','bond','catch','link','flag','flagText'],
  opportunities: ['name','company','stage','status','priority','source','lossReason','payHourly','paySalary','closeDate','link','description'],
  companies: ['name','contactType','phone','emailDomain','website','address','city','state','zip','country','linkedin','description'],
  people: ['name','company','title','contactType','email','phone','website','address','city','state','zip','linkedin','description'],
  expenses: ['name','kind','amount']
};

const ENUMS = [
  'region: "California Waters" | "The Texas Coast" | "Distant Shores"',
  'passage: "Fully online" | "Online + on-campus" | "Hybrid" | "In-person" | "Unconfirmed"',
  'flag: "best" | "good" | "warn" | "dear"  (with a short flagText label)',
  'stage: "Researching" | "Application Sent" | "Application Recieved" | "Follow-up" | "Negotiation" | "Won" | "Lost"',
  'status: "Open" | "Closed: Won" | "Closed: Lost" | "Abandoned" | "Negotiation" | "Researching"',
  'priority: "Very High" | "High" | "Medium" | "Low" | "None"',
  'source: "Job Board" | "Industry Site" | "Peer" | "Misc. Advert" | "Browser" | "Other"',
  "lossReason: \"N/A\" | \"Lack o' Experience\" | \"Location\" | \"Pay: Low\" | \"Job Filled\" | \"Job Removed\" | \"Ghosted\""
];

function sysPrompt() {
  return [
    "You are the Quartermaster: the command console for a personal pirate-themed web app that tracks a career move into library work.",
    "You receive the app's CURRENT DATA (JSON) and an INSTRUCTION from the captain. Return a JSON object describing the edits to make.",
    "",
    "Return EXACTLY this shape:",
    '{ "reply": "<one short sentence, light pirate voice, saying what you did>", "ops": [ <operation>, ... ] }',
    "",
    "Each operation is one of:",
    '{ "action":"add",    "collection":"<c>", "set": { ...fields } }',
    '{ "action":"update", "collection":"<c>", "match": { "name":"<existing name, case-insensitive contains>" } | { "index": <n> }, "set": { ...fields } }',
    '{ "action":"delete", "collection":"<c>", "match": { "name":"<...>" } | { "index": <n> } }',
    '{ "action":"set_income", "set": { "amount": <number> } }   // ledger monthly wages',
    "",
    "collection is one of: schools, opportunities, companies, people, expenses (expenses = the Purser's Ledger lines).",
    "Fields per collection:",
    "  schools: " + FIELDS.schools.join(', '),
    "  opportunities: " + FIELDS.opportunities.join(', '),
    "  companies: " + FIELDS.companies.join(', '),
    "  people: " + FIELDS.people.join(', '),
    "  expenses: " + FIELDS.expenses.join(', ') + "  (amount is a plain monthly number, no $)",
    "",
    "Use ONLY these values for the constrained fields:",
    ENUMS.map(function (e) { return '  - ' + e; }).join('\n'),
    "",
    "Rules:",
    "- Match existing records by their name (case-insensitive substring) unless the captain clearly means a new one.",
    "- Only include fields in `set` that should change; leave the rest alone.",
    "- Pay: write dollar amounts like \"$68,000\" or \"$21.12\". Dates: keep as text (e.g. 2026-03-01).",
    "- If unclear or it would delete a lot, do the safest reasonable thing and explain in `reply`.",
    "- If nothing should change, return an empty ops array and say so in `reply`.",
    "- Output JSON only — no markdown, no code fences, no prose before or after."
  ].join('\n');
}

// Gemma (and stray Gemini) replies sometimes wrap JSON in prose or ``` fences. Recover it.
function safeJson(t) {
  if (!t) return null;
  t = String(t).trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(t); } catch (e) {}
  var s = t.indexOf('{'), e2 = t.lastIndexOf('}');
  if (s >= 0 && e2 > s) { try { return JSON.parse(t.slice(s, e2 + 1)); } catch (e) {} }
  return null;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method', reply: 'POST only.' });
  const KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
  if (!KEY) return json(200, { error: 'no_key', reply: 'No API key is set on the server. In Netlify: Site configuration → Environment variables → add GEMINI_API_KEY (or GEMINI_KEY), then redeploy.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad_json', reply: 'Bad request.' }); }
  const MODEL = (body.model && String(body.model)) || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const instruction = String(body.instruction || '').slice(0, 6000);
  const data = body.data || {};
  if (!instruction.trim()) return json(400, { error: 'empty', reply: 'No orders given.' });

  const PASS = process.env.CQ_PASSCODE || 'neal-admin';
  if (String(body.passcode || '') !== PASS) return json(200, { error: 'bad_pass', reply: 'Wrong or missing passcode for the Captain\'s Quarters.' });

  const userText = 'CURRENT DATA (JSON):\n' + JSON.stringify(data) + '\n\nINSTRUCTION:\n' + instruction;
  const isGemma = /gemma/i.test(MODEL);
  let payload;
  if (isGemma) {
    // Gemma rejects systemInstruction and JSON response-mode — fold the rules into the prompt.
    payload = {
      contents: [{ role: 'user', parts: [{ text: sysPrompt() + '\n\n' + userText + '\n\nReturn ONLY the JSON object described above — no code fences, no prose.' }] }],
      generationConfig: { temperature: 0.2 }
    };
  } else {
    payload = {
      systemInstruction: { parts: [{ text: sysPrompt() }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
    };
  }

  let resp, jr;
  try {
    resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(MODEL) + ':generateContent?key=' + encodeURIComponent(KEY), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    jr = await resp.json();
  } catch (e) {
    return json(200, { error: 'network', reply: 'Could not reach the model: ' + (e && e.message || e) });
  }
  if (!resp.ok) {
    const msg = (jr && jr.error && jr.error.message) || ('HTTP ' + resp.status);
    return json(200, { error: 'model', reply: 'Model error (' + MODEL + '): ' + msg + (resp.status === 404 ? ' — set GEMINI_MODEL to a model your key can use.' : '') });
  }
  const text = (((jr.candidates || [])[0] || {}).content || {}).parts ? jr.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('') : '';
  let parsed = safeJson(text);
  if (!parsed || typeof parsed !== 'object') return json(200, { error: 'parse', reply: 'The Quartermaster replied but I could not read it as JSON.', raw: String(text).slice(0, 500) });
  if (!Array.isArray(parsed.ops)) parsed.ops = [];
  if (typeof parsed.reply !== 'string') parsed.reply = 'Done.';
  return json(200, parsed);
};

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
