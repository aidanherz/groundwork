/* ================= Groundwork — app logic ================= */

/* ---------- tiny helpers ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}

const BOROUGHS = { 1: "Manhattan", 2: "Bronx", 3: "Brooklyn", 4: "Queens", 5: "Staten Island" };
const BORO_NUM = { Manhattan: "1", Bronx: "2", Brooklyn: "3", Queens: "4", "Staten Island": "5" };
const BORO_PLUTO = { Manhattan: "MN", Bronx: "BX", Brooklyn: "BK", Queens: "QN", "Staten Island": "SI" };

const STAGES = ["New lead", "Researching", "Outreach sent", "In contact", "Negotiating", "Under contract", "Dead"];

const DOC_TYPES = {
  DEED: ["Deed — property sold/transferred", true],
  DEEDO: ["Deed (other)", true],
  CORRD: ["Correction deed", false],
  MTGE: ["Mortgage taken out", true],
  AGMT: ["Mortgage agreement/modification", false],
  SAT: ["Mortgage paid off (satisfaction)", false],
  ASST: ["Mortgage sold to a new lender", false],
  "AL&R": ["Assignment of leases & rents", false],
  UCC1: ["UCC financing statement", false],
  RPTT: ["Transfer tax document", false],
  DEATH: ["Death record filed", false],
  EASE: ["Easement", false],
  LP: ["Lis pendens (lawsuit filed!)", false],
  CONS: ["Consolidation of mortgages", false],
};

const BLDG_CLASS = {
  A: "One-family home", B: "Two-family home", C: "Walk-up apartment building",
  D: "Elevator apartment building", E: "Warehouse", F: "Factory / industrial",
  G: "Garage / gas station", H: "Hotel", I: "Hospital / health facility", J: "Theater",
  K: "Retail store", L: "Loft building", M: "Religious building", N: "Group home / asylum",
  O: "Office building", P: "Public assembly", Q: "Recreation", R: "Condo unit",
  S: "Mixed store & residence", T: "Transportation", U: "Utility", V: "Vacant land",
  W: "School / education", Y: "Government", Z: "Miscellaneous",
};

function fmtMoney(v) {
  const n = Number(v);
  if (!n) return "";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function fmtNum(v) {
  const n = Number(v);
  return n ? n.toLocaleString("en-US") : "";
}
function fmtDate(v) {
  if (!v) return "date unknown";
  const d = new Date(v);
  return isNaN(d) ? "date unknown" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function fmtShort(v) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function today() { return new Date().toISOString().slice(0, 10); }
function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/* ---------- data store (browser localStorage) ---------- */
const STORE_KEY = "offbook.crm.v1";

const SAMPLE_DEALS = [
  {
    id: "sample-1", sample: true,
    address: "148 Hancock Street", borough: "Brooklyn", block: "1848", lot: "32",
    owner: "HANCOCK ROW LLC", ownerAddress: "PO Box 310, Brooklyn NY 11216",
    phone: "", email: "", stage: "Outreach sent",
    notes: "3-family brownstone. Deed from 2009, no mortgage since 2014 — likely owned free and clear. Letter mailed to PO Box.",
    nextAction: "Second letter if no reply", nextDate: addDays(4),
    activity: [
      { date: addDays(-9), text: "Found via ACRIS — long-held, no recent debt" },
      { date: addDays(-3), text: "Mailed intro letter" },
    ],
    facts: { propertyType: "Walk-up apartment building", bldgClass: "C0", zoning: "R6B", taxClass: "2A", unitsRes: "3", unitsTotal: "3", floors: "3", yearBuilt: "1931", lotSqft: "2000", bldgSqft: "3600", assessed: "1080000", zipcode: "11216", fetchedAt: addDays(-9) },
    debt: { deedDate: "2009-03-12", mortgageCount: 2, satCount: 2, openMortgages: 0, lastMortgageDate: "2011-06-20", hasLP: false, fetchedAt: addDays(-9) },
    score: { value: 5, driver: "equity", reasons: ["Owned for 17 years", "Every recorded mortgage has been paid off", "No new borrowing in over 10 years"] },
  },
  {
    id: "sample-2", sample: true,
    address: "77-19 41st Avenue", borough: "Queens", block: "1487", lot: "21",
    owner: "MARIA T. VELEZ", ownerAddress: "Same as property",
    phone: "(917) 555-0184", email: "", stage: "In contact",
    notes: "6-unit walk-up. Owner inherited it in 2021 (death record + deed transfer in ACRIS). Sounded open to a number on the phone.",
    nextAction: "Call back with rough offer range", nextDate: addDays(1),
    activity: [
      { date: addDays(-14), text: "Skip-traced phone number" },
      { date: addDays(-6), text: "First call — friendly, asked me to call back" },
    ],
    facts: { propertyType: "Walk-up apartment building", bldgClass: "C3", zoning: "R5", taxClass: "2A", unitsRes: "6", unitsTotal: "6", floors: "3", yearBuilt: "1928", lotSqft: "2500", bldgSqft: "5400", assessed: "890000", zipcode: "11372", fetchedAt: addDays(-14) },
    debt: { deedDate: "2021-08-15", mortgageCount: 1, satCount: 1, openMortgages: 0, lastMortgageDate: "2009-04-30", hasLP: false, fetchedAt: addDays(-14) },
    score: { value: 4, driver: "equity", reasons: ["Every recorded mortgage has been paid off", "No new borrowing in over 10 years"] },
  },
  {
    id: "sample-3", sample: true,
    address: "212 East 118th Street", borough: "Manhattan", block: "1645", lot: "40",
    owner: "BRIDGE POINT HOLDINGS LLC", ownerAddress: "c/o agent, 1 Liberty Plaza",
    phone: "", email: "info@bridgepoint-example.com", stage: "Researching",
    notes: "Lis pendens filed in March — pre-foreclosure. Two mortgages on record totaling ~$1.4M. Need to find the principal behind the LLC.",
    nextAction: "Check NY State registry for LLC agent", nextDate: today(),
    activity: [{ date: addDays(-2), text: "Spotted lis pendens in ACRIS search" }],
    facts: { propertyType: "Walk-up apartment building", bldgClass: "C1", zoning: "R7A", taxClass: "2", unitsRes: "8", unitsTotal: "8", floors: "4", yearBuilt: "1910", lotSqft: "1700", bldgSqft: "6800", assessed: "950000", zipcode: "10035", fetchedAt: addDays(-2) },
    debt: { deedDate: "2019-05-10", mortgageCount: 2, satCount: 0, openMortgages: 2, lastMortgageDate: "2024-11-01", hasLP: true, fetchedAt: addDays(-2) },
    score: { value: 5, driver: "pressure", reasons: ["A lis pendens (lawsuit/foreclosure notice) is on file", "Two mortgages appear open", "New borrowing against the property in the last 3 years"] },
  },
];

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted — start fresh */ }
  const fresh = { deals: SAMPLE_DEALS };
  localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
  return fresh;
}
let store = loadStore();
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }

/* ---------- sidebar ---------- */
const NAV_KEY = "offbook.nav";
const navToggle = $("#nav-toggle");
const isPhone = () => window.matchMedia("(max-width: 720px)").matches;

function setNav(open) {
  document.body.classList.toggle("nav-closed", !open);
  navToggle.textContent = open ? "✕" : "☰";
  if (!isPhone()) localStorage.setItem(NAV_KEY, open ? "open" : "closed");
}
navToggle.addEventListener("click", () => setNav(document.body.classList.contains("nav-closed")));
$("#backdrop").addEventListener("click", () => setNav(false));
setNav(isPhone() ? false : localStorage.getItem(NAV_KEY) !== "closed");

/* ---------- tabs ---------- */
$("#tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  $$(".tab").forEach((t) => t.classList.toggle("active", t === btn));
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === btn.dataset.panel));
  renderAll();
  if (isPhone()) setNav(false);
  window.scrollTo({ top: 0 });
});

/* ---------- dashboard ---------- */
function renderDashboard() {
  const deals = store.deals;
  const active = deals.filter((d) => d.stage !== "Dead");
  const talking = deals.filter((d) => ["In contact", "Negotiating", "Under contract"].includes(d.stage));
  const dueToday = deals.filter((d) => d.nextDate && d.nextDate <= today() && d.stage !== "Dead");

  $("#stat-row").innerHTML = `
    <div class="stat"><b>${active.length}</b><span>Active leads</span></div>
    <div class="stat"><b>${deals.filter((d) => d.stage === "Outreach sent").length}</b><span>Awaiting reply</span></div>
    <div class="stat"><b>${talking.length}</b><span>In conversation</span></div>
    <div class="stat"><b>${dueToday.length}</b><span>Due today</span></div>`;

  const due = deals
    .filter((d) => d.nextDate && d.stage !== "Dead")
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
    .slice(0, 6);
  $("#due-list").innerHTML = due.length
    ? due.map((d) => `<div class="row-item"><span><b>${esc(d.address)}</b> — ${esc(d.nextAction || "follow up")}</span><span class="when">${fmtDate(d.nextDate)}</span></div>`).join("")
    : `<p class="empty-note">Nothing scheduled. Add follow-up dates in the Pipeline tab.</p>`;

  const acts = deals
    .flatMap((d) => (d.activity || []).map((a) => ({ ...a, addr: d.address })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);
  $("#activity-list").innerHTML = acts.length
    ? acts.map((a) => `<div class="row-item"><span><b>${esc(a.addr)}</b> — ${esc(a.text)}</span><span class="when">${fmtDate(a.date)}</span></div>`).join("")
    : `<p class="empty-note">No activity logged yet.</p>`;
}

/* ---------- debt summary + seller-likelihood score ---------- */
function summarizeMasters(masters) {
  const dated = masters
    .filter((m) => m && m.doc_type)
    .map((m) => ({ t: m.doc_type, d: (m.document_date || m.recorded_datetime || "") }));
  const latestOf = (types) =>
    dated.filter((x) => types.includes(x.t)).sort((a, b) => b.d.localeCompare(a.d))[0];
  const deed = latestOf(["DEED", "DEEDO"]);
  const mortgages = dated.filter((x) => ["MTGE", "CONS"].includes(x.t));
  const satCount = dated.filter((x) => x.t === "SAT").length;
  const lastM = mortgages.slice().sort((a, b) => b.d.localeCompare(a.d))[0];
  return {
    deedDate: deed ? deed.d.slice(0, 10) : "",
    mortgageCount: mortgages.length,
    satCount,
    openMortgages: Math.max(0, mortgages.length - satCount),
    lastMortgageDate: lastM ? lastM.d.slice(0, 10) : "",
    hasLP: dated.some((x) => x.t === "LP" || x.t.startsWith("LIS")),
    fetchedAt: today(),
  };
}

function scoreDebt(s) {
  if (!s) return null;
  const yearsSince = (str) => (str ? (Date.now() - new Date(str).getTime()) / 31557600000 : null);
  const held = yearsSince(s.deedDate);
  const sinceMortgage = yearsSince(s.lastMortgageDate);
  let pressure = 0, equity = 0;
  const reasons = [];

  if (s.hasLP) { pressure += 3; reasons.push("A lis pendens (lawsuit/foreclosure notice) is on file"); }
  if (s.openMortgages >= 3) { pressure += 2; reasons.push(`${s.openMortgages} mortgages appear open (no payoff on record)`); }
  else if (s.openMortgages === 2) { pressure += 1; reasons.push("Two mortgages appear open"); }
  if (sinceMortgage !== null && sinceMortgage < 3) { pressure += 1; reasons.push("New borrowing against the property in the last 3 years"); }

  if (held !== null && held >= 25) { equity += 3; reasons.push(`Owned for ${Math.floor(held)} years`); }
  else if (held !== null && held >= 15) { equity += 2; reasons.push(`Owned for ${Math.floor(held)} years`); }
  if (s.mortgageCount > 0 && s.openMortgages === 0) { equity += 2; reasons.push("Every recorded mortgage has been paid off"); }
  if (s.mortgageCount === 0) { equity += 2; reasons.push("No mortgages on record at all"); }
  if (sinceMortgage !== null && sinceMortgage > 10 && s.openMortgages === 0) { equity += 1; reasons.push("No new borrowing in over 10 years"); }

  const value = Math.max(1, Math.min(5, 1 + Math.max(pressure, equity)));
  const driver = pressure > equity ? "pressure" : equity > pressure ? "equity" : pressure ? "both" : "none";
  return { value, driver, reasons };
}

const DRIVER_TEXT = {
  pressure: "Driven by signs of financial pressure",
  equity: "Driven by easy-exit equity (long-held, little debt)",
  both: "Both financial pressure and easy-exit equity signals",
  none: "Little signal either way in the debt history",
};

/* ---------- NYC data services ---------- */
const ACRIS = {
  legals: "https://data.cityofnewyork.us/resource/8h5j-fqxa.json",
  master: "https://data.cityofnewyork.us/resource/bnx9-e6tj.json",
  parties: "https://data.cityofnewyork.us/resource/636b-3b5g.json",
};
const PLUTO_URL = "https://data.cityofnewyork.us/resource/64uk-42ks.json";
const ASSESS_URL = "https://data.cityofnewyork.us/resource/yjxr-fw8i.json";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NYC data service replied ${res.status}`);
  return res.json();
}

function inClause(ids) {
  return `document_id in(${ids.map((i) => `'${i}'`).join(",")})`;
}

async function fetchByDocIds(base, ids, extra = "") {
  const out = [];
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const url = `${base}?$where=${encodeURIComponent(inClause(chunk))}&$limit=1000${extra}`;
    out.push(...await fetchJSON(url));
  }
  return out;
}

async function fetchDebt(d) {
  const bnum = BORO_NUM[d.borough];
  if (!bnum || !d.block || !d.lot) throw new Error("needs borough, block, and lot");
  const where = `borough='${bnum}' AND block='${Number(d.block)}' AND lot='${Number(d.lot)}'`;
  const legals = await fetchJSON(`${ACRIS.legals}?$where=${encodeURIComponent(where)}&$limit=300`);
  const ids = [...new Set(legals.map((l) => l.document_id))].slice(0, 200);
  if (!ids.length) return summarizeMasters([]);
  const masters = await fetchByDocIds(ACRIS.master, ids);
  return summarizeMasters(masters);
}

async function fetchFacts(d) {
  const bp = BORO_PLUTO[d.borough];
  const bnum = BORO_NUM[d.borough];
  if (!bp || !d.block || !d.lot) throw new Error("needs borough, block, and lot");
  const rows = await fetchJSON(`${PLUTO_URL}?borough=${bp}&block=${Number(d.block)}&lot=${Number(d.lot)}&$limit=1`);
  const p = rows[0];
  if (!p) throw new Error("no city record found for this block & lot");

  let taxClass = "";
  try {
    const arows = await fetchJSON(`${ASSESS_URL}?boro=${bnum}&block=${Number(d.block)}&lot=${Number(d.lot)}&$limit=1`);
    const a = arows[0];
    if (a) {
      const key = Object.keys(a).find((k) => /tax.?class/i.test(k));
      if (key) taxClass = a[key];
    }
  } catch (e) { /* tax class is best-effort */ }

  return {
    propertyType: BLDG_CLASS[(p.bldgclass || "")[0]] || "",
    bldgClass: p.bldgclass || "",
    zoning: [p.zonedist1, p.zonedist2].filter(Boolean).join(", "),
    taxClass,
    zipcode: p.zipcode || "",
    unitsRes: p.unitsres || "",
    unitsTotal: p.unitstotal || "",
    floors: p.numfloors || "",
    yearBuilt: p.yearbuilt || "",
    lotSqft: p.lotarea || "",
    bldgSqft: p.bldgarea || "",
    assessed: p.assesstot || "",
    plutoOwner: p.ownername || "",
    fetchedAt: today(),
  };
}

async function refreshDeal(d) {
  const [facts, debt] = await Promise.allSettled([fetchFacts(d), fetchDebt(d)]);
  let okCount = 0;
  if (facts.status === "fulfilled") {
    d.facts = facts.value;
    if (!d.owner && facts.value.plutoOwner) d.owner = facts.value.plutoOwner;
    okCount++;
  }
  if (debt.status === "fulfilled") {
    d.debt = debt.value;
    d.score = scoreDebt(debt.value);
    okCount++;
  }
  if (looksLikeEntity(d.owner)) {
    const ent = await traceEntity(d.owner);
    if (ent) { d.entity = ent; okCount++; }
  }
  if (!okCount) {
    const why = facts.reason?.message || debt.reason?.message || "unknown error";
    throw new Error(why);
  }
  delete d.sample;
  save();
}

/* ---------- NY State business registry (automatic LLC tracing) ---------- */
const CORP_URL = "https://data.ny.gov/resource/n9v6-gdp6.json";
const ENTITY_CACHE = new Map();

function looksLikeEntity(name) {
  return /\b(LLC|L\.?L\.?C\.?|CORP\.?|INC\.?|LTD\.?|L\.?P\.?|LLP|TRUST|HOLDINGS?|REALTY|ASSOCIATES?|PARTNERS(HIP)?|GROUP|EQUITIES|PROPERTIES|VENTURES?)\b/i.test(name || "");
}
function normEntityName(n) {
  return String(n || "").toUpperCase().replace(/[.,'’&/-]/g, " ").replace(/\s+/g, " ").trim();
}

async function traceEntity(rawName) {
  const key = normEntityName(rawName);
  if (!key) return null;
  if (ENTITY_CACHE.has(key)) return ENTITY_CACHE.get(key);
  let match = null;
  try {
    const variants = [...new Set([
      String(rawName).toUpperCase().trim(),
      key,
      key.replace(/ LLC$/, ", LLC"),
      key.replace(/ LLC$/, ", LLC."),
      key.replace(/ LLC$/, " L.L.C."),
      key.replace(/ INC$/, ", INC."),
      key.replace(/ CORP$/, " CORP."),
    ])].filter(Boolean);
    const where = `upper(current_entity_name) in(${variants.map((v) => `'${v.replace(/'/g, "''")}'`).join(",")})`;
    let rows = await fetchJSON(`${CORP_URL}?$where=${encodeURIComponent(where)}&$limit=3`);
    if (!rows.length) {
      // full-text fallback, but only accept an exact match once punctuation is ignored
      rows = (await fetchJSON(`${CORP_URL}?$q=${encodeURIComponent(key)}&$limit=8`))
        .filter((r) => normEntityName(r.current_entity_name) === key);
    }
    const r = rows[0];
    match = r ? {
      status: "found",
      name: r.current_entity_name,
      dosId: r.dos_id || "",
      filed: (r.initial_dos_filing_date || "").slice(0, 10),
      county: r.county || "",
      jurisdiction: r.jurisdiction || "",
      entityType: titleCase(r.entity_type || ""),
      processName: r.dos_process_name || "",
      processAddr: [r.dos_process_address_1, r.dos_process_address_2, r.dos_process_city, r.dos_process_state, r.dos_process_zip].filter(Boolean).join(", "),
      agentName: r.registered_agent_name || "",
      agentAddr: [r.registered_agent_address_1, r.registered_agent_city, r.registered_agent_state, r.registered_agent_zip].filter(Boolean).join(", "),
      fetchedAt: today(),
    } : { status: "none", fetchedAt: today() };
  } catch (e) {
    return null; // network error — don't cache, allow retry
  }
  ENTITY_CACHE.set(key, match);
  return match;
}

function entityHtml(ent) {
  if (!ent) return `<span class="ent-miss">Registry lookup didn't go through — check your internet and try again.</span>`;
  if (ent.status === "none") {
    return `<span class="ent-miss">No exact match in the state's active-business registry — the entity may be dissolved, out-of-state, or spelled differently on file. <a href="https://apps.dos.ny.gov/publicInquiry/" target="_blank" rel="noopener">Check manually ↗</a></span>`;
  }
  return `<span class="ent-line"><b>State registry:</b> ${esc(ent.entityType || "Registered entity")}${ent.filed ? ` · registered ${fmtDate(ent.filed)}` : ""}${ent.county ? ` · ${esc(ent.county)} County` : ""}${ent.jurisdiction && ent.jurisdiction !== "New York" ? ` · formed in ${esc(ent.jurisdiction)}` : ""}</span>
    ${ent.processAddr ? `<span class="ent-line">Legal papers go to: <b>${esc(ent.processName || ent.name)}</b>, ${esc(ent.processAddr)}</span>` : ""}
    ${ent.agentName ? `<span class="ent-line">Registered agent: <b>${esc(ent.agentName)}</b>${ent.agentAddr ? `, ${esc(ent.agentAddr)}` : ""}</span>` : ""}
    ${ent.dosId ? `<span class="ent-line ent-dim">DOS ID ${esc(ent.dosId)} · <a href="https://apps.dos.ny.gov/publicInquiry/" target="_blank" rel="noopener">full state record ↗</a></span>` : ""}`;
}

async function fillEntityTraces(container) {
  for (const el of $$(".entity-trace", container)) {
    const ent = await traceEntity(el.dataset.entity);
    el.innerHTML = entityHtml(ent);
  }
}

/* ---------- ACRIS research tab ---------- */
const RESULT_CACHE = new Map();

let currentMode = "address";
$("#search-mode").addEventListener("click", (e) => {
  const btn = e.target.closest(".mode-btn");
  if (!btn) return;
  currentMode = btn.dataset.mode;
  $$(".mode-btn").forEach((b) => b.classList.toggle("active", b === btn));
  $("#fields-address").classList.toggle("hidden", currentMode !== "address");
  $("#fields-bbl").classList.toggle("hidden", currentMode !== "bbl");
});

$("#search-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const borough = $("#f-borough").value;
  const status = $("#search-status");
  const results = $("#search-results");
  const btn = $("#search-btn");

  let where;
  if (currentMode === "address") {
    const num = $("#f-number").value.trim();
    const street = $("#f-street").value.trim().toUpperCase()
      .replace(/\bAVE(NUE)?\b/g, "AVENUE").replace(/\bST(REET)?\.?$/g, "STREET")
      .replace(/\bRD\b/g, "ROAD").replace(/\bBLVD\b/g, "BOULEVARD");
    if (!street) { toast("Enter a street name"); return; }
    where = `upper(street_name) like '${street.replace(/'/g, "''")}%'`;
    if (num) where += ` AND street_number='${num.replace(/'/g, "''")}'`;
  } else {
    const block = $("#f-block").value.trim(), lot = $("#f-lot").value.trim();
    if (!block || !lot) { toast("Enter both block and lot"); return; }
    where = `block='${Number(block)}' AND lot='${Number(lot)}'`;
  }
  if (borough) where += ` AND borough='${borough}'`;

  btn.disabled = true;
  status.textContent = "Searching NYC land records…";
  results.innerHTML = "";

  try {
    const legals = await fetchJSON(`${ACRIS.legals}?$where=${encodeURIComponent(where)}&$limit=400`);
    if (!legals.length) {
      status.innerHTML = `<span class="err">No records found. Try just the street name (e.g. “BEDFORD”) without “Avenue/Street”, or search by block &amp; lot.</span>`;
      return;
    }

    const props = new Map();
    for (const l of legals) {
      const key = `${l.borough}-${l.block}-${l.lot}`;
      if (!props.has(key)) props.set(key, { borough: l.borough, block: l.block, lot: l.lot, addresses: new Set(), docIds: new Set() });
      const p = props.get(key);
      if (l.street_number && l.street_name) p.addresses.add(`${l.street_number} ${titleCase(l.street_name)}`);
      p.docIds.add(l.document_id);
    }

    const allIds = [...new Set(legals.map((l) => l.document_id))].slice(0, 200);
    status.textContent = `Found ${props.size} propert${props.size === 1 ? "y" : "ies"} — pulling deeds, mortgages, and names…`;

    const [masters, parties] = await Promise.all([
      fetchByDocIds(ACRIS.master, allIds),
      fetchByDocIds(ACRIS.parties, allIds),
    ]);
    const masterById = new Map(masters.map((m) => [m.document_id, m]));
    const partiesById = new Map();
    for (const p of parties) {
      if (!partiesById.has(p.document_id)) partiesById.set(p.document_id, []);
      partiesById.get(p.document_id).push(p);
    }

    results.innerHTML = [...props.values()].slice(0, 12)
      .map((p) => renderPropCard(p, masterById, partiesById)).join("");
    status.textContent = `Showing ${Math.min(props.size, 12)} of ${props.size} propert${props.size === 1 ? "y" : "ies"}.`;
    fillEntityTraces(results);
  } catch (err) {
    status.innerHTML = `<span class="err">Couldn't reach the NYC data service (${esc(err.message)}). Check your internet and try again.</span>`;
  } finally {
    btn.disabled = false;
  }
});

function titleCase(s) {
  return String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderPropCard(p, masterById, partiesById) {
  const docs = [...p.docIds]
    .map((id) => ({ id, m: masterById.get(id), pts: partiesById.get(id) || [] }))
    .filter((d) => d.m)
    .sort((a, b) => (b.m.document_date || b.m.recorded_datetime || "").localeCompare(a.m.document_date || a.m.recorded_datetime || ""));

  const cacheKey = `${p.borough}-${p.block}-${p.lot}`;
  RESULT_CACHE.set(cacheKey, docs.map((d) => d.m));

  const lastDeed = docs.find((d) => ["DEED", "DEEDO"].includes(d.m.doc_type));
  const ownerNames = lastDeed
    ? lastDeed.pts.filter((x) => x.party_type === "2").map((x) => x.name).join(", ")
    : "";
  const ownerParty = lastDeed ? lastDeed.pts.find((x) => x.party_type === "2" && x.address_1) : null;
  const ownerAddr = ownerParty ? [ownerParty.address_1, ownerParty.city].filter(Boolean).join(", ") : "";

  const address = [...p.addresses][0] || `Block ${p.block}, Lot ${p.lot}`;
  const payload = esc(JSON.stringify({
    address, borough: BOROUGHS[p.borough] || p.borough, block: p.block, lot: p.lot,
    owner: ownerNames, ownerAddress: ownerAddr, cacheKey,
  }));

  const docHtml = docs.slice(0, 10).map((d) => {
    const [label, isMoney] = DOC_TYPES[d.m.doc_type] || [d.m.doc_type, false];
    const p1 = d.pts.filter((x) => x.party_type === "1").map((x) => x.name).slice(0, 3);
    const p2 = d.pts.filter((x) => x.party_type === "2").map((x) => x.name).slice(0, 3);
    const addr2 = d.pts.find((x) => x.party_type === "2" && x.address_1);
    return `<div class="doc">
      <div class="doc-top">
        <span class="doc-type ${isMoney ? "money" : ""}">${esc(label)}</span>
        <span class="doc-date">${fmtDate(d.m.document_date || d.m.recorded_datetime)}</span>
        <span class="doc-amt">${fmtMoney(d.m.document_amt)}</span>
      </div>
      ${p1.length || p2.length ? `<div class="doc-parties">
        ${p1.length ? `From: <span class="pname">${esc(p1.join("; "))}</span>` : ""}
        ${p2.length ? ` → To: <span class="pname">${esc(p2.join("; "))}</span>` : ""}
        ${addr2 ? `<br><span class="paddr">Mailing address on file: ${esc([addr2.address_1, addr2.city, addr2.state].filter(Boolean).join(", "))}</span>` : ""}
      </div>` : ""}
    </div>`;
  }).join("");

  return `<div class="card prop-card">
    <div class="prop-head">
      <div>
        <div class="prop-addr">${esc(address)}</div>
        <div class="prop-bbl">${BOROUGHS[p.borough] || ""} · Block ${esc(p.block)} · Lot ${esc(p.lot)} · ${docs.length} recorded document${docs.length === 1 ? "" : "s"}</div>
        ${ownerNames ? `<div class="owner-chip">Likely current owner: <b>${esc(ownerNames)}</b></div>` : ""}
        ${ownerNames && looksLikeEntity(ownerNames) ? `<div class="entity-trace" data-entity="${esc(ownerNames)}">Checking NY State business registry…</div>` : ""}
      </div>
      <button class="btn ghost small add-to-pipeline" data-payload="${payload}">+ Track in pipeline</button>
    </div>
    <div class="doc-list">${docHtml || `<p class="empty-note" style="padding-top:10px">Documents found but details unavailable.</p>`}</div>
  </div>`;
}

$("#search-results").addEventListener("click", (e) => {
  const btn = e.target.closest(".add-to-pipeline");
  if (!btn) return;
  const data = JSON.parse(btn.dataset.payload);
  const exists = store.deals.some((d) => d.block === data.block && d.lot === data.lot && d.borough === data.borough);
  if (exists) { toast("Already in your pipeline"); return; }

  const masters = RESULT_CACHE.get(data.cacheKey) || [];
  const debt = masters.length ? summarizeMasters(masters) : null;
  delete data.cacheKey;

  const deal = {
    id: "d" + Date.now(), ...data,
    phone: "", email: "", stage: "New lead", notes: "", nextAction: "", nextDate: defaultNextDate(),
    activity: [{ date: today(), text: "Added from ACRIS research" }],
    debt, score: scoreDebt(debt),
    entity: ENTITY_CACHE.get(normEntityName(data.owner)) || null,
  };
  store.deals.unshift(deal);
  save();
  toast(`${data.address} added to pipeline`);
  renderAll();

  // pull property facts in the background
  fetchFacts(deal).then((f) => {
    deal.facts = f;
    if (!deal.owner && f.plutoOwner) deal.owner = f.plutoOwner;
    save();
    renderAll();
  }).catch(() => { /* user can refresh from the detail view */ });
});

/* ---------- neighborhoods (StreetEasy's area names & grouping, matched by zip code) ----------
   Borough → StreetEasy group (Manhattan regions, SI shores, parent neighborhoods
   elsewhere) → areas. Zip-mates (e.g. SoHo / NoLita / NoHo) match the same properties. */
const HOODS = {
  Manhattan: {
    "Downtown": {
      "Battery Park City": ["10280", "10282"], "Financial District": ["10004", "10005", "10006"],
      "Fulton/Seaport": ["10038"], "Civic Center": ["10007"], "Tribeca": ["10013"],
      "SoHo": ["10012"], "NoLita": ["10012"], "NoHo": ["10012"], "Hudson Square": ["10013"],
      "Little Italy": ["10013"], "Chinatown": ["10013"], "Two Bridges": ["10002"],
      "Lower East Side": ["10002"], "East Village": ["10003", "10009"],
      "Greenwich Village": ["10003", "10012"], "West Village": ["10014"],
      "Stuyvesant Town/PCV": ["10009"], "Gramercy Park": ["10010"], "Flatiron": ["10010"],
      "NoMad": ["10016"], "Chelsea": ["10001", "10011"], "West Chelsea": ["10001"]
    },
    "Midtown": {
      "Midtown": ["10019", "10020"], "Central Park South": ["10019"],
      "Midtown East": ["10017", "10022"], "Kips Bay": ["10016"], "Murray Hill": ["10016"],
      "Sutton Place": ["10022"], "Turtle Bay": ["10017"], "Beekman": ["10022"],
      "Midtown South": ["10018"], "Midtown West": ["10019"], "Hell's Kitchen": ["10036"],
      "Hudson Yards": ["10001"]
    },
    "Upper West Side": {
      "Upper West Side": ["10023", "10024", "10025", "10069"],
      "Lincoln Square": ["10023"], "Manhattan Valley": ["10025"]
    },
    "Upper East Side": {
      "Upper East Side": ["10021", "10028", "10065", "10075", "10128"],
      "Carnegie Hill": ["10128"], "Lenox Hill": ["10021", "10065"], "Yorkville": ["10028"],
      "Roosevelt Island": ["10044"]
    },
    "Upper Manhattan": {
      "Central Harlem": ["10030", "10037", "10039"], "South Harlem": ["10026"],
      "East Harlem": ["10029", "10035"], "West Harlem": ["10031"],
      "Hamilton Heights": ["10031"], "Manhattanville": ["10027"],
      "Morningside Heights": ["10027"], "Washington Heights": ["10032", "10033", "10040"],
      "Hudson Heights": ["10033"], "Fort George": ["10040"], "Inwood": ["10034"],
      "Marble Hill": ["10463"]
    }
  },
  Brooklyn: {
    "Greenpoint": { "Greenpoint": ["11222"] },
    "Williamsburg": { "Williamsburg": ["11211", "11249"], "East Williamsburg": ["11206"] },
    "Bushwick": { "Bushwick": ["11221", "11237"] },
    "Bedford-Stuyvesant": { "Bedford-Stuyvesant": ["11216", "11233"], "Ocean Hill": ["11233"], "Stuyvesant Heights": ["11233"] },
    "Fort Greene": { "Fort Greene": ["11205"] },
    "Clinton Hill": { "Clinton Hill": ["11205"] },
    "Downtown Brooklyn": { "Downtown Brooklyn": ["11201"] },
    "Brooklyn Heights": { "Brooklyn Heights": ["11201"] },
    "DUMBO": { "DUMBO": ["11201"], "Vinegar Hill": ["11201"] },
    "Boerum Hill": { "Boerum Hill": ["11217"] },
    "Cobble Hill": { "Cobble Hill": ["11231"] },
    "Carroll Gardens": { "Carroll Gardens": ["11231"], "Columbia St Waterfront District": ["11231"] },
    "Red Hook": { "Red Hook": ["11231"] },
    "Gowanus": { "Gowanus": ["11215", "11217"] },
    "Park Slope": { "Park Slope": ["11215"] },
    "Prospect Heights": { "Prospect Heights": ["11238"] },
    "Crown Heights": { "Crown Heights": ["11213"], "Weeksville": ["11213"] },
    "Prospect Lefferts Gardens": { "Prospect Lefferts Gardens": ["11225"] },
    "Flatbush": { "Flatbush": ["11226"], "Ditmas Park": ["11226"], "Prospect Park South": ["11226"], "Fiske Terrace": ["11230"] },
    "East Flatbush": { "East Flatbush": ["11203"], "Farragut": ["11203"], "Wingate": ["11203"] },
    "Windsor Terrace": { "Windsor Terrace": ["11218"] },
    "Kensington": { "Kensington": ["11218"], "Ocean Parkway": ["11230"] },
    "Sunset Park": { "Sunset Park": ["11220", "11232"], "Greenwood": ["11232"] },
    "Borough Park": { "Borough Park": ["11219"], "Mapleton": ["11204"] },
    "Bensonhurst": { "Bensonhurst": ["11204", "11214"], "Bath Beach": ["11214"] },
    "Dyker Heights": { "Dyker Heights": ["11228"] },
    "Bay Ridge": { "Bay Ridge": ["11209"], "Fort Hamilton": ["11209"] },
    "Gravesend": { "Gravesend": ["11223"] },
    "Midwood": { "Midwood": ["11230"] },
    "Sheepshead Bay": { "Sheepshead Bay": ["11235"], "Homecrest": ["11229"], "Madison": ["11229"], "Manhattan Beach": ["11235"] },
    "Brighton Beach": { "Brighton Beach": ["11235"] },
    "Coney Island": { "Coney Island": ["11224"], "Sea Gate": ["11224"] },
    "Gerritsen Beach": { "Gerritsen Beach": ["11229"] },
    "Flatlands": { "Flatlands": ["11234"] },
    "Marine Park": { "Marine Park": ["11234"] },
    "Mill Basin": { "Mill Basin": ["11234"], "Old Mill Basin": ["11234"] },
    "Bergen Beach": { "Bergen Beach": ["11234"] },
    "Canarsie": { "Canarsie": ["11236"] },
    "Brownsville": { "Brownsville": ["11212"] },
    "East New York": { "East New York": ["11207", "11208"], "City Line": ["11208"], "Cypress Hills": ["11208"], "New Lots": ["11207"], "Starrett City": ["11239"] }
  },
  Queens: {
    "Astoria": { "Astoria": ["11102", "11103", "11106"], "Ditmars-Steinway": ["11105"] },
    "Long Island City": { "Long Island City": ["11101", "11109"], "Hunters Point": ["11101"] },
    "Sunnyside": { "Sunnyside": ["11104"] },
    "Woodside": { "Woodside": ["11377"] },
    "Jackson Heights": { "Jackson Heights": ["11372"] },
    "East Elmhurst": { "East Elmhurst": ["11369", "11370"] },
    "Corona": { "Corona": ["11368"], "North Corona": ["11368"] },
    "Elmhurst": { "Elmhurst": ["11373"] },
    "Maspeth": { "Maspeth": ["11378"] },
    "Middle Village": { "Middle Village": ["11379"] },
    "Ridgewood": { "Ridgewood": ["11385"] },
    "Glendale": { "Glendale": ["11385"] },
    "Rego Park": { "Rego Park": ["11374"] },
    "Forest Hills": { "Forest Hills": ["11375"] },
    "Kew Gardens": { "Kew Gardens": ["11415"] },
    "Kew Gardens Hills": { "Kew Gardens Hills": ["11367"] },
    "Briarwood": { "Briarwood": ["11435"] },
    "Jamaica Estates": { "Jamaica Estates": ["11432"] },
    "Jamaica Hills": { "Jamaica Hills": ["11432"] },
    "Flushing": { "Flushing": ["11354", "11355"], "East Flushing": ["11355"], "Murray Hill (Queens)": ["11358"] },
    "Auburndale": { "Auburndale": ["11358"] },
    "College Point": { "College Point": ["11356"] },
    "Whitestone": { "Whitestone": ["11357"], "Beechhurst": ["11357"], "Malba": ["11357"] },
    "Bayside": { "Bayside": ["11360", "11361"], "Bay Terrace (Queens)": ["11360"], "Clearview": ["11360"] },
    "Douglaston": { "Douglaston": ["11362"] },
    "Little Neck": { "Little Neck": ["11363"] },
    "Oakland Gardens": { "Oakland Gardens": ["11364"] },
    "Fresh Meadows": { "Fresh Meadows": ["11365", "11366"], "Hillcrest": ["11365"], "Pomonok": ["11365"], "Utopia": ["11366"] },
    "Richmond Hill": { "Richmond Hill": ["11418"], "South Richmond Hill": ["11419"] },
    "Woodhaven": { "Woodhaven": ["11421"] },
    "Ozone Park": { "Ozone Park": ["11416", "11417"] },
    "South Ozone Park": { "South Ozone Park": ["11420"] },
    "Howard Beach": { "Howard Beach": ["11414"], "Hamilton Beach": ["11414"], "Lindenwood": ["11414"], "Old Howard Beach": ["11414"], "Ramblersville": ["11414"] },
    "Jamaica": { "Jamaica": ["11433"], "South Jamaica": ["11434", "11436"] },
    "St. Albans": { "St. Albans": ["11412"] },
    "Springfield Gardens": { "Springfield Gardens": ["11413"] },
    "Laurelton": { "Laurelton": ["11413"] },
    "Rosedale": { "Rosedale": ["11422"], "Brookville": ["11422"] },
    "Cambria Heights": { "Cambria Heights": ["11411"] },
    "Hollis": { "Hollis": ["11423"] },
    "Queens Village": { "Queens Village": ["11428", "11429"] },
    "Bellerose": { "Bellerose": ["11426"] },
    "Floral Park": { "Floral Park": ["11004", "11005"] },
    "Glen Oaks": { "Glen Oaks": ["11004"] },
    "New Hyde Park": { "New Hyde Park": ["11040"] },
    "The Rockaways": {
      "Far Rockaway": ["11691"], "Bayswater": ["11691"], "Edgemere": ["11692"],
      "Arverne": ["11692"], "Hammels": ["11693"], "Broad Channel": ["11693"],
      "Rockaway Park": ["11694"], "Belle Harbor": ["11694"], "Neponsit": ["11694"],
      "Breezy Point": ["11697"]
    }
  },
  Bronx: {
    "Mott Haven": { "Mott Haven": ["10451", "10454"], "North New York": ["10454"], "Port Morris": ["10454"] },
    "Melrose": { "Melrose": ["10455"] },
    "Morrisania": { "Morrisania": ["10456"], "Claremont": ["10456"], "Woodstock": ["10459"] },
    "Hunts Point": { "Hunts Point": ["10474"], "Longwood": ["10459"] },
    "Tremont": { "Tremont": ["10457"], "Mt. Hope": ["10457"], "East Tremont": ["10460"], "West Farms": ["10460"], "Crotona Park East": ["10460"] },
    "Highbridge": { "Highbridge": ["10452"] },
    "Concourse": { "Concourse": ["10451", "10452"] },
    "Morris Heights": { "Morris Heights": ["10453"] },
    "University Heights": { "University Heights": ["10453"] },
    "Fordham": { "Fordham": ["10458", "10468"], "Belmont": ["10458"] },
    "Bedford Park": { "Bedford Park": ["10468"], "Kingsbridge Heights": ["10468"] },
    "Kingsbridge": { "Kingsbridge": ["10463"] },
    "Riverdale": { "Riverdale": ["10471"], "Fieldston": ["10471"], "Spuyten Duyvil": ["10463"] },
    "Norwood": { "Norwood": ["10467"] },
    "Williamsbridge": { "Williamsbridge": ["10467"], "Bronxwood": ["10469"], "Laconia": ["10469"] },
    "Wakefield": { "Wakefield": ["10466"], "Edenwald": ["10466"] },
    "Woodlawn": { "Woodlawn": ["10470"] },
    "Eastchester": { "Eastchester": ["10469"], "Baychester": ["10475"], "Pelham Gardens": ["10469"] },
    "Co-op City": { "Co-op City": ["10475"] },
    "Pelham Parkway": { "Pelham Parkway": ["10462"] },
    "Morris Park": { "Morris Park": ["10462"], "Van Nest": ["10462"] },
    "Parkchester": { "Parkchester": ["10462"] },
    "Westchester Square": { "Westchester Square": ["10461"], "Westchester Village": ["10461"] },
    "Pelham Bay": { "Pelham Bay": ["10461"] },
    "City Island": { "City Island": ["10464"] },
    "Throgs Neck": { "Throgs Neck": ["10465"], "Locust Point": ["10465"], "Schuylerville": ["10465"], "Country Club": ["10465"] },
    "Castle Hill": { "Castle Hill": ["10473"] },
    "Soundview": { "Soundview": ["10472", "10473"] }
  },
  "Staten Island": {
    "North Shore": {
      "Arlington": ["10303"], "Clifton": ["10304"], "Elm Park": ["10302"],
      "Grymes Hill": ["10301"], "Howland Hook": ["10303"], "Mariners Harbor": ["10303"],
      "New Brighton": ["10301"], "Park Hill": ["10304"], "Port Richmond": ["10302"],
      "Rosebank": ["10305"], "St. George": ["10301"], "Shore Acres": ["10305"],
      "Silver Lake": ["10301"], "Stapleton": ["10304"], "Tompkinsville": ["10301"],
      "West Brighton": ["10310"]
    },
    "South Shore": {
      "Annadale": ["10312"], "Arden Heights": ["10312"], "Charleston": ["10309"],
      "Eltingville": ["10312"], "Great Kills": ["10308"], "Greenridge": ["10312"],
      "Huguenot": ["10312"], "Pleasant Plains": ["10309"], "Prince's Bay": ["10309"],
      "Richmond Valley": ["10309"], "Rossville": ["10309"], "Tottenville": ["10307"],
      "Woodrow": ["10312"]
    },
    "East Shore": {
      "Arrochar": ["10305"], "Bay Terrace": ["10306"], "Dongan Hills": ["10305"],
      "Egbertville": ["10306"], "Emerson Hill": ["10304"], "Fort Wadsworth": ["10305"],
      "Grant City": ["10306"], "Grasmere": ["10305"], "Lighthouse Hill": ["10306"],
      "Midland Beach": ["10306"], "New Dorp": ["10306"], "New Dorp Beach": ["10306"],
      "Oakwood": ["10306"], "Oakwood Beach": ["10306"], "Ocean Breeze": ["10305"],
      "Richmondtown": ["10306"], "South Beach": ["10305"], "Todt Hill": ["10306"]
    },
    "West Shore": {
      "Bloomfield": ["10314"], "Chelsea (Staten Island)": ["10314"], "Travis": ["10314"]
    },
    "Mid-Island": {
      "Bulls Head": ["10314"], "Castleton Corners": ["10314"], "Graniteville": ["10314"],
      "Manor Heights": ["10314"], "Meiers Corners": ["10314"], "New Springville": ["10314"],
      "Sunnyside (Staten Island)": ["10301"], "Westerleigh": ["10314"], "Willowbrook": ["10314"]
    }
  }
};

/* flat borough → { hood: zips }, and zip → display name (first listed wins) */
const HOOD_ZIPS = {};
const ZIP_HOOD = {};
for (const [boro, groups] of Object.entries(HOODS)) {
  HOOD_ZIPS[boro] = {};
  for (const hoods of Object.values(groups))
    for (const [hood, zips] of Object.entries(hoods)) {
      HOOD_ZIPS[boro][hood] = zips;
      for (const z of zips) if (!(z in ZIP_HOOD)) ZIP_HOOD[z] = hood;
    }
}

function hoodOf(d) {
  const zip = d.facts?.zipcode ? String(d.facts.zipcode).slice(0, 5) : "";
  return ZIP_HOOD[zip] || "";
}

/* ---------- property type buckets ---------- */
const TYPE_OF_CLASS = {
  A: "1–2 Family", B: "1–2 Family", C: "Multifamily", D: "Multifamily",
  S: "Mixed-use", K: "Retail", O: "Office", E: "Industrial / Warehouse",
  F: "Industrial / Warehouse", H: "Hotel", R: "Condo unit", V: "Vacant land",
};
const TYPE_LIST = ["Multifamily", "Mixed-use", "Office", "Retail", "Industrial / Warehouse", "Hotel", "1–2 Family", "Condo unit", "Vacant land", "Other"];
function typeOfDeal(d) {
  const c = d.facts?.bldgClass;
  if (!c) return "";
  return TYPE_OF_CLASS[c[0]] || "Other";
}

/* ---------- filters ---------- */
const FILTER_KEY = "offbook.filters.v1";
const EMPTY_FILTERS = () => ({
  hoods: [], types: [], zoning: [], bldgClass: [], taxClass: [], scores: [],
  ranges: { units: [null, null], yearBuilt: [null, null], bldgSqft: [null, null], floors: [null, null], lotSqft: [null, null], assessed: [null, null] },
});
let FILTERS = EMPTY_FILTERS();
try {
  const savedF = JSON.parse(localStorage.getItem(FILTER_KEY));
  if (savedF && savedF.ranges) FILTERS = { ...EMPTY_FILTERS(), ...savedF, ranges: { ...EMPTY_FILTERS().ranges, ...savedF.ranges } };
} catch (e) { /* ignore */ }
function saveFilters() { localStorage.setItem(FILTER_KEY, JSON.stringify(FILTERS)); }

const RANGE_DEFS = [
  ["units", "Units", (f) => f.unitsTotal],
  ["yearBuilt", "Year built", (f) => (Number(f.yearBuilt) ? f.yearBuilt : "")],
  ["bldgSqft", "Building size (sq ft)", (f) => f.bldgSqft],
  ["floors", "Floors", (f) => f.floors],
  ["lotSqft", "Lot size (sq ft)", (f) => f.lotSqft],
  ["assessed", "Assessed value ($)", (f) => f.assessed],
];

function activeFilterCount(F = FILTERS) {
  let n = 0;
  if (F.hoods.length) n++;
  for (const k of ["types", "zoning", "bldgClass", "taxClass", "scores"]) if (F[k].length) n++;
  for (const k in F.ranges) if (F.ranges[k][0] != null || F.ranges[k][1] != null) n++;
  return n;
}

/* returns "match" | "no" | "missing" */
function dealFilterResult(d, F = FILTERS) {
  const f = d.facts;

  if (F.hoods.length) {
    if (!d.borough || !HOOD_ZIPS[d.borough]) return "missing";
    const inBoro = F.hoods.filter((h) => h.startsWith(`${d.borough}|`));
    if (!inBoro.length) return "no";
    const wholeBorough = inBoro.length === Object.keys(HOOD_ZIPS[d.borough]).length;
    if (!wholeBorough) {
      const zip = d.facts?.zipcode ? String(d.facts.zipcode).slice(0, 5) : "";
      if (!zip) return "missing";
      const zips = new Set();
      for (const key of inBoro)
        (HOOD_ZIPS[d.borough][key.split("|")[1]] || []).forEach((z) => zips.add(z));
      if (!zips.has(zip)) return "no";
    }
  }

  if (F.scores && F.scores.length) {
    const s = d.score?.value;
    if (!s) return "missing";
    if (!F.scores.includes(String(s))) return "no";
  }
  if (F.types.length) {
    const t = typeOfDeal(d);
    if (!t) return "missing";
    if (!F.types.includes(t)) return "no";
  }
  if (F.zoning.length) {
    if (!f?.zoning) return "missing";
    const zones = f.zoning.split(",").map((z) => z.trim());
    if (!zones.some((z) => F.zoning.includes(z))) return "no";
  }
  if (F.bldgClass.length) {
    if (!f?.bldgClass) return "missing";
    if (!F.bldgClass.includes(f.bldgClass)) return "no";
  }
  if (F.taxClass.length) {
    if (!f?.taxClass) return "missing";
    if (!F.taxClass.includes(String(f.taxClass).trim())) return "no";
  }
  for (const [key, , get] of RANGE_DEFS) {
    const [min, max] = F.ranges[key];
    if (min == null && max == null) continue;
    const raw = f ? get(f) : "";
    const v = Number(raw);
    if (raw === "" || raw == null || isNaN(v)) return "missing";
    if (min != null && v < min) return "no";
    if (max != null && v > max) return "no";
  }
  return "match";
}

/* options that appear in the data (for zoning/class dropdowns) */
function dataOptions(getter) {
  const set = new Set();
  for (const d of store.deals) {
    const v = d.facts ? getter(d.facts) : "";
    if (v) String(v).split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => set.add(x));
  }
  return [...set].sort();
}

function mselSection(id, label, options, selected) {
  return `<details class="msel">
    <summary>${label} <b class="msel-count">${selected.length ? selected.length : ""}</b></summary>
    <div class="msel-list">
      ${options.length ? options.map((o) => `<label class="msel-opt">
        <input type="checkbox" data-filter="${id}" value="${esc(o.v)}" ${selected.includes(o.v) ? "checked" : ""}>
        <span>${esc(o.l)}</span>
      </label>`).join("") : `<p class="empty-note" style="padding:8px 10px">Nothing to pick yet — refresh city data on your properties first.</p>`}
    </div>
  </details>`;
}

function renderFilterPanel() {
  const F = FILTERS;
  const hoodBox = (boro, h, cls) => `<label class="msel-opt ${cls}">
    <input type="checkbox" data-filter="hoods" value="${esc(`${boro}|${h}`)}" ${F.hoods.includes(`${boro}|${h}`) ? "checked" : ""}>
    <span>${esc(h)}</span>
  </label>`;

  const boroHtml = Object.entries(HOODS).map(([boro, groups]) => {
    const total = Object.keys(HOOD_ZIPS[boro]).length;
    const selCount = F.hoods.filter((h) => h.startsWith(`${boro}|`)).length;

    const groupsHtml = Object.entries(groups).map(([groupName, hoods]) => {
      // sort areas A→Z, but keep the group's namesake area first
      const keys = Object.keys(hoods).sort((a, b) =>
        (a === groupName ? -1 : b === groupName ? 1 : a.localeCompare(b)));
      if (keys.length === 1 && keys[0] === groupName) return hoodBox(boro, keys[0], "hood-opt");
      return `<div class="group-item">
        <label class="msel-opt group-row">
          <input type="checkbox" class="group-check">
          <span>${esc(groupName)}</span>
        </label>
        <details class="group-sub">
          <summary>${keys.length} areas</summary>
          <div>${keys.map((h) => hoodBox(boro, h, "hood-opt sub-opt")).join("")}</div>
        </details>
      </div>`;
    }).join("");

    return `<div class="boro-item" data-boro="${esc(boro)}">
      <label class="msel-opt boro-row">
        <input type="checkbox" class="boro-check">
        <span><b>${esc(boro)}</b></span>
      </label>
      <details class="hood-sub">
        <summary>${selCount ? `${selCount} of ${total} areas` : `all ${total} areas`}</summary>
        <div>${groupsHtml}</div>
      </details>
    </div>`;
  }).join("");

  const zoningOpts = dataOptions((f) => f.zoning).map((v) => ({ v, l: v }));
  const classOpts = dataOptions((f) => f.bldgClass).map((v) => ({ v, l: `${v} — ${BLDG_CLASS[v[0]] || "Other"}` }));
  const taxBase = ["1", "2", "2A", "2B", "3", "4"];
  const taxOpts = [...new Set([...taxBase, ...dataOptions((f) => f.taxClass)])].sort().map((v) => ({ v, l: `Class ${v}` }));

  $("#filter-panel").innerHTML = `
    <div class="filter-grid">
      <div class="filter-col">
        <h3 class="filter-h">Location</h3>
        <details class="msel" open>
          <summary>Borough &amp; area <b class="msel-count">${F.hoods.length || ""}</b></summary>
          <div class="msel-list">${boroHtml}</div>
        </details>
      </div>
      <div class="filter-col">
        <h3 class="filter-h">Property</h3>
        <div class="score-filter">
          <span class="score-filter-label">Seller likelihood</span>
          <div class="score-chips">
            ${[1, 2, 3, 4, 5].map((n) => `<label class="score-chip s${n}">
              <input type="checkbox" data-filter="scores" value="${n}" ${F.scores?.includes(String(n)) ? "checked" : ""}>
              <span>${n}</span>
            </label>`).join("")}
          </div>
        </div>
        ${mselSection("types", "Property type", TYPE_LIST.map((v) => ({ v, l: v })), F.types)}
        ${mselSection("zoning", "Zoning", zoningOpts, F.zoning)}
        ${mselSection("bldgClass", "Building class", classOpts, F.bldgClass)}
        ${mselSection("taxClass", "Tax class", taxOpts, F.taxClass)}
      </div>
      <div class="filter-col">
        <h3 class="filter-h">Size &amp; value</h3>
        ${RANGE_DEFS.map(([key, label]) => `<div class="range-row">
          <span class="range-label">${label}</span>
          <input type="number" inputmode="numeric" data-range="${key}" data-side="0" placeholder="Min" value="${F.ranges[key][0] ?? ""}">
          <span class="range-dash">–</span>
          <input type="number" inputmode="numeric" data-range="${key}" data-side="1" placeholder="Max" value="${F.ranges[key][1] ?? ""}">
        </div>`).join("")}
      </div>
    </div>
    <div class="filter-foot">
      <button class="btn ghost small" id="filter-reset">Reset all</button>
      <span class="spacer"></span>
      <button class="btn primary small" id="filter-apply">Apply filters</button>
    </div>`;

  $$(".boro-item", $("#filter-panel")).forEach(syncBoroCheckbox);
}

function syncBoroCheckbox(item) {
  for (const g of $$(".group-item", item)) {
    const gb = $$('[data-filter="hoods"]', g);
    const gOn = gb.filter((b) => b.checked).length;
    const gc = $(".group-check", g);
    gc.checked = gOn > 0 && gOn === gb.length;
    gc.indeterminate = gOn > 0 && gOn < gb.length;
  }
  const boxes = $$('[data-filter="hoods"]', item);
  const on = boxes.filter((b) => b.checked).length;
  const boro = $(".boro-check", item);
  boro.checked = on > 0 && on === boxes.length;
  boro.indeterminate = on > 0 && on < boxes.length;
  const sub = $(".hood-sub > summary", item);
  if (sub) sub.textContent = on ? `${on} of ${boxes.length} areas` : `all ${boxes.length} areas`;
}

function readFiltersFromPanel() {
  const panel = $("#filter-panel");
  const F = EMPTY_FILTERS();
  for (const id of ["hoods", "types", "zoning", "bldgClass", "taxClass", "scores"])
    F[id] = $$(`[data-filter="${id}"]:checked`, panel).map((b) => b.value);
  for (const inp of $$("[data-range]", panel)) {
    const v = inp.value.trim();
    F.ranges[inp.dataset.range][Number(inp.dataset.side)] = v === "" ? null : Number(v);
  }
  return F;
}

/* ---------- pipeline: list + detail ---------- */
const stageFilter = $("#stage-filter");
STAGES.forEach((s) => stageFilter.insertAdjacentHTML("beforeend", `<option>${s}</option>`));
stageFilter.addEventListener("change", renderPipeline);

$("#filter-toggle").addEventListener("click", () => {
  const panel = $("#filter-panel");
  if (panel.classList.contains("hidden")) {
    renderFilterPanel();
    panel.classList.remove("hidden");
  } else {
    panel.classList.add("hidden");
  }
});

$("#filter-panel").addEventListener("change", (e) => {
  const item = e.target.closest(".boro-item");
  if (e.target.classList.contains("boro-check") && item) {
    $$('[data-filter="hoods"]', item).forEach((b) => { b.checked = e.target.checked; });
  }
  if (e.target.classList.contains("group-check")) {
    const g = e.target.closest(".group-item");
    $$('[data-filter="hoods"]', g).forEach((b) => { b.checked = e.target.checked; });
  }
  if (item) syncBoroCheckbox(item);
  const pending = readFiltersFromPanel();
  const matches = store.deals.filter((d) => dealFilterResult(d, pending) === "match").length;
  const apply = $("#filter-apply");
  if (apply) apply.textContent = activeFilterCount(pending) ? `Apply filters — ${matches} match` : "Apply filters";
});

$("#filter-panel").addEventListener("click", (e) => {
  if (e.target.closest("#filter-apply")) {
    FILTERS = readFiltersFromPanel();
    saveFilters();
    $("#filter-panel").classList.add("hidden");
    renderPipeline();
  }
  if (e.target.closest("#filter-reset")) {
    FILTERS = EMPTY_FILTERS();
    saveFilters();
    renderFilterPanel();
    renderPipeline();
  }
});

let detailId = null;

$("#add-manual").addEventListener("click", () => {
  const deal = {
    id: "d" + Date.now(),
    address: "New property — edit me", borough: "", block: "", lot: "",
    owner: "", ownerAddress: "", phone: "", email: "",
    stage: "New lead", notes: "", nextAction: "", nextDate: defaultNextDate(),
    activity: [{ date: today(), text: "Added manually" }],
  };
  store.deals.unshift(deal);
  save();
  detailId = deal.id;
  renderPipeline();
});

function renderPipeline() {
  const home = $("#pipeline-home");
  const detail = $("#pipeline-detail");
  const d = detailId && store.deals.find((x) => x.id === detailId);

  if (d) {
    home.classList.add("hidden");
    detail.classList.remove("hidden");
    detail.innerHTML = detailView(d);
    detail.dataset.id = d.id;
    return;
  }
  detailId = null;
  home.classList.remove("hidden");
  detail.classList.add("hidden");
  detail.innerHTML = "";

  const stageVal = stageFilter.value;
  let deals = store.deals.filter((x) => !stageVal || x.stage === stageVal);

  const nActive = activeFilterCount();
  const toggle = $("#filter-toggle");
  toggle.textContent = nActive ? `⚲ Filters (${nActive})` : "⚲ Filters";
  toggle.classList.toggle("filters-on", nActive > 0);

  let missing = 0;
  if (nActive) {
    const judged = deals.map((d) => [d, dealFilterResult(d)]);
    missing = judged.filter(([, r]) => r === "missing").length;
    deals = judged.filter(([, r]) => r === "match").map(([d]) => d);
  }

  const note = $("#filter-note");
  if (missing) {
    note.textContent = `${missing} propert${missing === 1 ? "y is" : "ies are"} hidden because city data is missing — open ${missing === 1 ? "it" : "them"} and tap “Refresh city data”.`;
    note.classList.remove("hidden");
  } else {
    note.classList.add("hidden");
  }

  $("#pipeline-list").innerHTML = deals.length
    ? deals.map(propRow).join("")
    : `<p class="empty-note" style="padding:16px">${nActive ? "No properties match these filters." : "No properties here yet. Find one in Research, or add one manually."}</p>`;
}

function propRow(d) {
  const s = d.score?.value;
  return `<button class="prop-row" data-id="${esc(d.id)}" data-stage="${esc(d.stage)}">
    <span class="pr-score s${s || 0}" title="Seller likelihood (from debt history)">${s || "–"}</span>
    <span class="pr-main">
      <b>${esc(d.address)}</b>
      <span class="pr-sub">${esc(d.owner || "Owner unknown")}${hoodOf(d) ? ` · ${esc(hoodOf(d))}` : ""}${d.sample ? " · sample" : ""}</span>
    </span>
    <span class="pr-stage">${esc(d.stage)}</span>
    <span class="pr-due">${d.nextDate ? esc(fmtShort(d.nextDate)) : ""}</span>
    <span class="pr-chev">›</span>
  </button>`;
}

function factRow(label, value) {
  return `<div class="fact"><span>${label}</span><b>${value || "—"}</b></div>`;
}

function detailView(d) {
  const f = d.facts || {};
  const s = d.score;
  const scoreHtml = s
    ? `<div class="score-line">
         <span class="score-big">${s.value}<em>/5</em></span>
         <span class="score-driver">${DRIVER_TEXT[s.driver] || ""}</span>
       </div>
       <ul class="score-reasons">${s.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
    : `<p class="empty-note">No debt history pulled yet — hit “Refresh city data” and the score will appear.</p>`;

  return `
  <button class="btn ghost small" id="detail-back">← All properties</button>

  <div class="card detail-head">
    <div class="deal-head">
      <div>
        <div class="deal-addr" contenteditable="true" data-field="address">${esc(d.address)}</div>
        <div class="deal-meta">${esc([d.borough, d.block && `Block ${d.block}`, d.lot && `Lot ${d.lot}`].filter(Boolean).join(" · ") || "Location details not set")}
          ${d.sample ? ` <span class="sample-tag">Sample</span>` : ""}</div>
      </div>
      <select class="stage-select" data-field="stage">
        ${STAGES.map((x) => `<option ${x === d.stage ? "selected" : ""}>${x}</option>`).join("")}
      </select>
    </div>
  </div>

  <div class="detail-grid">
    <div class="card score-card">
      <h2 class="card-title">Seller likelihood</h2>
      ${scoreHtml}
      <p class="disclaimer">Read from public debt records only — a hint about who may be more open to a conversation, <b>not</b> a guarantee anyone wants to sell.</p>
    </div>

    <div class="card">
      <div class="facts-head">
        <h2 class="card-title">Property facts</h2>
        <button class="btn ghost small" id="refresh-data">↻ Refresh city data</button>
      </div>
      <div class="facts-grid">
        ${factRow("Property type", esc(f.propertyType))}
        ${factRow("Building class", esc(f.bldgClass))}
        ${factRow("Zoning", esc(f.zoning))}
        ${factRow("Tax class", esc(f.taxClass))}
        ${factRow("Units", esc(f.unitsRes && f.unitsTotal ? `${f.unitsRes} res / ${f.unitsTotal} total` : f.unitsTotal))}
        ${factRow("Floors", esc(fmtNum(f.floors)))}
        ${factRow("Year built", esc(f.yearBuilt))}
        ${factRow("Lot size", f.lotSqft ? esc(fmtNum(f.lotSqft)) + " sq ft" : "")}
        ${factRow("Building size", f.bldgSqft ? esc(fmtNum(f.bldgSqft)) + " sq ft" : "")}
        ${factRow("Assessed value", esc(fmtMoney(f.assessed)))}
      </div>
      <p class="fine-print">${f.fetchedAt ? `From NYC city records (PLUTO &amp; Dept. of Finance) · updated ${fmtDate(f.fetchedAt)}` : "Nothing pulled yet — “Refresh city data” fills this in from NYC's databases."}</p>
    </div>
  </div>

  <div class="card">
    <div class="facts-head">
      <h2 class="card-title">Owner &amp; contact</h2>
      <span class="owner-actions">
        ${d.phone ? `<a class="btn primary small" href="tel:${esc(d.phone.replace(/[^\d+]/g, ""))}">📞 Call</a>` : ""}
        ${d.email ? `<a class="btn primary small" href="mailto:${esc(d.email.trim())}">✉ Email</a>` : ""}
      </span>
    </div>
    <div class="deal-body">
      <label class="field"><span>Owner</span><input data-field="owner" value="${esc(d.owner)}" placeholder="Owner or LLC name"></label>
      <label class="field"><span>Owner mailing address</span><input data-field="ownerAddress" value="${esc(d.ownerAddress)}" placeholder="From the deed/mortgage"></label>
      <label class="field"><span>Phone</span><input data-field="phone" value="${esc(d.phone || "")}" placeholder="(___) ___-____"></label>
      <label class="field"><span>Email</span><input data-field="email" value="${esc(d.email || "")}" placeholder="name@example.com"></label>
    </div>
  </div>

  ${(d.entity || looksLikeEntity(d.owner)) ? `<div class="card">
    <h2 class="card-title">LLC / entity trace</h2>
    <div class="entity-detail">${d.entity ? entityHtml(d.entity) : `<p class="empty-note">Hit “↻ Refresh city data” above and Groundwork will check the NY State business registry for this owner.</p>`}</div>
    <p class="fine-print">Looked up automatically in the NY Department of State business registry${d.entity?.fetchedAt ? ` · updated ${fmtDate(d.entity.fetchedAt)}` : ""}.</p>
  </div>` : ""}

  <div class="card">
    <h2 class="card-title">Plan</h2>
    <div class="deal-body">
      <label class="field" style="grid-column:1/-1"><span>Notes</span><textarea data-field="notes" placeholder="Debt history, condition, motivation…">${esc(d.notes)}</textarea></label>
      <label class="field"><span>Next action</span><input data-field="nextAction" value="${esc(d.nextAction)}" placeholder="e.g. Send letter"></label>
      <label class="field"><span>Follow-up date</span><input type="date" data-field="nextDate" value="${esc(d.nextDate)}"></label>
    </div>
  </div>

  <div class="card">
    <h2 class="card-title">Activity</h2>
    <div class="log-list">
      ${(d.activity || []).slice(-8).reverse().map((a) =>
        `<div class="row-item"><span>${esc(a.text)}</span><span class="when">${fmtDate(a.date)}</span></div>`).join("") || `<p class="empty-note">Nothing logged yet.</p>`}
    </div>
    <div class="log-input">
      <input placeholder="Log a call, letter, or reply…" class="log-text">
      <button class="btn ghost small log-add">Log it</button>
    </div>
    <div class="deal-foot">
      <span class="spacer"></span>
      <button class="btn ghost small deal-delete">Remove property</button>
    </div>
  </div>`;
}

/* pipeline events */
$("#pipeline-list").addEventListener("click", (e) => {
  const row = e.target.closest(".prop-row");
  if (!row) return;
  detailId = row.dataset.id;
  renderPipeline();
  window.scrollTo({ top: 0 });
});

const detailEl = $("#pipeline-detail");
detailEl.addEventListener("change", onDealEdit);
detailEl.addEventListener("focusout", onDealEdit);
detailEl.addEventListener("click", async (e) => {
  const d = store.deals.find((x) => x.id === detailEl.dataset.id);

  if (e.target.closest("#detail-back")) {
    detailId = null;
    renderPipeline();
    return;
  }
  if (!d) return;

  if (e.target.closest("#refresh-data")) {
    const btn = e.target.closest("#refresh-data");
    btn.disabled = true;
    btn.textContent = "Pulling city records…";
    try {
      await refreshDeal(d);
      renderPipeline();
      toast("City data & score updated");
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "↻ Refresh city data";
      toast(`Couldn't refresh: ${err.message}`);
    }
    return;
  }
  if (e.target.closest(".log-add")) {
    const input = $(".log-text", detailEl);
    const text = input.value.trim();
    if (!text) return;
    (d.activity ||= []).push({ date: today(), text });
    delete d.sample;
    save();
    renderPipeline();
    toast("Logged");
    return;
  }
  if (e.target.closest(".deal-delete")) {
    if (!confirm(`Remove ${d.address} from your pipeline?`)) return;
    store.deals = store.deals.filter((x) => x.id !== d.id);
    detailId = null;
    save();
    renderAll();
    toast("Removed");
  }
});

function onDealEdit(e) {
  const el = e.target.closest("[data-field]");
  if (!el) return;
  const wrap = el.closest("[data-id]");
  if (!wrap) return;
  const d = store.deals.find((x) => x.id === wrap.dataset.id);
  if (!d) return;
  const val = el.matches("[contenteditable]") ? el.textContent.trim() : el.value;
  if (d[el.dataset.field] === val) return;
  const field = el.dataset.field;
  d[field] = val;
  delete d.sample;
  if (field === "stage") {
    (d.activity ||= []).push({ date: today(), text: `Moved to “${val}”` });
  }
  save();
  // refresh Call/Email buttons when contact info changes
  if ((field === "phone" || field === "email") && e.type === "change") renderPipeline();
}

/* ---------- settings ---------- */
const SETTINGS_KEY = "offbook.settings.v1";
const DEFAULT_SETTINGS = { borough: "", followupDays: "" };
let SETTINGS = { ...DEFAULT_SETTINGS };
try {
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  if (s) SETTINGS = { ...DEFAULT_SETTINGS, ...s };
} catch (e) { /* ignore */ }
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS)); }

function defaultNextDate() {
  const n = Number(SETTINGS.followupDays);
  return SETTINGS.followupDays !== "" && !isNaN(n) ? addDays(n) : "";
}

// apply default borough to the search form
if (SETTINGS.borough && $("#f-borough")) $("#f-borough").value = SETTINGS.borough;

function bytesLabel(n) {
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function renderSettings() {
  $("#set-borough").value = SETTINGS.borough;
  $("#set-followup").value = SETTINGS.followupDays;

  const raw = localStorage.getItem(STORE_KEY) || "";
  const bytes = new Blob([raw]).size;
  const total = store.deals.length;
  const samples = store.deals.filter((d) => d.sample).length;
  $("#storage-info").innerHTML = `
    <div class="fact"><span>Properties saved</span><b>${total}${samples ? ` (${samples} sample)` : ""}</b></div>
    <div class="fact"><span>Space used</span><b>${bytesLabel(bytes)}</b></div>
    <p class="fine-print" style="grid-column:1/-1;margin-top:6px">Everything is stored privately in this browser on this device — nothing is uploaded to any server. Clearing your browser's site data would erase it, so keep a backup.</p>`;
}

$("#set-borough").addEventListener("change", (e) => {
  SETTINGS.borough = e.target.value;
  saveSettings();
  if ($("#f-borough")) $("#f-borough").value = SETTINGS.borough;
  toast("Default borough saved");
});
$("#set-followup").addEventListener("change", (e) => {
  SETTINGS.followupDays = e.target.value.trim();
  saveSettings();
  toast("Follow-up default saved");
});

$("#set-backup").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `groundwork-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Backup downloaded");
});

$("#set-restore").addEventListener("click", () => $("#restore-file").click());
$("#restore-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.deals)) throw new Error("not a Groundwork backup");
      if (!confirm(`Restore ${data.deals.length} propert${data.deals.length === 1 ? "y" : "ies"} from this backup? This replaces your current pipeline.`)) return;
      store = data;
      save();
      renderAll();
      renderSettings();
      toast("Backup restored");
    } catch (err) {
      toast(`Couldn't read that file — ${err.message}`);
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

$("#set-csv").addEventListener("click", () => {
  const cols = [
    ["Address", (d) => d.address], ["Borough", (d) => d.borough],
    ["Block", (d) => d.block], ["Lot", (d) => d.lot],
    ["Neighborhood", (d) => hoodOf(d)], ["Owner", (d) => d.owner],
    ["Owner mailing address", (d) => d.ownerAddress], ["Phone", (d) => d.phone],
    ["Email", (d) => d.email], ["Stage", (d) => d.stage],
    ["Seller score", (d) => d.score?.value || ""], ["Property type", (d) => typeOfDeal(d)],
    ["Zoning", (d) => d.facts?.zoning], ["Building class", (d) => d.facts?.bldgClass],
    ["Tax class", (d) => d.facts?.taxClass], ["Units", (d) => d.facts?.unitsTotal],
    ["Year built", (d) => d.facts?.yearBuilt], ["Building sqft", (d) => d.facts?.bldgSqft],
    ["Lot sqft", (d) => d.facts?.lotSqft], ["Assessed value", (d) => d.facts?.assessed],
    ["Entity type", (d) => d.entity?.entityType], ["Entity service address", (d) => d.entity?.processAddr],
    ["Next action", (d) => d.nextAction], ["Follow-up date", (d) => d.nextDate],
    ["Notes", (d) => d.notes],
  ];
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [cols.map((c) => cell(c[0])).join(",")];
  for (const d of store.deals) rows.push(cols.map((c) => cell(c[1](d))).join(","));
  const blob = new Blob(["﻿" + rows.join("\r\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `groundwork-pipeline-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Spreadsheet exported");
});

$("#set-clear-samples").addEventListener("click", () => {
  const n = store.deals.filter((d) => d.sample).length;
  if (!n) { toast("No sample properties to remove"); return; }
  if (!confirm(`Remove the ${n} sample propert${n === 1 ? "y" : "ies"}? Your own properties are untouched.`)) return;
  store.deals = store.deals.filter((d) => !d.sample);
  save();
  renderAll();
  renderSettings();
  toast("Sample properties removed");
});

$("#set-clear-all").addEventListener("click", () => {
  if (!confirm("Delete your ENTIRE pipeline and start fresh? This cannot be undone.")) return;
  if (!confirm("Are you sure? Everything will be permanently erased.")) return;
  store = { deals: [] };
  save();
  detailId = null;
  renderAll();
  renderSettings();
  toast("All data deleted");
});

/* ---------- boot ---------- */
function renderAll() {
  renderDashboard();
  renderPipeline();
  if ($("#panel-settings").classList.contains("active")) renderSettings();
}
renderSettings();
renderAll();
