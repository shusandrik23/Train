/* ───── Ежедневные тренировки (рефлекс, рот и челюсть) ───── */
const TRACKS = {
  reflex: { title:'Тренировка рефлекса', icon:'🌬️', pool:() => REFLEX, size:4, grad:'linear-gradient(135deg,#2fb36b,#0fa39a)', shadow:'#1d7f5a',
    rateQ:'Насколько сильный рефлекс сегодня?', rateHint:'1 — почти не чувствую, 10 — очень сильный', lowerBetter:true, checkin:true,
    warn:'Только до границы комфорта. Боль, першение или охриплость — пропустите день.' },
  jaw: { title:'Тренировка рта и челюсти', icon:'👄', pool:() => JAW, size:4, grad:'linear-gradient(135deg,#f08a24,#e0612f)', shadow:'#a8471f',
    rateQ:'Как далась тренировка?', rateHint:'1 — очень тяжело, 10 — легко', lowerBetter:false,
    warn:'Мышечная усталость — норма. Боль или щелчки в суставе челюсти — стоп.' },
};
const LIGHT_IDS = ['m2','m3','m5','m9']; // щадящие упражнения при плохом самочувствии

const fmtSec = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
function seeded(seed){ let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
function shuffle(arr, rnd = Math.random){ const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const trk = t => { const d = S.daily[t] = S.daily[t] || {}; d.log = d.log || {}; if (d.plan === undefined) d.plan = null; return d; };
const trackDays = t => Object.keys(trk(t).log).length;
const trackLevel = t => { const d = trackDays(t); return d >= 14 ? 3 : d >= 7 ? 2 : 1; };
const exById = (t, id) => TRACKS[t].pool().find(r => r.id === id);

function makePlan(t, light){
  const T = TRACKS[t], pool = T.pool(), lvl = trackLevel(t), rnd = seeded(today() + ':' + t + ':' + trackDays(t));
  const pick = (kind, n, src) => shuffle(src || pool.filter(r => r.kind === kind && r.level <= lvl), rnd).slice(0, n).map(r => r.id);
  let main;
  if (light) main = pick('main', T.size, pool.filter(r => LIGHT_IDS.includes(r.id)));
  else {
    main = lvl > 1 ? pick('main', 1, pool.filter(r => r.kind === 'main' && r.level === lvl)) : [];
    main = main.concat(pick('main', T.size + 2).filter(id => !main.includes(id))).slice(0, T.size);
  }
  return { date:today(), ids:[...pick('warmup', 1), ...main, ...pick('cool', 1)], done:[], light:!!light };
}
function todayPlan(t){
  const d = trk(t);
  if (!d.plan || d.plan.date !== today()) { d.plan = makePlan(t); d.plan.checked = false; save(); }
  return d.plan;
}

function dailyBanners(){
  return Object.entries(TRACKS).map(([t, T]) => {
    const p = todayPlan(t), done = !!trk(t).log[today()];
    return `<button class="banner" data-track="${t}" style="background:${T.grad};box-shadow:0 4px 0 ${T.shadow}">
      <span class="rowic">${done ? '✅' : T.icon}</span>
      <span style="flex:1;text-align:left"><b>${T.title}</b><br>
      <span class="sub">${done ? 'Сегодня выполнено!' : `Сегодня: ${p.done.length}/${p.ids.length} упражнений`} · уровень ${trackLevel(t)}</span></span>
      <span style="font-size:22px">›</span></button>`; }).join('');
}
function bindBanners(){ document.querySelectorAll('[data-track]').forEach(b => b.onclick = () => renderDaily(b.dataset.track)); }

let dailyTimer = null;
function stopAllTimers(){
  if (dailyTimer) { clearInterval(dailyTimer); dailyTimer = null; }
  if (typeof stopToolTimers === 'function') stopToolTimers();
}
function buzz(p){ try { navigator.vibrate && navigator.vibrate(p || [200,100,200]); } catch {} }

/* Проверка самочувствия перед тренировкой горла */
function renderCheckin(t){
  window.scrollTo(0,0);
  const qs = ['Есть ли боль или першение в горле?', 'Заложен нос или насморк?', 'Ели плотно менее 1,5 часа назад?'];
  $app.innerHTML = backbar('Проверка самочувствия') + `<h1>Как вы сегодня?</h1>
    <p class="muted">Перед тренировкой горла — 3 быстрых вопроса.</p>
    ${qs.map((q,i) => `<div class="card"><b>${q}</b><div class="exbtns" style="margin-top:10px">
      <button class="btn small ghost yn" data-q="${i}" data-v="0">Нет</button><button class="btn small ghost yn" data-q="${i}" data-v="1">Да</button></div></div>`).join('')}
    <div id="ckres"></div>`;
  bindBack();
  const ans = {};
  document.querySelectorAll('.yn').forEach(b => b.onclick = () => {
    ans[b.dataset.q] = +b.dataset.v;
    document.querySelectorAll(`.yn[data-q="${b.dataset.q}"]`).forEach(x => x.classList.toggle('picked', x === b));
    if (Object.keys(ans).length < qs.length) return;
    const p = todayPlan(t), bad = Object.values(ans).some(Boolean);
    const box = document.getElementById('ckres');
    if (!bad) { p.checked = true; save(); return renderDaily(t); }
    box.innerHTML = `<div class="card"><p>Сегодня лучше <b>облегчённая тренировка</b> (дыхание, зевок, язык, мычание) или отдых.</p>
      <button class="btn ok" id="light">Облегчённая тренировка</button><div style="height:10px"></div>
      <button class="btn ghost" id="rest">Сегодня отдыхаю</button></div>`;
    document.getElementById('light').onclick = () => { const np = makePlan(t, true); np.checked = true; trk(t).plan = np; save(); renderDaily(t); };
    document.getElementById('rest').onclick = () => { toast('Отдых — тоже часть тренировки 💚'); render(); };
  });
}

function renderDaily(t){
  stopAllTimers(); window.scrollTo(0,0);
  const T = TRACKS[t], p = todayPlan(t), d = trk(t), lvl = trackLevel(t), days = trackDays(t), doneToday = d.log[today()];
  if (T.checkin && !p.checked && !doneToday) return renderCheckin(t);
  const pool = T.pool();
  const nextLvl = lvl === 1 ? `Уровень 2 — через ${7 - days} дн. тренировок` : lvl === 2 ? `Уровень 3 — через ${14 - days} дн. тренировок` : 'Максимальный уровень';
  const label = {warmup:'Разминка', main:'Основное', cool:'Заминка'};
  const cards = p.ids.map((id, i) => { const r = exById(t, id), done = p.done.includes(id);
    return `<div class="card ex ${done ? 'exdone' : ''}">
      <div class="exhead"><span class="rowic">${done ? '✅' : r.icon}</span>
        <span style="flex:1"><span class="pill">${label[r.kind]}${r.level > 1 ? ' · ур. ' + r.level : ''}</span><br><b>${r.title}</b> <span class="muted">· ${fmtSec(r.sec)}</span></span>
        ${done ? '' : `<button class="swap" data-swap="${i}" title="Заменить упражнение">🔀</button>`}</div>
      <p style="margin:8px 0">${r.how}</p>
      ${done ? '' : `<div class="exbtns"><button class="btn small" data-start="${id}">▶ Таймер ${fmtSec(r.sec)}</button>
        <button class="btn small ghost" data-mark="${id}">Готово</button></div>`}</div>`; }).join('');
  const allDone = p.done.length === p.ids.length;
  const bars = []; for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i*864e5).toISOString().slice(0,10), e = d.log[day];
    bars.push(`<div class="bar" title="${day}${e ? ': ' + e.rating + '/10' : ''}"><div style="height:${e ? e.rating*10 : 0}%"></div><span>${day.slice(8)}</span></div>`);
  }
  $app.innerHTML = backbar(T.title) + `
    <div class="card"><p style="margin-top:0">🔥 Дней тренировок: <b>${days}</b> · 📈 Уровень: <b>${lvl}</b>${p.light ? ' · 🍃 облегчённая' : ''}</p>
      <p class="muted" style="margin:0">${nextLvl}. Каждый день — новый набор. Не нравится упражнение — 🔀.</p></div>
    ${warn(T.warn)}
    ${cards}
    ${doneToday ? `<div class="card center"><div class="big" style="margin:8px 0">🎉</div><b>Тренировка на сегодня выполнена</b>
      <p class="muted">Оценка: ${doneToday.rating}/10. Завтра — новый набор.</p></div>` :
    `<div class="card"><b>${T.rateQ}</b><p class="muted" style="margin:4px 0">${T.rateHint}</p>
      <input type="range" min="1" max="10" value="5" id="rate" style="width:100%"><div class="center"><b id="rateV">5</b>/10</div>
      <button class="btn ok" id="finish" ${allDone ? '' : 'disabled'}>${allDone ? 'Завершить тренировку' : `Выполните все упражнения (${p.done.length}/${p.ids.length})`}</button></div>`}
    <div class="card"><b>Оценки за 14 дней</b><div class="chart">${bars.join('')}</div>
      <p class="muted" style="margin-bottom:0">${T.lowerBetter ? 'Чем ниже столбики — тем лучше.' : 'Чем выше столбики — тем лучше.'}</p></div>
    <details class="card"><summary><b>📚 Все упражнения (${pool.length})</b></summary>
      ${pool.map(r => `<div class="entry"><b>${r.icon} ${r.title}</b> <span class="muted">· ${label[r.kind]} · ур. ${r.level}${r.level > lvl ? ' 🔒' : ''}</span><p style="margin:4px 0">${r.how}</p></div>`).join('')}</details>
    <div id="timerBox"></div><div style="height:40px"></div>`;
  bindBack();
  const mark = id => { if (!p.done.includes(id)) p.done.push(id); save(); renderDaily(t); };
  document.querySelectorAll('[data-mark]').forEach(b => b.onclick = () => mark(b.dataset.mark));
  document.querySelectorAll('[data-swap]').forEach(b => b.onclick = () => {
    const i = +b.dataset.swap, cur = exById(t, p.ids[i]);
    const opts = pool.filter(r => r.kind === cur.kind && r.level <= lvl && !p.ids.includes(r.id) && (!p.light || r.kind !== 'main' || LIGHT_IDS.includes(r.id)));
    if (!opts.length) return toast('Других упражнений этого типа на вашем уровне пока нет');
    p.ids[i] = opts[Math.floor(Math.random() * opts.length)].id; save(); renderDaily(t);
  });
  document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => {
    const r = exById(t, b.dataset.start); stopAllTimers();
    let left = r.sec; const box = document.getElementById('timerBox');
    const draw = () => { box.innerHTML = `<div class="timer"><div class="inner"><span style="font-size:22px">${r.icon}</span>
      <span style="flex:1"><b>${r.title}</b><div class="progress"><div style="width:${(1 - left / r.sec) * 100}%"></div></div></span>
      <b class="tnum">${fmtSec(left)}</b><button class="close" id="tstop">✕</button></div></div>`;
      document.getElementById('tstop').onclick = () => { stopAllTimers(); box.innerHTML = ''; }; };
    draw();
    dailyTimer = setInterval(() => { left--; if (left <= 0) { stopAllTimers(); buzz(); mark(r.id); } else draw(); }, 1000);
  });
  const rate = document.getElementById('rate');
  if (rate) rate.oninput = () => document.getElementById('rateV').textContent = rate.value;
  const fin = document.getElementById('finish');
  if (fin) fin.onclick = () => {
    const rating = +rate.value;
    d.log[today()] = { rating, ex:p.ids.slice() };
    S.reports.unshift({ lesson:T.title, unit:'', task:`${T.icon} ${T.title}`, date:new Date().toISOString(),
      checklist:p.ids.map(id => exById(t, id).title), rating:0, text:`${T.rateQ.replace('?','')}: ${rating}/10` });
    gainXP(XP_TASK); renderDaily(t);
  };
}
