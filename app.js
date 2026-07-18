/* ================= Offbook NYC — app logic ================= */

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

function fmtMoney(v) {
  const n = Number(v);
  if (!n) return "";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function fmtDate(v) {
  if (!v) return "date unknown";
  const d = new Date(v);
  return isNaN(d) ? "date unknown" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function today() { return new Date().toISOString().slice(0, 10); }

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
  },
  {
    id: "sample-3", sample: true,
    address: "212 East 118th Street", borough: "Manhattan", block: "1645", lot: "40",
    owner: "BRIDGE POINT HOLDINGS LLC", ownerAddress: "c/o agent, 1 Liberty Plaza",
    phone: "", email: "info@bridgepoint-example.com", stage: "Researching",
    notes: "Lis pendens filed in March — pre-foreclosure. Two mortgages on record totaling ~$1.4M. Need to find the principal behind the LLC.",
    nextAction: "Check NY State registry for LLC agent", nextDate: today(),
    activity: [{ date: addDays(-2), text: "Spotted lis pendens in ACRIS search" }],
  },
];

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

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

/* ---------- tabs ---------- */
$("#tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  $$(".tab").forEach((t) => t.classList.toggle("active", t === btn));
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === btn.dataset.panel));
  renderAll();
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

/* ---------- ACRIS research ---------- */
const ACRIS = {
  legals: "https://data.cityofnewyork.us/resource/8h5j-fqxa.json",
  master: "https://data.cityofnewyork.us/resource/bnx9-e6tj.json",
  parties: "https://data.cityofnewyork.us/resource/636b-3b5g.json",
};

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

    // group by property (borough-block-lot)
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

  // likely current owner = party 2 on most recent deed
  const lastDeed = docs.find((d) => ["DEED", "DEEDO"].includes(d.m.doc_type));
  const ownerNames = lastDeed
    ? lastDeed.pts.filter((x) => x.party_type === "2").map((x) => x.name).join(", ")
    : "";
  const ownerAddr = lastDeed
    ? (lastDeed.pts.find((x) => x.party_type === "2" && x.address_1)
        ? [lastDeed.pts.find((x) => x.party_type === "2" && x.address_1).address_1,
           lastDeed.pts.find((x) => x.party_type === "2" && x.address_1).city].filter(Boolean).join(", ")
        : "")
    : "";

  const address = [...p.addresses][0] || `Block ${p.block}, Lot ${p.lot}`;
  const payload = esc(JSON.stringify({
    address, borough: BOROUGHS[p.borough] || p.borough, block: p.block, lot: p.lot,
    owner: ownerNames, ownerAddress: ownerAddr,
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
  store.deals.unshift({
    id: "d" + Date.now(), ...data,
    phone: "", email: "", stage: "New lead", notes: "", nextAction: "", nextDate: "",
    activity: [{ date: today(), text: "Added from ACRIS research" }],
  });
  save();
  toast(`${data.address} added to pipeline`);
  renderAll();
});

/* ---------- pipeline ---------- */
const stageFilter = $("#stage-filter");
STAGES.forEach((s) => stageFilter.insertAdjacentHTML("beforeend", `<option>${s}</option>`));
stageFilter.addEventListener("change", renderPipeline);

$("#add-manual").addEventListener("click", () => {
  store.deals.unshift({
    id: "d" + Date.now(),
    address: "New property — edit me", borough: "", block: "", lot: "",
    owner: "", ownerAddress: "", phone: "", email: "",
    stage: "New lead", notes: "", nextAction: "", nextDate: "",
    activity: [{ date: today(), text: "Added manually" }],
  });
  save();
  renderPipeline();
});

function renderPipeline() {
  const filter = stageFilter.value;
  const deals = store.deals.filter((d) => !filter || d.stage === filter);
  $("#pipeline-list").innerHTML = deals.length ? deals.map(dealCard).join("")
    : `<p class="empty-note">No properties here yet. Find one in Research, or add one manually.</p>`;
}

function dealCard(d) {
  return `<div class="card deal" data-stage="${esc(d.stage)}" data-id="${esc(d.id)}">
    <div class="deal-head">
      <div>
        <div class="deal-addr" contenteditable="true" data-field="address">${esc(d.address)}</div>
        <div class="deal-meta">${esc([d.borough, d.block && `Block ${d.block}`, d.lot && `Lot ${d.lot}`].filter(Boolean).join(" · ") || "Location details not set")}
          ${d.sample ? ` <span class="sample-tag">Sample</span>` : ""}</div>
      </div>
      <select class="stage-select" data-field="stage">
        ${STAGES.map((s) => `<option ${s === d.stage ? "selected" : ""}>${s}</option>`).join("")}
      </select>
    </div>
    <div class="deal-body">
      <label class="field"><span>Owner</span><input data-field="owner" value="${esc(d.owner)}" placeholder="Owner or LLC name"></label>
      <label class="field"><span>Owner mailing address</span><input data-field="ownerAddress" value="${esc(d.ownerAddress)}" placeholder="From the deed/mortgage"></label>
      <label class="field" style="grid-column:1/-1"><span>Notes</span><textarea data-field="notes" placeholder="Debt history, condition, motivation…">${esc(d.notes)}</textarea></label>
      <label class="field"><span>Next action</span><input data-field="nextAction" value="${esc(d.nextAction)}" placeholder="e.g. Send letter"></label>
      <label class="field"><span>Follow-up date</span><input type="date" data-field="nextDate" value="${esc(d.nextDate)}"></label>
    </div>
    <div class="deal-foot">
      <span class="spacer"></span>
      <button class="btn ghost small deal-delete">Remove</button>
    </div>
  </div>`;
}

$("#pipeline-list").addEventListener("change", onDealEdit);
$("#pipeline-list").addEventListener("focusout", onDealEdit);
$("#pipeline-list").addEventListener("click", (e) => {
  const del = e.target.closest(".deal-delete");
  if (!del) return;
  const card = del.closest(".deal");
  const d = store.deals.find((x) => x.id === card.dataset.id);
  if (!confirm(`Remove ${d.address} from your pipeline?`)) return;
  store.deals = store.deals.filter((x) => x.id !== d.id);
  save();
  renderAll();
  toast("Removed");
});

function onDealEdit(e) {
  const el = e.target.closest("[data-field]");
  if (!el) return;
  const card = el.closest(".deal, .owner-card");
  if (!card) return;
  const d = store.deals.find((x) => x.id === card.dataset.id);
  if (!d) return;
  const val = el.matches("[contenteditable]") ? el.textContent.trim() : el.value;
  if (d[el.dataset.field] === val) return;
  const field = el.dataset.field;
  d[field] = val;
  delete d.sample;
  if (field === "stage") {
    (d.activity ||= []).push({ date: today(), text: `Moved to “${val}”` });
    card.dataset.stage = val;
  }
  save();
  // refresh Call/Email buttons when contact info changes on the Owners tab
  if ((field === "phone" || field === "email") && e.type === "change" && card.classList.contains("owner-card")) {
    renderOwners();
  }
}

/* ---------- owners ---------- */
function renderOwners() {
  const deals = store.deals.filter((d) => d.stage !== "Dead");
  $("#owners-list").innerHTML = deals.length ? deals.map((d) => `
    <div class="card owner-card" data-id="${esc(d.id)}">
      <div class="deal-head">
        <div>
          <div class="deal-addr">${esc(d.owner || "Owner unknown")}</div>
          <div class="deal-meta">${esc(d.address)} · ${esc(d.stage)}</div>
        </div>
        <div class="owner-actions">
          ${d.phone ? `<a class="btn primary small" href="tel:${esc(d.phone.replace(/[^\d+]/g, ""))}">📞 Call</a>` : ""}
          ${d.email ? `<a class="btn primary small" href="mailto:${esc(d.email.trim())}">✉ Email</a>` : ""}
        </div>
      </div>
      <div class="deal-body">
        <label class="field"><span>Phone</span><input data-field="phone" value="${esc(d.phone || "")}" placeholder="(___) ___-____"></label>
        <label class="field"><span>Email</span><input data-field="email" value="${esc(d.email || "")}" placeholder="name@example.com"></label>
        <label class="field"><span>Mailing address</span><input data-field="ownerAddress" value="${esc(d.ownerAddress || "")}"></label>
      </div>
      <div class="log-list">
        ${(d.activity || []).slice(-4).reverse().map((a) =>
          `<div class="row-item"><span>${esc(a.text)}</span><span class="when">${fmtDate(a.date)}</span></div>`).join("")}
      </div>
      <div class="log-input">
        <input placeholder="Log a call, letter, or reply…" class="log-text">
        <button class="btn ghost small log-add">Log it</button>
      </div>
    </div>`).join("")
    : `<p class="empty-note">Owners appear here once properties are in your pipeline.</p>`;
}

$("#owners-list").addEventListener("change", onDealEdit);
$("#owners-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".log-add");
  if (!btn) return;
  const card = btn.closest(".owner-card");
  const input = $(".log-text", card);
  const text = input.value.trim();
  if (!text) return;
  const d = store.deals.find((x) => x.id === card.dataset.id);
  (d.activity ||= []).push({ date: today(), text });
  delete d.sample;
  save();
  renderOwners();
  toast("Logged");
});

/* ---------- boot ---------- */
function renderAll() {
  renderDashboard();
  renderPipeline();
  renderOwners();
}
renderAll();
