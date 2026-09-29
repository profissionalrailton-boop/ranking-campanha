const { metaParcelinha: META_P, metaNormal: META_N, fim } = window.CAMPANHA;
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pctFmt = (v) => `${Math.floor(v * 100)}%`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (id) => document.getElementById(id);

const BOAT = `<svg class="boat" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 3 V15" stroke="#0f3a4a" stroke-width="1.3"/>
  <path d="M12.7 3.5 L19 13.5 H12.7Z" fill="#fff" stroke="#0f3a4a" stroke-width="1"/>
  <path d="M11.3 6 L6 13.5 H11.3Z" fill="#ffe39a" stroke="#0f3a4a" stroke-width="1"/>
  <path d="M3 15.5 H21 L18 20.5 H6Z" fill="#ff7b5c"/>
</svg>`;

let rows = [];
let previous = new Map(); // vendedor -> "p|n" para destacar quem acabou de vender
let firstRender = true;

// ---------- ordenação: maior valor primeiro; empate fica com quem chegou antes ----------
function sortBy(list, total, desde) {
  return [...list].sort((a, b) => {
    const diff = Number(b[total]) - Number(a[total]);
    if (diff !== 0) return diff;
    const ta = a[desde] ? Date.parse(a[desde]) : Infinity;
    const tb = b[desde] ? Date.parse(b[desde]) : Infinity;
    if (ta !== tb) return ta - tb;
    return a.vendedor.localeCompare(b.vendedor, "pt-BR");
  });
}

function renderBoard(el, list, total, desde, meta, changed) {
  const sorted = sortBy(list, total, desde);
  if (!sorted.some((r) => Number(r[total]) > 0)) {
    el.innerHTML = `<li class="empty">Nenhuma venda ainda — a maré está calma 🌊</li>`;
    return;
  }
  let pos = 0;
  el.innerHTML = sorted.map((r) => {
    const valor = Number(r[total]);
    const zero = valor <= 0;
    if (!zero) pos++;
    const pct = valor / meta;
    const w = Math.min(pct, 1) * 100;
    const done = pct >= 1;
    const cls = ["row", zero ? "zero" : pos <= 3 ? `p${pos}` : "", done ? "done" : "", changed.has(r.vendedor) ? "bump" : ""].join(" ");
    return `<li class="${cls}">
      <span class="pos">${zero ? "–" : pos}</span>
      <div class="who"><span class="name">${esc(r.vendedor)}</span><span class="team">${esc(r.equipe || "")}</span></div>
      <div class="val">${brl.format(valor)}<small>${done ? "Meta batida! 🎉" : `${pctFmt(pct)} da meta`}</small></div>
      <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(w)}">
        <div class="fill" style="width:${w}%"></div>
        ${BOAT.replace('class="boat"', `class="boat" style="left:${w}%"`)}
        <span class="island" aria-hidden="true">🏝️</span>
      </div>
    </li>`;
  }).join("");
}

function renderPasses(list) {
  const scored = list.map((r) => {
    const p = Number(r.total_parcelinha) / META_P;
    const n = Number(r.total_normal) / META_N;
    return { r, p, n, score: (Math.min(p, 1) + Math.min(n, 1)) / 2, boarded: p >= 1 && n >= 1 };
  }).sort((a, b) => b.score - a.score || a.r.vendedor.localeCompare(b.r.vendedor, "pt-BR"));

  $("passes").innerHTML = scored.map(({ r, p, n, score, boarded }) => {
    const faltaP = Math.max(META_P - Number(r.total_parcelinha), 0);
    const faltaN = Math.max(META_N - Number(r.total_normal), 0);
    return `<div class="pass ${boarded ? "boarded" : ""}">
      <div class="pass-main">
        <div class="pass-top"><span>Infinity Air</span><span>✈ Embarque</span></div>
        <p class="pass-name">${esc(r.vendedor)}</p>
        <span class="pass-team">${esc(r.equipe || "")}</span>
        <div class="leg">
          <div class="leg-line"><span>Parcelinha</span><span class="${faltaP ? "" : "ok"}">${faltaP ? `faltam ${brl.format(faltaP)}` : "completa ✓"}</span></div>
          <div class="mini"><div style="width:${Math.min(p, 1) * 100}%"></div></div>
        </div>
        <div class="leg">
          <div class="leg-line"><span>Normal</span><span class="${faltaN ? "" : "ok"}">${faltaN ? `faltam ${brl.format(faltaN)}` : "completa ✓"}</span></div>
          <div class="mini norm"><div style="width:${Math.min(n, 1) * 100}%"></div></div>
        </div>
      </div>
      <div class="pass-stub">
        <span class="plane" aria-hidden="true">${boarded ? "🏖️" : "✈️"}</span>
        <span class="pass-pct">${boarded ? "OK" : pctFmt(score)}</span>
        <small>${boarded ? "Embarque liberado" : "do caminho"}</small>
      </div>
    </div>`;
  }).join("");
}

function renderSummary(list) {
  const sp = list.reduce((s, r) => s + Number(r.total_parcelinha), 0);
  const sn = list.reduce((s, r) => s + Number(r.total_normal), 0);
  const qp = list.reduce((s, r) => s + r.qtd_parcelinha, 0);
  const qn = list.reduce((s, r) => s + r.qtd_normal, 0);
  const viagens = list.filter((r) => Number(r.total_parcelinha) >= META_P && Number(r.total_normal) >= META_N).length;
  $("sum-parcelinha").textContent = brl.format(sp);
  $("sum-parcelinha-sub").textContent = `${qp} venda${qp === 1 ? "" : "s"}`;
  $("sum-normal").textContent = brl.format(sn);
  $("sum-normal-sub").textContent = `${qn} venda${qn === 1 ? "" : "s"}`;
  $("sum-viagens").textContent = viagens;
  $("sum-viagens-sub").textContent = viagens ? `de ${list.length} vendedores 🏖️` : `ninguém embarcou ainda — bora!`;
}

function relTime(iso) {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d === 1 ? "" : "s"}`;
}

function renderTicker(list, flash) {
  const last = list.filter((r) => r.ultima_venda_em).sort((a, b) => Date.parse(b.ultima_venda_em) - Date.parse(a.ultima_venda_em))[0];
  const el = $("ticker");
  if (!last) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `🌊 Última venda: <b>+${brl.format(Number(last.ultima_venda_valor))}</b> em ${last.ultima_venda_parcelinha ? "Parcelinha" : "venda normal"} · ${esc(last.vendedor)} <span class="when">· ${relTime(last.ultima_venda_em)}</span>`;
  if (flash) { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
}

function render() {
  const changed = new Set();
  const next = new Map();
  for (const r of rows) {
    const key = `${r.total_parcelinha}|${r.total_normal}`;
    next.set(r.vendedor, key);
    if (!firstRender && previous.get(r.vendedor) !== key) changed.add(r.vendedor);
  }
  previous = next;

  renderSummary(rows);
  renderBoard($("rank-parcelinha"), rows, "total_parcelinha", "parcelinha_desde", META_P, changed);
  renderBoard($("rank-normal"), rows, "total_normal", "normal_desde", META_N, changed);
  renderPasses(rows);
  renderTicker(rows, changed.size > 0);
  $("updated").textContent = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  firstRender = false;
}

async function load() {
  const { data, error } = await sb.from("campanha_ranking").select("*");
  if (error) {
    console.error(error);
    setLive(false, "sem conexão");
    return;
  }
  rows = data || [];
  render();
}

let pending;
function scheduleLoad() {
  clearTimeout(pending);
  pending = setTimeout(load, 400);
}

function setLive(on, text) {
  const el = $("live");
  el.classList.toggle("on", on);
  el.classList.toggle("off", !on);
  el.querySelector("span").textContent = text;
}

function updateCountdown() {
  const ms = Date.parse(fim) - Date.now();
  const el = $("countdown");
  if (ms <= 0) { el.textContent = "🏁 Campanha encerrada"; return; }
  const dias = Math.ceil(ms / 86400000);
  el.textContent = `⏳ faltam ${dias} dia${dias === 1 ? "" : "s"}`;
}

// ---------- tempo real, com consulta periódica de reserva ----------
sb.channel("campanha-ranking")
  .on("postgres_changes", { event: "*", schema: "public", table: "campanha_ranking" }, scheduleLoad)
  .subscribe((status) => {
    if (status === "SUBSCRIBED") setLive(true, "ao vivo");
    else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setLive(false, "reconectando…");
  });

setInterval(load, 60000);
setInterval(() => { updateCountdown(); renderTicker(rows, false); }, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });

updateCountdown();
load();
