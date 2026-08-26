// Captain's Quarters — server-side Gemini proxy.
// The API key lives ONLY here, as a Netlify environment variable (GEMINI_API_KEY),
// so it works from any device that opens the site and is never exposed in the page.
//
// Set it in Netlify:  Site configuration → Environment variables → add GEMINI_API_KEY
// Optionally set GEMINI_MODEL (defaults to gemini-3.6-flash) to pick a stronger/newer model.

const FIELDS = {
  schools: ['region','name','berth','papers','passage','toll','firstPapers','bond','catch','link','flag','flagText'],
  opportunities: ['name','company','stage','status','priority','source','lossReason','payHourly','paySalary','closeDate','link','description'],
  companies: ['name','contactType','phone','emailDomain','website','address','city','state','zip','country','linkedin','description'],
  people: ['name','company','title','contactType','email','phone','website','address','city','state','zip','linkedin','description'],
  expenses: ['name','kind','amount']
};

const ENUMS = [
  'region: "California Waters" | "The Texas Coast" | "Distant Shores"',
  'passage: "100% online" | "Online + on-campus" | "Hybrid" | "In-person" | "Unconfirmed"',
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
    '{ "reply": "<one short sentence, in light pirate voice, saying what you did>", "ops": [ <operation>, ... ] }',
    "",
    "Each operation is one of:",
    '{ "action":"add",    "collection":"<c>", "set": { ...fields } }',
    '{ "action":"update", "collection":"<c>", "match": { "name":"<existing name, case-insensitive contains>" } | { "index": <n> }, "set": { ...fields to change } }',
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
    ENUMS.map(function(e){return '  - '+e;}).join('\n'),
    "",
    "Rules:",
    "- Match existing records by their name (case-insensitive substring) unless the captain clearly means a new one.",
    "- Only include fields in `set` that should change; leave the rest alone.",
    "- Pay: write dollar amounts like \"$68,000\" or \"$21.12\". Dates: keep as text (e.g. 2026-03-01).",
    "- If the instruction is unclear or would delete a lot, do the safest reasonable thing and explain in `reply`.",
    "- If nothing should change, return an empty ops array and say so in `reply`.",
    "- Output JSON only — no markdown, no code fences."
  ].join('\n');
}

exports.handler = async function (event) {
  if (event.httpMethod === 'GET') {
    var K0 = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
    try {
      var lr = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=' + encodeURIComponent(K0));
      var lj = await lr.json();
      var ms = (lj.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; }).map(function (m) { return m.name.replace('models/', ''); });
      return json(200, { gemma: ms.filter(function (n) { return /gemma/i.test(n); }), all: ms });
    } catch (e) { return json(200, { error: 'list', msg: String(e && e.message || e) }); }
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'method', reply: 'POST only.' });
  const KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
  if (!KEY) return json(200, { error: 'no_key', reply: 'No GEMINI_API_KEY is set on the server yet. In Netlify: Site configuration → Environment variables → add GEMINI_API_KEY, then redeploy.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad_json', reply: 'Bad request.' }); }
  const MODEL = (body.model && String(body.model)) || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const instruction = String(body.instruction || '').slice(0, 6000);
  const data = body.data || {};
  if (!instruction.trim()) return json(400, { error: 'empty', reply: 'No orders given.' });
  const PASS = process.env.CQ_PASSCODE || 'neal-admin';
  if (String(body.passcode || '') !== PASS) return json(200, { error: 'bad_pass', reply: 'Wrong or missing passcode for the Captain\'s Quarters.' });

  const payload = {
    systemInstruction: { parts: [{ text: sysPrompt() }] },
    contents: [{ role: 'user', parts: [{ text: 'CURRENT DATA (JSON):\n' + JSON.stringify(data) + '\n\nINSTRUCTION:\n' + instruction }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
  };

  let resp, jr;
  try {
    resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(MODEL) + ':generateContent?key=' + encodeURIComponent(KEY), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    jr = await resp.json();
  } catch (e) {
    return json(200, { error: 'network', reply: 'Could not reach Gemini: ' + (e && e.message || e) });
  }
  if (!resp.ok) {
    const msg = (jr && jr.error && jr.error.message) || ('HTTP ' + resp.status);
    return json(200, { error: 'gemini', reply: 'Gemini error (' + MODEL + '): ' + msg + (resp.status === 404 ? ' — set GEMINI_MODEL to a model your key can use.' : '') });
  }
  const text = (((jr.candidates || [])[0] || {}).content || {}).parts ? jr.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('') : '';
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { return json(200, { error: 'parse', reply: 'The Quartermaster mumbled something I could not parse.', raw: text.slice(0, 500) }); }
  if (!parsed || typeof parsed !== 'object') parsed = { reply: 'No change.', ops: [] };
  if (!Array.isArray(parsed.ops)) parsed.ops = [];
  return json(200, parsed);
};

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
