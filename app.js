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
    facts: { propertyType: "Walk-up apartment building", bldgClass: "C0", zoning: "R6B", taxClass: "2A", unitsRes: "3", unitsTotal: "3", floors: "3", yearBuilt: "1931", lotSqft: "2000", bldgSqft: "3600", assessed: "1080000", fetchedAt: addDays(-9) },
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
    facts: { propertyType: "Walk-up apartment building", bldgClass: "C3", zoning: "R5", taxClass: "2A", unitsRes: "6", unitsTotal: "6", floors: "3", yearBuilt: "1928", lotSqft: "2500", bldgSqft: "5400", assessed: "890000", fetchedAt: addDays(-14) },
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
    facts: { propertyType: "Walk-up apartment building", bldgClass: "C1", zoning: "R7A", taxClass: "2", unitsRes: "8", unitsTotal: "8", floors: "4", yearBuilt: "1910", lotSqft: "1700", bldgSqft: "6800", assessed: "950000", fetchedAt: addDays(-2) },
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
  if (!okCount) {
    const why = facts.reason?.message || debt.reason?.message || "unknown error";
    throw new Error(why);
  }
  delete d.sample;
  save();
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
    phone: "", email: "", stage: "New lead", notes: "", nextAction: "", nextDate: "",
    activity: [{ date: today(), text: "Added from ACRIS research" }],
    debt, score: scoreDebt(debt),
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

/* ---------- pipeline: list + detail ---------- */
const stageFilter = $("#stage-filter");
STAGES.forEach((s) => stageFilter.insertAdjacentHTML("beforeend", `<option>${s}</option>`));
stageFilter.addEventListener("change", renderPipeline);

let detailId = null;

$("#add-manual").addEventListener("click", () => {
  const deal = {
    id: "d" + Date.now(),
    address: "New property — edit me", borough: "", block: "", lot: "",
    owner: "", ownerAddress: "", phone: "", email: "",
    stage: "New lead", notes: "", nextAction: "", nextDate: "",
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

  const filter = stageFilter.value;
  const deals = store.deals.filter((x) => !filter || x.stage === filter);
  $("#pipeline-list").innerHTML = deals.length
    ? deals.map(propRow).join("")
    : `<p class="empty-note" style="padding:16px">No properties here yet. Find one in Research, or add one manually.</p>`;
}

function propRow(d) {
  const s = d.score?.value;
  return `<button class="prop-row" data-id="${esc(d.id)}" data-stage="${esc(d.stage)}">
    <span class="pr-score s${s || 0}" title="Seller likelihood (from debt history)">${s || "–"}</span>
    <span class="pr-main">
      <b>${esc(d.address)}</b>
      <span class="pr-sub">${esc(d.owner || "Owner unknown")}${d.sample ? " · sample" : ""}</span>
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

/* ---------- boot ---------- */
function renderAll() {
  renderDashboard();
  renderPipeline();
}
renderAll();
