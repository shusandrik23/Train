/* ═════════ Вкладка «Тренер»: инструменты ═════════ */
S.counts = S.counts || {};
for (const k of ["mood","wish","combos"]) S[k] = Array.isArray(S[k]) ? S[k] : [];
const count = k => { S.counts = S.counts || {}; S.counts[k] = (S.counts[k] || 0) + 1; save(); };
const BLK = id => BLOCKS.find(b => b.id === id);

let toolTimer = null, metro = null, wakeLock = null;
function stopToolTimers(){
  if (toolTimer) { clearInterval(toolTimer); toolTimer = null; }
  if (metro) { clearTimeout(metro.t); clearInterval(metro.acc); metro = null; }
  if (wakeLock) { try { wakeLock.release(); } catch {} wakeLock = null; }
}
async function keepAwake(){ try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch {} }

const TOOL_GROUPS = [
 ['Ежедневно', [
   ['reflex','🌬️','Тренировка рефлекса', () => renderDaily('reflex')],
   ['jaw','👄','Рот и челюсть', () => renderDaily('jaw')],
   ['warm','⚡','Разминка 3 мин', () => playSession(SESSIONS[0])],
   ['challenge','🏅','Вызов недели', renderChallenge]]],
 ['Практика', [
   ['sessions','💞','Сессии с партнёром', renderSessions],
   ['combo','🧩','Конструктор связок', renderCombos],
   ['metro','🎵','Метроном ритма', renderMetro],
   ['dice','🎲','Кубик техник', renderDice]]],
 ['Для пары', [
   ['talk','💬','Карточки для разговора', renderTalk],
   ['wish','📝','Хотим попробовать', renderWish],
   ['pquiz','🔍','Узнай партнёра', renderPQuiz],
   ['guide','🤝','Памятка для партнёра', renderGuide]]],
 ['Учёба', [
   ['review','🔁','Повторение', renderReview],
   ['mistakes','❓','Найди ошибку', renderMistakes],
   ['myths','🧠','Мифы и факты', renderMyths],
   ['schemes','📐','Схемы', renderSchemes],
   ['glossary','📖','Словарь', renderGlossary],
   ['tech','📚','Справочник техник', renderTech]]],
 ['Прогресс', [
   ['records','🏆','Личные рекорды', renderRecords],
   ['mood','📊','Дневник ощущений', renderMood]]],
];
const TOOL_FN = Object.fromEntries(TOOL_GROUPS.flatMap(g => g[1].map(t => [t[0], t[3]])));

VIEWS.tools = function(){
  let html = topbar() + `<h1>Тренер</h1>`;
  TOOL_GROUPS.forEach(([g, items]) => {
    html += `<h3 class="grp">${g}</h3><div class="tiles">` + items.map(([id, ic, title]) =>
      `<button class="tile" data-tool="${id}"><span class="tic">${ic}</span><span>${title}</span></button>`).join('') + `</div>`;
  });
  $app.innerHTML = html + `<div style="height:20px"></div>` + nav();
  document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => TOOL_FN[b.dataset.tool]());
};

/* ───── Плеер сессий (разминка, сессии, связки) ───── */
function playSession(sess){
  stopAllTimers(); keepAwake();
  const steps = sess.steps || sess.blocks.map(id => { const b = typeof id === 'string' ? BLK(id) : id; return {icon:b.icon, title:b.title, hint:b.hint, sec:b.sec}; });
  let i = 0, left = steps[0].sec, paused = false;
  const total = steps.reduce((a, s) => a + s.sec, 0);
  const draw = () => {
    const s = steps[i], elapsed = steps.slice(0, i).reduce((a, x) => a + x.sec, 0) + (s.sec - left);
    $app.innerHTML = backbar(sess.title) + `<div class="progress" style="margin:4px 0 16px"><div style="width:${elapsed / total * 100}%"></div></div>
      <div class="player"><div class="pstep">Шаг ${i + 1} из ${steps.length}</div><div class="pic">${s.icon}</div>
        <h1 style="margin:6px 0">${s.title}</h1><p class="muted">${s.hint || ''}</p>
        <div class="pnum">${fmtSec(left)}</div>
        ${steps[i + 1] ? `<p class="muted">Далее: ${steps[i + 1].icon} ${steps[i + 1].title}</p>` : '<p class="muted">Последний шаг</p>'}</div>
      <div class="exbtns"><button class="btn ghost" id="prev">⏮</button><button class="btn" id="pause">${paused ? '▶ Продолжить' : '⏸ Пауза'}</button><button class="btn ghost" id="nextS">⏭</button></div>
      <p class="muted center" style="margin-top:16px">Экран не гаснет во время сессии. Сигнал о смене шага — вибрацией.</p>`;
    bindBack(() => { stopAllTimers(); render(); });
    document.getElementById('pause').onclick = () => { paused = !paused; draw(); };
    document.getElementById('nextS').onclick = () => go(1);
    document.getElementById('prev').onclick = () => go(-1);
  };
  const go = d => { i = Math.max(0, i + d); if (i >= steps.length) return done(); left = steps[i].sec; buzz([150]); draw(); };
  const done = () => {
    stopAllTimers(); count('sessions'); gainXP(10);
    $app.innerHTML = `<div class="center" style="padding-top:10vh"><div class="big">🎉</div><h1>Сессия завершена!</h1><p>${esc(sess.title)}</p>
      <div class="card"><p>⭐ +10 XP</p><p>⏱ ${fmtSec(total)}</p></div><button class="btn" id="home">Готово</button></div>`;
    document.getElementById('home').onclick = () => render();
  };
  draw();
  toolTimer = setInterval(() => { if (paused) return; left--; if (left <= 0) go(1); else { const n = document.querySelector('.pnum'); if (n) n.textContent = fmtSec(left); } }, 1000);
}

function renderSessions(){
  $app.innerHTML = backbar('Сессии с партнёром') + `<p class="muted">Пошаговые сессии с таймером и подсказками. Положите телефон рядом — он подскажет, что делать.</p>
    ${warn('Только с согласия партнёра. Стоп-сигнал действует всегда.')}
    ${SESSIONS.map((s, i) => `<button class="option row" data-s="${i}"><span class="rowic">${s.icon}</span><span><b>${s.title}</b><br><span class="muted">${s.desc}</span></span></button>`).join('')}
    ${S.combos.length ? `<h3 class="grp">Мои связки</h3>` + S.combos.map((c, i) => `<button class="option row" data-c="${i}"><span class="rowic">🧩</span><span><b>${esc(c.name)}</b><br><span class="muted">${c.blocks.length} техник · ${fmtSec(c.blocks.reduce((a, b) => a + b.sec, 0))}</span></span></button>`).join('') : ''}`;
  bindBack();
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => playSession(SESSIONS[b.dataset.s]));
  document.querySelectorAll('[data-c]').forEach(b => b.onclick = () => playSession({title:S.combos[b.dataset.c].name, blocks:S.combos[b.dataset.c].blocks}));
}

/* ───── Конструктор связок ───── */
function renderCombos(draft){
  window.scrollTo(0,0);
  draft = draft || { name:'', blocks:[] };
  const total = draft.blocks.reduce((a, b) => a + b.sec, 0);
  $app.innerHTML = backbar('Конструктор связок') + `
    <div class="card"><b>Моя связка</b> <span class="muted">· ${draft.blocks.length} техник · ${fmtSec(total)}</span>
      ${draft.blocks.length ? draft.blocks.map((b, i) => `<div class="cb"><span>${b.icon} ${b.title}</span>
        <span class="cbt"><button data-dec="${i}">−</button>${fmtSec(b.sec)}<button data-inc="${i}">+</button>
        <button data-up="${i}">↑</button><button data-del="${i}">✕</button></span></div>`).join('') : '<p class="muted">Нажимайте на техники ниже, чтобы добавить.</p>'}
      <input id="cname" class="inp" placeholder="Название связки" value="${esc(draft.name)}">
      <div class="exbtns"><button class="btn small" id="cplay" ${draft.blocks.length ? '' : 'disabled'}>▶ Запустить</button>
      <button class="btn small ok" id="csave" ${draft.blocks.length ? '' : 'disabled'}>💾 Сохранить</button></div></div>
    <h3 class="grp">Техники</h3><div class="chips">${BLOCKS.map(b => `<button class="chip" data-add="${b.id}">${b.icon} ${b.title}${b.hands ? ' ✋' : ''}</button>`).join('')}</div>
    <p class="muted">✋ — техника с работой рук</p>
    ${S.combos.length ? `<h3 class="grp">Сохранённые</h3>` + S.combos.map((c, i) => `<div class="card cb"><span><b>${esc(c.name)}</b><br><span class="muted">${c.blocks.map(b => b.icon).join(' ')}</span></span>
      <span class="cbt"><button data-play="${i}">▶</button><button data-edit="${i}">✎</button><button data-rm="${i}">🗑</button></span></div>`).join('') : ''}`;
  bindBack();
  const nameEl = document.getElementById('cname');
  const upd = fn => { draft.name = nameEl.value; fn(); renderCombos(draft); };
  document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => upd(() => { const x = BLK(b.dataset.add); draft.blocks.push({icon:x.icon, title:x.title, hint:x.hint, sec:x.sec}); }));
  document.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => upd(() => draft.blocks[b.dataset.inc].sec += 15));
  document.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => upd(() => { const x = draft.blocks[b.dataset.dec]; x.sec = Math.max(15, x.sec - 15); }));
  document.querySelectorAll('[data-up]').forEach(b => b.onclick = () => upd(() => { const i = +b.dataset.up; if (i) [draft.blocks[i-1], draft.blocks[i]] = [draft.blocks[i], draft.blocks[i-1]]; }));
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => upd(() => draft.blocks.splice(+b.dataset.del, 1)));
  document.getElementById('cplay').onclick = () => playSession({ title:nameEl.value || 'Моя связка', blocks:draft.blocks });
  document.getElementById('csave').onclick = () => {
    const c = { name:nameEl.value.trim() || `Связка ${S.combos.length + 1}`, blocks:draft.blocks };
    if (draft.idx != null) S.combos[draft.idx] = c; else S.combos.push(c);
    count('combos'); save(); toast('Связка сохранена 🧩'); renderCombos();
  };
  document.querySelectorAll('[data-play]').forEach(b => b.onclick = () => { const c = S.combos[b.dataset.play]; playSession({title:c.name, blocks:c.blocks}); });
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { const c = S.combos[b.dataset.edit]; renderCombos({ name:c.name, blocks:c.blocks.map(x => ({...x})), idx:+b.dataset.edit }); });
  document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { if (confirm('Удалить связку?')) { S.combos.splice(+b.dataset.rm, 1); save(); renderCombos(); } });
}

/* ───── Метроном ───── */
let audioCtx = null;
function click(accent){
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = accent ? 1000 : 700; g.gain.setValueAtTime(0.25, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.09);
  } catch {}
}
function renderMetro(){
  const st = S.settings; st.bpm = st.bpm || 60; st.mmode = st.mmode || 'both'; st.maccel = !!st.maccel;
  $app.innerHTML = backbar('Метроном ритма') + `<p class="muted">Задаёт ровный темп движений. Один удар — одно движение вниз или вверх.</p>
    <div class="card center"><div class="pulse" id="pulse"></div><div class="pnum" id="bpmV">${st.bpm}</div><div class="muted">ударов в минуту</div>
      <input type="range" min="30" max="140" value="${st.bpm}" id="bpm" style="width:100%">
      <div class="chips" style="justify-content:center">${[['Медленно',45],['Средне',70],['Быстро',100]].map(([l, v]) => `<button class="chip" data-p="${v}">${l} · ${v}</button>`).join('')}</div></div>
    <div class="card"><b>Сигнал</b><div class="chips">${[['sound','🔊 Звук'],['vibro','📳 Вибрация'],['both','Оба'],['visual','👁 Только свет']].map(([k, l]) => `<button class="chip ${st.mmode === k ? 'picked' : ''}" data-m="${k}">${l}</button>`).join('')}</div>
      <label class="check"><input type="checkbox" id="accel" ${st.maccel ? 'checked' : ''}> <span>Постепенное ускорение: +3 удара каждые 30 сек (до 120)</span></label></div>
    <button class="btn" id="mgo">${metro ? '⏹ Стоп' : '▶ Старт'}</button>
    ${tip('Лайфхак: начните медленно, а когда найдёте темп, который нравится партнёру, — зафиксируйте и не меняйте до финала.')}`;
  bindBack(() => { stopAllTimers(); render(); });
  const bpm = document.getElementById('bpm');
  const setBpm = v => { st.bpm = v; bpm.value = v; document.getElementById('bpmV').textContent = v; save(); };
  bpm.oninput = () => setBpm(+bpm.value);
  document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => setBpm(+b.dataset.p));
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { st.mmode = b.dataset.m; save(); const r = !!metro; stopAllTimers(); renderMetro(); if (r) start(); });
  document.getElementById('accel').onchange = e => { st.maccel = e.target.checked; save(); };
  const start = () => {
    keepAwake(); let n = 0;
    metro = { t:null, acc:null };
    const tick = () => {
      const p = document.getElementById('pulse'); if (!p) return stopAllTimers();
      if (st.mmode === 'sound' || st.mmode === 'both') click(n % 4 === 0);
      if (st.mmode === 'vibro' || st.mmode === 'both') buzz([40]);
      p.classList.remove('on'); void p.offsetWidth; p.classList.add('on'); n++;
      metro.t = setTimeout(tick, 60000 / st.bpm);
    };
    tick();
    if (st.maccel) metro.acc = setInterval(() => { if (st.bpm < 120) { st.bpm = Math.min(120, st.bpm + 3); const v = document.getElementById('bpmV'); if (v) { v.textContent = st.bpm; bpm.value = st.bpm; } save(); } }, 30000);
    document.getElementById('mgo').textContent = '⏹ Стоп';
  };
  document.getElementById('mgo').onclick = () => { if (metro) { stopAllTimers(); renderMetro(); } else start(); };
}

/* ───── Кубик ───── */
function renderDice(roll){
  const mods = ['', 'и смотрите партнёру в глаза', 'очень медленно', 'со свободной рукой на бёдрах', 'с тихим мычанием', 'в новой позе'];
  let res = '';
  if (roll) {
    const b = BLOCKS.filter(x => x.id !== 'b15')[Math.floor(Math.random() * (BLOCKS.length - 1))];
    const sec = [30, 45, 60, 90][Math.floor(Math.random() * 4)], m = mods[Math.floor(Math.random() * mods.length)];
    res = `<div class="card center dice"><div class="big">${b.icon}</div><h2 style="margin:0">${b.title}</h2><p class="muted">${b.hint}</p>
      <p><b>⏱ ${sec} сек</b>${m ? ` · ${m}` : ''}</p></div>`;
    count('dice');
  }
  $app.innerHTML = backbar('Кубик техник') + `<p class="muted">Бросьте кубик — выпадет случайная техника и длительность. Лёгкий способ добавить разнообразия.</p>
    ${res || '<div class="card center"><div class="big">🎲</div><p class="muted">Нажмите «Бросить»</p></div>'}
    <button class="btn" id="roll">🎲 ${roll ? 'Бросить ещё' : 'Бросить'}</button>`;
  bindBack();
  document.getElementById('roll').onclick = () => renderDice(true);
}

/* ───── Карточки для разговора ───── */
function renderTalk(){
  const order = shuffle(TALK.map((_, i) => i)); let i = 0;
  const draw = () => {
    $app.innerHTML = backbar('Карточки для разговора') + `<p class="muted">Задавайте вопросы по очереди. Отвечать честно, без оценок. Можно пропустить любой вопрос.</p>
      <div class="card talk"><div class="muted">Карточка ${i + 1} из ${order.length}</div><h2>${TALK[order[i]]}</h2></div>
      <button class="btn" id="tn">Следующий вопрос</button>`;
    bindBack();
    document.getElementById('tn').onclick = () => { i = (i + 1) % order.length; if (i === 0) count('talkAll'); count('talk'); draw(); };
  };
  draw();
}

/* ───── Хотим попробовать ───── */
function renderWish(){
  $app.innerHTML = backbar('Хотим попробовать') + `<p class="muted">Общий список идей. Отмечайте, когда попробовали.</p>
    <div class="card"><div class="exbtns"><input id="wi" class="inp" placeholder="Новая идея…" style="margin:0;flex:3"><button class="btn small" id="wa" style="flex:1">+</button></div>
    ${S.wish.length ? S.wish.map((w, i) => `<div class="cb"><label class="check" style="margin:6px 0;flex:1"><input type="checkbox" data-w="${i}" ${w.done ? 'checked' : ''}> <span style="${w.done ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(w.t)}</span></label>
      <span class="cbt"><button data-wd="${i}">✕</button></span></div>`).join('') : '<p class="muted">Пока пусто.</p>'}</div>
    <h3 class="grp">Быстро добавить</h3><div class="chips">${BLOCKS.map(b => `<button class="chip" data-wq="${b.id}">${b.icon} ${b.title}</button>`).join('')}
      ${['Новая поза','Ароматизированный презерватив','Свечи и музыка','Эджинг 3 цикла','Массаж перед'].map(t => `<button class="chip" data-wt="${t}">✨ ${t}</button>`).join('')}</div>`;
  bindBack();
  const add = t => { t = t.trim(); if (!t || S.wish.some(w => w.t === t)) return; S.wish.push({ t, done:false }); save(); renderWish(); };
  document.getElementById('wa').onclick = () => add(document.getElementById('wi').value);
  document.getElementById('wi').onkeydown = e => { if (e.key === 'Enter') add(e.target.value); };
  document.querySelectorAll('[data-wq]').forEach(b => b.onclick = () => add(BLK(b.dataset.wq).title));
  document.querySelectorAll('[data-wt]').forEach(b => b.onclick = () => add(b.dataset.wt));
  document.querySelectorAll('[data-w]').forEach(b => b.onchange = () => { S.wish[b.dataset.w].done = b.checked; if (b.checked) { count('wishDone'); gainXP(5); } save(); renderWish(); });
  document.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => { S.wish.splice(+b.dataset.wd, 1); save(); renderWish(); });
}

/* ───── Узнай партнёра ───── */
function renderPQuiz(){
  let i = 0; const tags = [];
  const draw = () => {
    if (i >= PQUIZ.length) return result();
    const q = PQUIZ[i];
    $app.innerHTML = backbar('Узнай партнёра') + `<div class="progress" style="margin-bottom:16px"><div style="width:${i / PQUIZ.length * 100}%"></div></div>
      <p class="muted">Ответьте сами или пройдите вместе с партнёром.</p><div class="qtitle">${q.q}</div>
      ${q.a.map(([t], j) => `<button class="option" data-a="${j}">${t}</button>`).join('')}`;
    bindBack();
    document.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { tags.push(q.a[b.dataset.a][1]); i++; draw(); });
  };
  const result = () => {
    const score = {}; tags.forEach(t => (PREC[t] || []).forEach(id => score[id] = (score[id] || 0) + 1));
    const talk = score.__talk; delete score.__talk;
    const top = Object.entries(score).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => BLK(id));
    S.pquiz = top.map(b => b.id); count('pquiz'); gainXP(10);
    $app.innerHTML = backbar('Рекомендации') + `<h1>Попробуйте эти техники</h1>
      ${talk ? tip(`Несколько ответов «не знаю» — отличный повод поговорить! Загляните в «Карточки для разговора».`) : ''}
      ${top.map(b => `<div class="card"><b>${b.icon} ${b.title}</b><p class="muted" style="margin:4px 0 0">${b.hint}</p></div>`).join('')}
      <button class="btn ok" id="mk">🧩 Сделать из них связку</button><div style="height:10px"></div>
      <button class="btn ghost" id="wl">📝 Добавить в «Хотим попробовать»</button>`;
    bindBack();
    document.getElementById('mk').onclick = () => { S.combos.push({ name:'По анкете партнёра', blocks:[BLK('b1'), ...top.filter(b => b.id !== 'b1'), BLK('b16')].map(b => ({icon:b.icon, title:b.title, hint:b.hint, sec:b.sec})) }); save(); toast('Связка сохранена'); renderCombos(); };
    document.getElementById('wl').onclick = () => { top.forEach(b => { if (!S.wish.some(w => w.t === b.title)) S.wish.push({ t:b.title, done:false }); }); save(); renderWish(); };
  };
  draw();
}

/* ───── Памятка для партнёра ───── */
function renderGuide(){
  $app.innerHTML = backbar('Памятка для партнёра') + `<div class="card">${PARTNER_GUIDE}</div>
    <button class="btn" id="share">📤 Поделиться приложением</button>`;
  bindBack();
  document.getElementById('share').onclick = async () => {
    const url = location.href.split('?')[0];
    try { if (navigator.share) await navigator.share({ title:'Oralingo', url }); else { await navigator.clipboard.writeText(url); toast('Ссылка скопирована'); } } catch {}
  };
}

/* ───── Повторение (интервальное) ───── */
function quizPool(){
  const qs = l => l.steps.filter(s => s.type === 'quiz').map((s, i) => ({ ...s, key:l.id + ':' + i, from:l.title }));
  const done = ALL.filter(l => S.done[l.id]).flatMap(qs);
  // если пройденных вопросов мало — добираем из остальных уроков
  return done.length >= 6 ? done : done.concat(shuffle(ALL.filter(l => !S.done[l.id]).flatMap(qs)).slice(0, 6 - done.length));
}
function runQuiz(title, items, onDone){
  const queue = items.slice(); let right = 0, total = items.length;
  const step = () => {
    window.scrollTo(0,0);
    if (!queue.length) return onDone(right, total);
    const s = queue[0]; let sel = null;
    $app.innerHTML = backbar(title) + `<div class="progress" style="margin-bottom:16px"><div style="width:${(total - queue.length) / total * 100}%"></div></div>
      ${s.from ? `<span class="pill">${esc(s.from)}</span>` : ''}<div class="qtitle">${s.q}</div>
      ${s.options.map((o, i) => `<button class="option" data-i="${i}">${o}</button>`).join('')}
      <div class="footer"><div class="inner"><div id="fb"></div><button class="btn" id="chk" disabled>Проверить</button></div></div><div style="height:150px"></div>`;
    bindBack();
    const opts = [...document.querySelectorAll('.option')], chk = document.getElementById('chk');
    opts.forEach(o => o.onclick = () => { if (chk.dataset.st) return; opts.forEach(x => x.classList.remove('sel')); o.classList.add('sel'); sel = +o.dataset.i; chk.disabled = false; });
    chk.onclick = () => {
      if (chk.dataset.st) { queue.shift(); return step(); }
      const ok = sel === s.answer; if (ok) right++;
      if (s.key) { const st = S.quizStats[s.key] = S.quizStats[s.key] || { r:0, w:0 }; ok ? st.r++ : st.w++; save(); }
      opts[s.answer].classList.add('right'); if (!ok) opts[sel].classList.add('wrong');
      document.getElementById('fb').innerHTML = `<div class="feedback ${ok ? 'right' : 'wrong'}">${ok ? '✅ Верно!' : '❌ Не совсем'}</div>${s.explain ? `<p class="muted" style="margin-top:-6px">${s.explain}</p>` : ''}`;
      chk.textContent = 'Далее'; chk.className = 'btn' + (ok ? ' ok' : ''); chk.dataset.st = 1;
    };
  };
  step();
}
function quizResult(title, right, total, xp){
  gainXP(xp);
  $app.innerHTML = `<div class="center" style="padding-top:10vh"><div class="big">${right === total ? '🏆' : '👍'}</div><h1>${title}</h1>
    <div class="card"><p>Правильно: <b>${right}/${total}</b></p><p>⭐ +${xp} XP</p></div><button class="btn" id="home">Готово</button></div>`;
  document.getElementById('home').onclick = () => render();
}
function renderReview(){
  // вопросы с ошибками — в приоритете
  const pool = quizPool().map(q => { const st = S.quizStats[q.key] || { r:0, w:0 }; return { q, w:1 + st.w * 3 - Math.min(st.r, 3) * 0.3 + Math.random() }; });
  const items = pool.sort((a, b) => b.w - a.w).slice(0, 6).map(x => x.q);
  runQuiz('Повторение', shuffle(items), (r, t) => { count('review'); quizResult('Повторение завершено', r, t, 8); });
}
function renderMistakes(){
  const items = shuffle(MISTAKES).slice(0, 6).map(([q, options, answer]) => ({ q:'<span class="muted">Что пошло не так?</span><br>' + q, options, answer }));
  runQuiz('Найди ошибку', items, (r, t) => { count('mistakes'); quizResult('Готово!', r, t, 8); });
}
function renderMyths(){
  const items = shuffle(MYTHS); let i = 0, right = 0;
  const draw = (ans) => {
    const [t, truth, ex] = items[i];
    $app.innerHTML = backbar('Мифы и факты') + `<div class="progress" style="margin-bottom:16px"><div style="width:${i / items.length * 100}%"></div></div>
      <div class="card talk"><div class="muted">${i + 1} / ${items.length}</div><h2>«${t}»</h2>
      ${ans != null ? `<div class="feedback ${ans === truth ? 'right' : 'wrong'}">${truth ? '✅ Факт' : '❌ Миф'}${ans === truth ? ' — вы правы!' : ''}</div><p>${ex}</p>` : ''}</div>
      ${ans == null ? `<div class="exbtns"><button class="btn" id="myth" style="background:var(--bad);box-shadow:0 4px 0 #a33">Миф</button><button class="btn ok" id="fact">Факт</button></div>`
        : `<button class="btn" id="nx">${i + 1 < items.length ? 'Далее' : 'Итог'}</button>`}`;
    bindBack();
    if (ans == null) {
      document.getElementById('myth').onclick = () => { if (!truth) right++; draw(false); };
      document.getElementById('fact').onclick = () => { if (truth) right++; draw(true); };
    } else document.getElementById('nx').onclick = () => { i++; if (i < items.length) draw(); else { count('myths'); quizResult('Мифы разоблачены!', right, items.length, 8); } };
  };
  draw();
}

/* ───── Схемы и словарь ───── */
function renderSchemes(){
  $app.innerHTML = backbar('Схемы') + `<p class="muted">Простые схемы положения губ, рук и языка.</p>` +
    SCHEMES.map(s => `<div class="card"><b>${s.title}</b>${s.svg}<p class="muted" style="margin-bottom:0">${s.text}</p></div>`).join('');
  bindBack();
}
function renderGlossary(){
  $app.innerHTML = backbar('Словарь') + `<input id="gq" class="inp" placeholder="🔍 Поиск термина…"><div id="gl"></div>`;
  bindBack();
  const list = document.getElementById('gl'), q = document.getElementById('gq');
  const draw = () => { const f = q.value.trim().toLowerCase();
    const items = GLOSSARY.filter(([t, d]) => !f || t.toLowerCase().includes(f) || d.toLowerCase().includes(f)).sort((a, b) => a[0].localeCompare(b[0], 'ru'));
    list.innerHTML = `<div class="card">${items.map(([t, d]) => `<div class="entry"><b>${t}</b><p style="margin:4px 0 0">${d}</p></div>`).join('') || '<p class="muted">Ничего не найдено</p>'}</div>`; };
  q.oninput = draw; draw();
}

/* ───── Вызов недели ───── */
function weekKey(d = new Date()){ const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + '-W' + Math.ceil(((t - y) / 864e5 + 1) / 7); }
function renderChallenge(){
  const wk = weekKey(), n = +wk.split('W')[1];
  const c = S.challenge[wk] = S.challenge[wk] || { c:(n + Object.keys(S.challenge).length) % CHALLENGES.length, t:[false,false,false], p:false, rating:0, done:false };
  const ch = CHALLENGES[c.c], all = c.t.every(Boolean) && c.p;
  const lesson = ALL.find(l => l.id === ch.lesson);
  $app.innerHTML = backbar('Вызов недели') + `<div class="card center"><div class="big" style="margin:8px 0">${ch.icon}</div><span class="pill">Неделя ${n}</span>
      <h2 style="margin:4px 0">${ch.title}</h2><p class="muted">Цель: ${ch.goal}</p></div>
    <div class="card"><b>План на неделю</b>
      ${c.t.map((v, i) => `<label class="check"><input type="checkbox" data-t="${i}" ${v ? 'checked' : ''} ${c.done ? 'disabled' : ''}> <span>Тренировка ${i + 1} на тренажёре (5–10 мин)</span></label>`).join('')}
      <label class="check"><input type="checkbox" id="cp" ${c.p ? 'checked' : ''} ${c.done ? 'disabled' : ''}> <span>Попытка с партнёром + обратная связь</span></label></div>
    ${lesson ? `<button class="btn ghost" id="cl">📖 Освежить теорию: ${esc(lesson.title)}</button><div style="height:12px"></div>` : ''}
    ${c.done ? `<div class="card center">🏅 Вызов выполнен! Самооценка: ${'⭐'.repeat(c.rating)}<p class="muted">Новый вызов — в понедельник.</p></div>` :
      `<div class="card"><b>Самооценка освоения</b><div class="stars">${[1,2,3,4,5].map(k => `<button data-n="${k}">⭐</button>`).join('')}</div>
      <button class="btn ok" id="cdone" ${all ? '' : 'disabled'}>Завершить вызов (+30 XP)</button></div>`}
    ${Object.values(S.challenge).filter(x => x.done).length ? `<p class="muted center">Выполнено вызовов: ${Object.values(S.challenge).filter(x => x.done).length}</p>` : ''}`;
  bindBack(); save();
  document.querySelectorAll('[data-t]').forEach(b => b.onchange = () => { c.t[b.dataset.t] = b.checked; save(); renderChallenge(); });
  const cp = document.getElementById('cp'); if (cp) cp.onchange = () => { c.p = cp.checked; save(); renderChallenge(); };
  const cl = document.getElementById('cl'); if (cl) cl.onclick = () => startLesson(ch.lesson);
  let rating = 0; const stars = [...document.querySelectorAll('.stars button')];
  stars.forEach(s => s.onclick = () => { rating = +s.dataset.n; stars.forEach(x => x.classList.toggle('on', +x.dataset.n <= rating)); });
  const cd = document.getElementById('cdone');
  if (cd) cd.onclick = () => { if (!rating) return toast('Поставьте самооценку'); c.done = true; c.rating = rating; count('challenges'); gainXP(30); renderChallenge(); };
}

/* ───── Личные рекорды ───── */
function renderRecords(){
  $app.innerHTML = backbar('Личные рекорды') + `<p class="muted">Записывайте результаты — так виден прогресс.</p>` +
    RECORDS.map(r => { const h = S.records[r.id] || [], best = h.length ? Math.max(...h.map(x => x.v)) : null, last = h.slice(-8);
      const mx = Math.max(1, ...last.map(x => x.v));
      return `<div class="card"><div class="exhead"><span class="rowic">${r.icon}</span><span style="flex:1"><b>${r.title}</b><br>
        <span class="muted">${best != null ? `Рекорд: <b>${best} ${r.unit}</b> · записей: ${h.length}` : 'Ещё нет записей'}</span></span></div>
        ${last.length > 1 ? `<div class="chart" style="height:60px">${last.map(x => `<div class="bar" title="${x.d}: ${x.v}"><div style="height:${x.v / mx * 100}%"></div><span>${x.d.slice(8)}</span></div>`).join('')}</div>` : ''}
        <div class="exbtns" style="margin-top:10px"><input type="number" inputmode="decimal" step="0.5" min="0" class="inp" data-rin="${r.id}" placeholder="Результат, ${r.unit}" style="margin:0;flex:2">
        <button class="btn small" data-rs="${r.id}" style="flex:1">Записать</button></div></div>`; }).join('');
  bindBack();
  document.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => {
    const id = b.dataset.rs, inp = document.querySelector(`[data-rin="${id}"]`), v = parseFloat(inp.value);
    if (!(v >= 0)) return toast('Введите число');
    const h = S.records[id] = S.records[id] || [], prev = h.length ? Math.max(...h.map(x => x.v)) : -1;
    h.push({ d:today(), v }); count('records'); save();
    if (v > prev && prev >= 0) { toast('🏆 Новый рекорд!'); gainXP(10); } else gainXP(3);
    renderRecords();
  });
}

/* ───── Дневник ощущений ───── */
function renderMood(){
  const vals = Object.fromEntries(MOOD_SCALES.map(m => [m.id, 5]));
  const last = S.mood.slice(-10);
  $app.innerHTML = backbar('Дневник ощущений') + `<p class="muted">После практики или близости отметьте ощущения по шкалам — без текста.</p>
    <div class="card">${MOOD_SCALES.map(m => `<div style="margin:10px 0"><div class="cb"><span>${m.icon} ${m.title}</span><b id="mv-${m.id}">5</b></div>
      <input type="range" min="1" max="10" value="5" data-mood="${m.id}" style="width:100%"></div>`).join('')}
      <button class="btn ok" id="msave">Сохранить запись</button></div>
    ${last.length ? `<h3 class="grp">Последние ${last.length} записей</h3>` + MOOD_SCALES.map(m => `<div class="card"><b>${m.icon} ${m.title}</b>
      <span class="muted">· среднее ${(last.reduce((a, e) => a + e.vals[m.id], 0) / last.length).toFixed(1)}</span>
      <div class="chart" style="height:60px">${last.map(e => `<div class="bar"><div style="height:${e.vals[m.id] * 10}%"></div><span>${e.d.slice(8)}</span></div>`).join('')}</div></div>`).join('')
      : '<p class="muted center">Здесь появятся графики после первых записей.</p>'}`;
  bindBack();
  document.querySelectorAll('[data-mood]').forEach(r => r.oninput = () => { vals[r.dataset.mood] = +r.value; document.getElementById('mv-' + r.dataset.mood).textContent = r.value; });
  document.getElementById('msave').onclick = () => { S.mood.push({ d:today(), vals:{...vals} }); count('mood'); gainXP(5); toast('Запись сохранена'); renderMood(); };
}
