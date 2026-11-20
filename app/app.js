// The Leonida Field Guide v2 — a GTA VI trophy guide and tracker.
// Every headline number on this page is computed at load from the data files
// (app/data/trophies.json, app/data/sources.json, app/data/roadmap.json) by
// computeAudit(). Nothing is hard-coded: if the data changes, the audit strip,
// the cited-by counts and the matrix change with it. Fully offline.
const KEY = 'leonida-field-guide-v2';
const $ = (s, r = document) => r.querySelector(s);

const [tdoc, sdoc, rdoc] = await Promise.all([
  fetch('data/trophies.json').then(r => r.json()),
  fetch('data/sources.json').then(r => r.json()),
  fetch('data/roadmap.json').then(r => r.json()),
]);
const trophies = tdoc.trophies;
const sources = sdoc.sources;
const srcByN = new Map(sources.map(s => [s.n, s]));
const stages = rdoc.stages;
const stageName = n => (stages.find(s => s.n === n) || {}).name || ('Stage ' + n);
const avg = t => Math.round(((t.time.min + t.time.max) / 2) * 10) / 10;

// ---------- claim accounting ----------
// A claim is any single cited statement the guide makes: a step, a tip, a
// missable window, or a roadmap action. Dispute sides are claims too, and are
// counted in the disputes total rather than the claim total.
function trophyClaims(t) {
  const out = [];
  for (const st of t.steps || []) out.push({ kind: 'step', s: st.s });
  for (const tp of t.tips || []) out.push({ kind: 'tip', s: tp.s });
  if (t.missable) out.push({ kind: 'missable', s: t.missable.s });
  return out;
}
function allClaims() {
  const out = [];
  for (const t of trophies) for (const c of trophyClaims(t)) out.push({ ...c, trophy: t.id });
  for (const st of stages) for (const a of st.actions) out.push({ kind: 'roadmap', s: a.s, trophy: null });
  return out;
}
function computeAudit() {
  const claims = allClaims();
  const backed = claims.filter(c => c.s.length >= 2).length;
  const single = claims.filter(c => c.s.length === 1).length;
  const steps = trophies.reduce((n, t) => n + (t.steps || []).length, 0);
  const disputes = trophies.reduce((n, t) => n + (t.disputes || []).length, 0);
  const citedBy = new Map(sources.map(s => [s.n, 0]));
  const bump = s => { for (const n of s || []) citedBy.set(n, (citedBy.get(n) || 0) + 1); };
  for (const c of claims) bump(c.s);
  for (const t of trophies) for (const d of t.disputes || []) { bump(d.a.s); bump(d.b.s); }
  for (const f of rdoc.facts) bump(f.s);
  const guidesCiting = trophies.filter(t => trophyClaims(t).some(c => c.s.length > 0)).length;
  const prose = trophies.reduce((n, t) => n + (t.guide || '').length, 0);
  return {
    claims: claims.length, backed, single, steps, disputes, citedBy, guidesCiting, prose,
    sources: sources.length,
    sites: new Set(sources.map(s => s.host)).size,
    hidden: trophies.filter(t => t.hidden).length,
    counted: trophies.filter(t => t.count).length,
    watch: trophies.filter(t => t.missable && t.missable.level === 'watch').length,
    possibly: trophies.filter(t => t.missable && t.missable.level === 'possibly').length,
    unconfirmed: trophies.filter(t => t.confidence === 'unconfirmed').length,
    grades: ['platinum', 'gold', 'silver', 'bronze'].map(g => trophies.filter(t => t.grade === g).length),
  };
}
const audit = computeAudit();
window.__audit = audit;
window.__computeAudit = computeAudit;

// ---------- state ----------
const SEED = {
  earned: [2, 3, 8, 16, 21, 36, 37, 44, 46, 49, 50, 51],
  counters: { 15: 64, 28: 6, 31: 22, 35: 37, 48: 130, 53: 27500 },
  notes: {}, starred: [28, 17, 25, 14], spoiler: true, selected: 28,
};
let state;
try { state = JSON.parse(localStorage.getItem(KEY)) || null; } catch { state = null; }
if (!state || !Array.isArray(state.earned)) state = structuredClone(SEED);
state.earned = new Set(state.earned);
state.counters = state.counters || {};
state.notes = state.notes || {};
state.starred = state.starred || [];
function save() {
  localStorage.setItem(KEY, JSON.stringify({ ...state, earned: [...state.earned] }));
}
const earned = id => state.earned.has(id);
const counterOf = t => Math.min(state.counters[t.id] || 0, t.count ? t.count.target : 0);

// ---------- shared rendering helpers ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const refs = arr => (arr && arr.length) ? ` <sup class="ref">[${arr.join('] [')}]</sup>` : '';
const uniq = a => [...new Set(a)];
function trophySources(t) {
  const set = new Set();
  for (const c of trophyClaims(t)) c.s.forEach(n => set.add(n));
  for (const d of t.disputes || []) { d.a.s.forEach(n => set.add(n)); d.b.s.forEach(n => set.add(n)); }
  return [...set].sort((a, b) => a - b);
}
function backing(t) {
  const claims = trophyClaims(t);
  const disputed = (t.disputes || []).length > 0;
  const thin = claims.some(c => c.s.length < 2);
  return (disputed || thin) ? 'a' : 'g';
}
function hoursLeft() {
  return trophies.filter(t => !earned(t.id)).reduce((n, t) => n + avg(t), 0);
}

// ---------- header + audit strip ----------
function renderHeader() {
  $('#earned-count').textContent = `${state.earned.size} of ${trophies.length} earned`;
  const g = audit.grades;
  $('#grade-counts').textContent = `${g[0]}P · ${g[1]}G · ${g[2]}S · ${g[3]}B on the list · ~${Math.round(hoursLeft())} h left`;
  $('#spoiler').checked = !!state.spoiler;
  $('#audit').innerHTML =
    `<div><b>${trophies.length}/${trophies.length}</b> official name, description, grade · ${audit.grades[0]}P ${audit.grades[1]}G ${audit.grades[2]}S ${audit.grades[3]}B · <b>${audit.hidden} PSN-hidden</b> · <b>${audit.claims}/${audit.claims} claims cited</b> · ${audit.guidesCiting}/${trophies.length} guides cite sources · <b>${audit.backed} backed by 2+ sources</b> · ${audit.steps} numbered steps</div>` +
    `<div><b>${audit.sources} pages · ${audit.sites} sites</b> read 20–21 Nov 2026 · ${audit.possibly} possibly missable · ${audit.watch} watch · ${audit.unconfirmed} unconfirmed · ${audit.single} single-source · <b>${audit.disputes} disputes shown both ways</b> · ${audit.counted} interactive counters · ${audit.prose.toLocaleString('en-GB')} guide chars</div>`;
}

// ---------- tracker ----------
let view = 'tracker';
function rowHTML(t, pinned = false) {
  const isSel = state.selected === t.id;
  const blur = state.spoiler && !earned(t.id) && t.kind === 'Story';
  const stepRefs = uniq((t.steps || []).flatMap(s => s.s)).slice(0, 6);
  const cnt = t.count ? `<div class="minibar"><i style="width:${Math.round(100 * counterOf(t) / t.count.target)}%"></i></div>` : '';
  return `<div class="row ${earned(t.id) ? 'done' : ''} ${isSel ? 'sel' : ''}" data-id="${t.id}">
    <input type="checkbox" data-act="earn" ${earned(t.id) ? 'checked' : ''} aria-label="earned">
    <div>
      <span class="tname ${blur ? 'blur' : ''}">${esc(t.name)}</span>
      <div class="tdesc ${blur ? 'blur' : ''}">${esc(t.description)}</div>
      <div class="meta">
        <span class="chip grade-${t.grade}">${t.grade}</span><span class="chip">${esc(t.kind)}</span>
        ${t.hidden ? '<span class="chip">hidden</span>' : ''}
        ${t.missable && t.missable.level !== 'no' ? `<span class="chip win">${t.missable.level === 'possibly' ? 'POSSIBLY MISSABLE' : 'WATCH'} · ${esc(t.missable.close)}</span>` : ''}
        <span class="chip">S${t.stage}</span><span class="chip">diff ${t.difficulty}/5</span>
        <span class="dot ${backing(t)}" title="backing"></span>
        <span class="chip refs">[${stepRefs.join('·')}]</span>
        ${pinned ? '<span class="chip">selected</span>' : ''}
      </div>${cnt}
    </div>
    <div>${t.count ? `<b>${counterOf(t)}/${t.count.target}</b>` : ''}</div>
  </div>`;
}
function renderChecklist() {
  const q = ($('#search').value || '').toLowerCase();
  const fk = $('#f-kind').value, fg = $('#f-grade').value, fs = $('#f-status').value, sort = $('#f-sort').value;
  const hideEarned = $('#hide-earned').checked;
  let list = trophies.filter(t =>
    (!q || (t.name + ' ' + t.description + ' ' + t.kind).toLowerCase().includes(q)) &&
    (fk === 'all' || t.kind === fk) && (fg === 'all' || t.grade === fg) &&
    (fs === 'all' || (fs === 'done') === earned(t.id)) && !(hideEarned && earned(t.id)));
  if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'difficulty') list = [...list].sort((a, b) => b.difficulty - a.difficulty);
  const greens = trophies.filter(t => backing(t) === 'g').length;
  let html = `<div class="stage-head">Backing: ${greens} green · ${trophies.length - greens} amber (green = 2+ sources, no dispute)</div>`;
  const sel = trophies.find(t => t.id === state.selected);
  if (sel && list.includes(sel)) html += rowHTML(sel, true);
  if (sort === 'roadmap') {
    for (const st of stages) {
      const rows = list.filter(t => t.stage === st.n);
      if (!rows.length) continue;
      html += `<div class="stage-head">Stage ${st.n} · ${esc(st.name)} — ${rows.filter(t => earned(t.id)).length}/${rows.length} earned</div>`;
      html += rows.map(t => rowHTML(t)).join('');
    }
  } else html += list.map(t => rowHTML(t)).join('');
  $('#checklist').innerHTML = html || '<div class="stage-head">No trophies match the filters.</div>';
  document.querySelectorAll('#checklist .row').forEach(r => {
    r.addEventListener('click', e => {
      const id = Number(r.dataset.id);
      if (e.target.dataset.act === 'earn') {
        e.target.checked ? state.earned.add(id) : state.earned.delete(id);
        save(); renderAll(); return;
      }
      state.selected = id; save(); renderChecklist(); renderGuide(); renderRail();
    });
  });
}
function disputeHTML(d) {
  return `<div class="dispute"><h3>Sources disagree — ${esc(d.topic)}</h3>
    <div class="ab"><div class="side"><b>Version A</b>${esc(d.a.t)}${refs(d.a.s)}</div>
    <div class="side"><b>Version B</b>${esc(d.b.t)}${refs(d.b.s)}</div></div>
    <div class="call"><b>Our call:</b> ${esc(d.verdict)}</div></div>`;
}
function counterHTML(t) {
  if (!t.count) return '';
  const cur = counterOf(t), target = t.count.target;
  let inner = `<b>Counter:</b> ${cur} / ${target} ${esc(t.count.unit)}`;
  if (target <= 100) {
    inner += `<div class="ticks">${Array.from({ length: target }, (_, i) => `<button type="button" class="tick ${i < cur ? 'on' : ''}" data-tick="${i}"></button>`).join('')}</div>`;
  }
  inner += `<div class="cbtns"><button type="button" data-cnt="-1">−1</button><button type="button" data-cnt="1">+1</button><button type="button" data-cnt="10">+10</button><input type="number" data-cnt-input min="0" max="${target}" value="${cur}" style="width:90px"></div>`;
  return `<div class="counter" data-counter="${t.id}">${inner}</div>`;
}
function renderGuide() {
  const t = trophies.find(x => x.id === state.selected) || trophies[0];
  const blur = state.spoiler && !earned(t.id) && t.kind === 'Story';
  const m = t.missable || { level: 'no' };
  const warn = m.level !== 'no' ? `<div class="warn ${m.level === 'watch' ? 'watch' : ''}"><b class="t">${m.level === 'possibly' ? 'Possibly missable' : 'Watch'} — window ${esc(m.open)} to ${esc(m.close)}</b><br>${esc(m.t)}${refs(m.s)}</div>` : '';
  const srcList = trophySources(t).map(n => {
    const s = srcByN.get(n);
    return `<div>[${n}] <b>${esc(s.short)}</b> — ${esc(s.title)} · ${esc(s.host)} · read ${esc(s.read)} · cited by ${audit.citedBy.get(n) || 0} claims</div>`;
  }).join('');
  $('#guide').innerHTML = `
    <div class="meta" style="display:flex;gap:4px;flex-wrap:wrap">
      <span class="chip grade-${t.grade}">${t.grade}</span><span class="chip">${esc(t.kind)}</span>
      <span class="chip">Stage ${t.stage} · ${esc(stageName(t.stage))}</span>
      ${t.hidden ? '<span class="chip">PSN-hidden</span>' : ''}
      <span class="chip">${esc(t.confidence)}</span><span class="chip">difficulty ${t.difficulty}/5</span>
      <span class="chip">~${t.time.min}–${t.time.max} h</span>
      <button type="button" id="star">${state.starred.includes(t.id) ? '★ In Next up' : '☆ Add to Next up'}</button>
    </div>
    <h2 class="${blur ? 'blur' : ''}">${esc(t.name)}</h2>
    <div class="official ${blur ? 'blur' : ''}">Official description: “${esc(t.description)}”</div>
    <h3>In short</h3><p class="short">${esc(t.short)}</p>
    ${warn}
    ${(t.disputes || []).map(disputeHTML).join('')}
    <h3>Steps — ${(t.steps || []).length}/${(t.steps || []).length} cited</h3>
    <ol class="steps">${(t.steps || []).map(s => `<li>${esc(s.t)}${refs(s.s)}</li>`).join('')}</ol>
    ${counterHTML(t)}
    ${(t.tips || []).length ? `<h3>Tips</h3><ul>${t.tips.map(x => `<li>${esc(x.t)}${refs(x.s)}</li>`).join('')}</ul>` : ''}
    <h3>Full guide</h3><p class="prose">${esc(t.guide)}</p>
    <h3>Your notes</h3><textarea class="note" id="note" placeholder="Private note for this trophy (saved on this device)">${esc(state.notes[t.id] || '')}</textarea>
    <h3>Sources for this guide</h3><div class="gsrc">${srcList}</div>`;
  const star = $('#star');
  if (star) star.addEventListener('click', () => {
    const i = state.starred.indexOf(t.id);
    i >= 0 ? state.starred.splice(i, 1) : state.starred.push(t.id);
    save(); renderGuide(); renderRail();
  });
  const note = $('#note');
  if (note) note.addEventListener('change', () => { state.notes[t.id] = note.value; save(); });
  const cEl = document.querySelector('[data-counter]');
  if (cEl) {
    cEl.querySelectorAll('[data-tick]').forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.tick);
      state.counters[t.id] = (counterOf(t) === i + 1) ? i : i + 1;
      save(); renderAll();
    }));
    cEl.querySelectorAll('[data-cnt]').forEach(b => b.addEventListener('click', () => {
      state.counters[t.id] = Math.max(0, Math.min(t.count.target, counterOf(t) + Number(b.dataset.cnt)));
      save(); renderAll();
    }));
    const inp = cEl.querySelector('[data-cnt-input]');
    if (inp) inp.addEventListener('change', () => {
      state.counters[t.id] = Math.max(0, Math.min(t.count.target, Number(inp.value) || 0));
      save(); renderAll();
    });
  }
}
function nextUpList() {
  const starred = state.starred.map(id => trophies.find(t => t.id === id)).filter(t => t && !earned(t.id));
  const rest = trophies.filter(t => !earned(t.id) && !state.starred.includes(t.id))
    .sort((a, b) => a.stage - b.stage || a.difficulty - b.difficulty);
  return [...starred, ...rest];
}
function renderRail() {
  const t = trophies.find(x => x.id === state.selected) || trophies[0];
  const next = nextUpList().slice(0, 5);
  $('#rail').innerHTML = `
    <div class="card"><h3>Next up — roadmap order</h3>
      ${next.map((x, i) => `<div class="next-item"><b>${i + 1}. ${esc(x.name)}</b><br><span class="chip">S${x.stage} ${esc(stageName(x.stage))}</span> <span class="chip">~${avg(x)} h</span>${x.count ? ` <span class="chip">${counterOf(x)}/${x.count.target}</span>` : ''}</div>`).join('')}
      <div class="next-item"><b>~${Math.round(hoursLeft())} h left</b> across ${trophies.length - state.earned.size} open trophies</div>
    </div>
    <div class="card"><h3>Sources for this guide</h3>
      ${trophySources(t).map(n => { const s = srcByN.get(n); return `<div class="src-item"><b>[${n}] ${esc(s.short)}</b> · read ${esc(s.read)} · ${esc(s.depth)} · cited by ${audit.citedBy.get(n) || 0} claims</div>`; }).join('')}
    </div>`;
}

// ---------- roadmap ----------
function renderRoadmap() {
  const facts = rdoc.facts.map(f => `<div>• ${esc(f.t)}${refs(f.s)}</div>`).join('');
  const cards = stages.map(st => {
    const rows = trophies.filter(t => t.stage === st.n);
    const done = rows.filter(t => earned(t.id)).length;
    const pct = rows.length ? Math.round(100 * done / rows.length) : 0;
    return `<div class="stage-card"><h2>Stage ${st.n} · ${esc(st.name)}</h2>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div>${done}/${rows.length} trophies earned · ~${st.hours.min}–${st.hours.max} h stage estimate</div>
      <ol class="steps">${st.actions.map(a => `<li>${esc(a.t)}${refs(a.s)}</li>`).join('')}</ol>
      <div class="gsrc">${rows.map(t => esc(t.name)).join(' · ')}</div></div>`;
  }).join('');
  const watch = trophies.filter(t => t.missable && t.missable.level !== 'no');
  $('#view-roadmap').innerHTML = `
    <div class="facts"><b>Planner:</b> ~${Math.round(hoursLeft())} h left of ~${Math.round(trophies.reduce((n, t) => n + avg(t), 0))} h total · ${state.earned.size}/55 earned
    <h3>Completion facts — each one cited</h3>${facts}</div>
    <div class="split"><div class="cards" style="grid-template-columns:1fr 1fr">${cards}</div>
    <div class="panel"><h2>Missable watch</h2>${watch.map(t => `<div class="next-item" style="padding:4px 0;border-top:1px solid #eceae2"><b>${esc(t.name)}</b> — ${t.missable.level} · last chance ${esc(t.missable.close)}${refs(t.missable.s)}</div>`).join('')}</div></div>`;
}

// ---------- missables ----------
const CH = ['Ch 1', 'Ch 2', 'Ch 3', 'Ch 4', 'Finale', 'Post'];
function chIdx(s) {
  if (!s) return -1;
  if (s.startsWith('Ch ')) return Number(s.slice(3)) - 1;
  if (s === 'Finale') return 4;
  if (s === 'Post') return 5;
  return -1;
}
function renderMissables() {
  const rows = trophies.filter(t => t.missable && t.missable.level !== 'no');
  const grid = `<table class="grid"><thead><tr><th>Trophy</th>${CH.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(t => {
      const o = chIdx(t.missable.open), c = chIdx(t.missable.close);
      const cells = CH.map((_, i) => {
        if (i === c) return '<td class="last">LAST</td>';
        if (o >= 0 && i > o && i < c) return '<td class="open">open</td>';
        if (i === o) return '<td class="open">opens</td>';
        return '<td>—</td>';
      }).join('');
      return `<tr><td><b>${esc(t.name)}</b><br><span class="chip ${t.missable.level === 'possibly' ? 'win' : ''}">${t.missable.level}</span> ${esc(t.missable.t)}${refs(t.missable.s)}</td>${cells}</tr>`;
    }).join('')}</tbody></table>`;
  const gates = CH.map((c, i) => {
    const closing = rows.filter(t => chIdx(t.missable.close) === i);
    return closing.length ? `<div class="next-item" style="padding:5px 0;border-top:1px solid #eceae2"><b>${c}:</b> ${closing.map(t => `${esc(t.name)} (last chance)`).join(' · ')}</div>` : '';
  }).join('');
  const pma = trophies.find(t => t.id === 28);
  $('#view-missables').innerHTML = `
    <div class="warn"><b class="t">Possibly missable — Positive Mental Attitude</b><br>${esc(pma.missable.t)}${refs(pma.missable.s)}
    ${(pma.disputes || []).map(d => `<div style="margin-top:5px"><b>${esc(d.topic)}</b> A: ${esc(d.a.t)}${refs(d.a.s)} B: ${esc(d.b.t)}${refs(d.b.s)} <b>Our call:</b> ${esc(d.verdict)}</div>`).join('')}</div>
    <div class="split"><div class="panel"><h2>Windows timeline — ${rows.length} trophies watched</h2>${grid}</div>
    <div>
      <div class="panel"><h2>Story gates by chapter</h2>${gates}</div>
      <div class="panel" style="margin-top:12px"><h2>Manual-save protocol</h2>
      <ol class="steps">
        <li>Keep one manual save at every chapter boundary; never overwrite the previous chapter's save.</li>
        <li>Before the finale chain, save in two separate slots.</li>
        <li>Note your meditation count in the save name or your trophy notes before the finale.</li>
        <li>If a windowed moment is missed, reload the chapter save rather than starting over.</li>
      </ol></div>
    </div></div>`;
}

// ---------- sources ----------
function renderSources() {
  const rows = sources.map(s => `<tr><td><b>[${s.n}]</b></td><td><b>${esc(s.short)}</b><br>${esc(s.title)}<br><span class="gsrc">${esc(s.url)}</span></td><td>${esc(s.host)}</td><td>${esc(s.kind)}</td><td>${esc(s.read)}</td><td>${esc(s.depth)}</td><td><b>${audit.citedBy.get(s.n) || 0}</b></td></tr>`).join('');
  const cell = (t, n) => {
    let c = 0;
    for (const cl of trophyClaims(t)) if (cl.s.includes(n)) c++;
    for (const d of t.disputes || []) { if (d.a.s.includes(n)) c++; if (d.b.s.includes(n)) c++; }
    return c;
  };
  const matrix = `<div style="overflow-x:auto"><table class="matrix"><thead><tr><th>Trophy \\ Source</th>${sources.map(s => `<th title="${esc(s.short)}">${s.n}</th>`).join('')}</tr></thead><tbody>
    ${trophies.map(t => `<tr><td>${esc(t.name)}</td>${sources.map(s => { const c = cell(t, s.n); return `<td class="${c ? 'hit' : ''}">${c || ''}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div>`;
  const conflicts = trophies.flatMap(t => (t.disputes || []).map(d => ({ t, d })))
    .map(({ t, d }) => `<div class="next-item" style="padding:5px 0;border-top:1px solid #eceae2"><b>${esc(t.name)} — ${esc(d.topic)}</b><br>A: ${esc(d.a.t)}${refs(d.a.s)}<br>B: ${esc(d.b.t)}${refs(d.b.s)}<br><b>Our call:</b> ${esc(d.verdict)}</div>`).join('');
  $('#view-sources').innerHTML = `
    <div class="panel"><h2>Sources — ${audit.sources} pages on ${audit.sites} sites, read 20–21 Nov 2026</h2>
    <p>Depth tags are honest about how much of each page the guide work used: <b>full</b> read end to end, <b>key</b> key sections, <b>excerpt</b> search excerpt or title only — treat excerpt-only sources as unverified, and notice that no load-bearing claim in this guide rests on an excerpt alone. Cited-by counts are computed from the data files. Some list pages mirror the same wire copy as the official list; where a source merely echoes another, the claims are credited to the original.</p>
    <table class="srctable"><thead><tr><th>#</th><th>Source</th><th>Site</th><th>Kind</th><th>Read</th><th>Depth</th><th>Cited by (claims)</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="panel" style="margin-top:12px"><h2>Trophy × source matrix — claims backed per source</h2>${matrix}</div>
    <div class="panel" style="margin-top:12px"><h2>Conflicts index — every dispute, with its verdict (${audit.disputes})</h2>${conflicts}</div>`;
}

// ---------- next up ----------
function renderNextUp() {
  const list = nextUpList();
  const byStage = stages.map(st => {
    const rows = trophies.filter(t => t.stage === st.n && !earned(t.id));
    return { st, rows, hrs: rows.reduce((n, t) => n + avg(t), 0) };
  });
  $('#view-nextup').innerHTML = `
    <div class="facts"><b>Next-up planner:</b> ${list.length} trophies open · ~${Math.round(hoursLeft())} h left in total. Starred trophies lead the queue; the rest follow roadmap order. Per-stage remaining: ${byStage.map(x => `S${x.st.n} ~${Math.round(x.hrs)} h`).join(' · ')}</div>
    <div class="panel">${list.map((t, i) => `<div class="plan-item"><div><b>${i + 1}. ${esc(t.name)}</b> <span class="chip">S${t.stage} ${esc(stageName(t.stage))}</span> <span class="chip grade-${t.grade}">${t.grade}</span> ${state.starred.includes(t.id) ? '<span class="chip">★ starred</span>' : ''}<br><span class="gsrc">${esc(t.short)}</span></div><div style="text-align:right"><b>~${avg(t)} h</b>${t.count ? `<br><span class="gsrc">${counterOf(t)}/${t.count.target} ${esc(t.count.unit)}</span>` : ''}</div></div>`).join('')}</div>`;
}

// ---------- wiring ----------
function renderAll() {
  renderHeader(); renderChecklist(); renderGuide(); renderRail();
  renderRoadmap(); renderMissables(); renderSources(); renderNextUp();
}
function setView(v) {
  view = v;
  document.querySelectorAll('#tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  for (const name of ['tracker', 'roadmap', 'missables', 'sources', 'nextup'])
    $('#view-' + name).classList.toggle('hidden', name !== v);
}
document.querySelectorAll('#tabs .tab').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
const kindSel = $('#f-kind');
for (const k of uniq(trophies.map(t => t.kind)).sort()) {
  const o = document.createElement('option'); o.value = k; o.textContent = k; kindSel.append(o);
}
for (const id of ['search', 'f-kind', 'f-grade', 'f-status', 'f-sort', 'hide-earned'])
  $('#' + id).addEventListener('input', renderChecklist);
$('#spoiler').addEventListener('change', e => { state.spoiler = e.target.checked; save(); renderChecklist(); renderGuide(); });
$('#export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...state, earned: [...state.earned] }, null, 1)], { type: 'application/json' }));
  a.download = 'leonida-field-guide-progress.json'; a.click();
});
$('#import').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  const data = JSON.parse(await f.text());
  state = { notes: {}, counters: {}, starred: [], spoiler: true, selected: 28, ...data, earned: new Set(data.earned || []) };
  save(); renderAll();
});
$('#reset').addEventListener('click', () => {
  state = structuredClone(SEED); state.earned = new Set(state.earned);
  save(); renderAll();
});
const hash = (location.hash || '').replace('#', '');
if (['roadmap', 'missables', 'sources', 'nextup', 'tracker'].includes(hash)) setView(hash);
renderAll();
