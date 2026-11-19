(() => {
const KEY = 'oralingo-v1';
const XP_LESSON = 10, XP_TASK = 15;
const $app = document.getElementById('app');

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let S = Object.assign({ adult:false, done:{}, tasksDone:{}, xp:0, streak:0, lastDay:null, reports:[], tab:'learn' }, load());
S.reflex = Object.assign({ log:{}, plan:null }, S.reflex);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

const ALL = COURSE.flatMap(u => u.lessons.map(l => ({...l, unit:u})));
const isUnlocked = () => true; // все уроки открыты сразу
const hasTask = l => l.steps.some(s => s.type === 'task');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const today = () => new Date().toISOString().slice(0,10);

function bumpStreak(){
  const t = today(); if (S.lastDay === t) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0,10);
  S.streak = S.lastDay === y ? S.streak + 1 : 1; S.lastDay = t;
}
const liveStreak = () => {
  const y = new Date(Date.now() - 864e5).toISOString().slice(0,10);
  return (S.lastDay === today() || S.lastDay === y) ? S.streak : 0;
};

/* ───── Age gate ───── */
function renderGate(){
  $app.innerHTML = `<div class="center" style="padding-top:12vh">
    <div class="big">🔞</div><h1>Oralingo</h1>
    <p class="muted">Курс сексуального просвещения для взрослых. Разделов: ${COURSE.length}, уроков: ${ALL.length}, практических заданий с отчётами: ${ALL.filter(hasTask).length}.</p>
    <div class="card" style="text-align:left"><p>Продолжая, вы подтверждаете, что вам <b>исполнилось 18 лет</b> и вы хотите видеть откровенный образовательный контент.</p>
    <p class="muted">Прогресс хранится только в этом браузере.</p></div>
    <button class="btn" id="yes">Мне 18+, начать</button><div style="height:12px"></div>
    <button class="btn ghost" id="no">Выйти</button></div>`;
  document.getElementById('yes').onclick = () => { S.adult = true; save(); render(); };
  document.getElementById('no').onclick = () => { $app.innerHTML = '<p class="center" style="padding-top:30vh">Контент доступен только взрослым.</p>'; };
}

/* ───── Shell ───── */
function topbar(){
  const done = Object.keys(S.done).length;
  return `<div class="top"><span class="logo">Oralingo</span>
    <span class="stat" title="Дней подряд">🔥 ${liveStreak()}</span>
    <span class="stat" title="Опыт">⭐ ${S.xp}</span>
    <span class="stat" title="Уроков пройдено">📘 ${done}/${ALL.length}</span></div>`;
}
function nav(){
  const b = (t, ic, label) => `<button data-tab="${t}" class="${S.tab===t?'on':''}"><span class="ic">${ic}</span>${label}</button>`;
  return `<div class="nav">${b('learn','🏠','Курс')}${b('practice','🎯','Практика')}${b('tech','📚','Техники')}${b('journal','📓','История')}${b('profile','👤','Профиль')}</div>`;
}
function bindNav(){ document.querySelectorAll('.nav button').forEach(x => x.onclick = () => { S.tab = x.dataset.tab; save(); render(); }); }

function render(){
  if (!S.adult) return renderGate();
  window.scrollTo(0,0);
  ({learn:renderLearn, practice:renderPractice, tech:renderTech, journal:renderJournal, profile:renderProfile}[S.tab] || renderLearn)();
  bindNav();
}

/* ───── Learning path ───── */
function renderLearn(){
  const offsets = [0, 60, 90, 60, 0, -60, -90, -60];
  let html = topbar();
  html += reflexBanner();
  COURSE.forEach(u => {
    const doneN = u.lessons.filter(l => S.done[l.id]).length;
    html += `<div class="unit" style="background:${u.color}"><div class="unit-title"><h2>${u.title}</h2>
      <span class="unit-count">${doneN}/${u.lessons.length}</span></div><p>${u.desc}</p></div><div class="path">`;
    u.lessons.forEach((l, i) => {
      const st = S.done[l.id] ? 'done' : '';
      html += `<div style="transform:translateX(${offsets[i % offsets.length]}px);display:flex;flex-direction:column;align-items:center">
        <button class="node ${st} ${hasTask(l)?'task':''}" data-id="${l.id}" ${st==='locked'?'aria-disabled="true"':''}>${st==='done'?'✓':st==='locked'?'🔒':l.icon}</button>
        <div class="node-label" style="margin-top:6px">${esc(l.title)}${hasTask(l)?' · 📝':''}</div></div>`;
    });
    html += `</div>`;
  });
  html += `<p class="muted center">📝 — урок с практическим заданием и отчётом</p>` + nav();
  $app.innerHTML = html;
  bindBanner();
  document.querySelectorAll('.node').forEach(n => n.onclick = () => { if (isUnlocked(n.dataset.id)) startLesson(n.dataset.id); });
  const cur = document.querySelector('.node:not(.done)');
  if (cur) cur.scrollIntoView({block:'center'});
}

/* ───── Lesson player ───── */
function startLesson(id, mode){
  const lesson = ALL.find(l => l.id === id);
  const back = mode === 'task' ? 'practice' : 'learn';
  const queue = lesson.steps.map((s, i) => ({...s, key:i})).filter(s => mode !== 'task' || s.type === 'task');
  const total = queue.length;
  const solved = new Set();
  let mistakes = 0;

  const step = () => {
    window.scrollTo(0,0);
    if (!queue.length) return finish();
    const s = queue[0];
    const pct = Math.round(solved.size / total * 100);
    const head = `<div class="lessonhead"><button class="close" id="x" aria-label="Закрыть">✕</button>
      <div class="progress"><div style="width:${pct}%"></div></div></div>`;
    if (s.type === 'theory') theory(s, head);
    else if (s.type === 'quiz') quiz(s, head);
    else task(s, head);
    document.getElementById('x').onclick = () => { if (confirm('Выйти? Несохранённый прогресс пропадёт.')) { S.tab = back; render(); } };
  };
  const next = s => { solved.add(s.key); queue.shift(); step(); };

  function theory(s, head){
    $app.innerHTML = `${head}<div class="lesson"><span class="pill">Теория</span><h1>${s.title}</h1><div class="card">${s.body}</div></div>
      <div class="footer"><div class="inner"><button class="btn" id="go">Понятно</button></div></div><div style="height:90px"></div>`;
    document.getElementById('go').onclick = () => next(s);
  }

  function quiz(s, head){
    let sel = null;
    $app.innerHTML = `${head}<span class="pill">Вопрос</span><div class="qtitle">${s.q}</div>
      ${s.options.map((o,i) => `<button class="option" data-i="${i}">${o}</button>`).join('')}
      <div class="footer"><div class="inner"><div id="fb"></div><button class="btn" id="chk" disabled>Проверить</button></div></div><div style="height:150px"></div>`;
    const opts = [...document.querySelectorAll('.option')], chk = document.getElementById('chk');
    opts.forEach(o => o.onclick = () => { if (chk.dataset.state) return;
      opts.forEach(x => x.classList.remove('sel')); o.classList.add('sel'); sel = +o.dataset.i; chk.disabled = false; });
    chk.onclick = () => {
      if (chk.dataset.state === 'right') return next(s);
      if (chk.dataset.state === 'wrong') { queue.push(queue.shift()); return step(); }
      const ok = sel === s.answer;
      opts[s.answer].classList.add('right'); if (!ok) { opts[sel].classList.add('wrong'); mistakes++; }
      document.getElementById('fb').innerHTML = `<div class="feedback ${ok?'right':'wrong'}">${ok?'✅ Верно!':'❌ Не совсем. Вопрос вернётся позже.'}</div><p class="muted" style="margin-top:-6px">${s.explain}</p>`;
      chk.textContent = 'Далее'; chk.className = 'btn' + (ok ? ' ok' : ''); chk.dataset.state = ok ? 'right' : 'wrong';
    };
  }

  function task(s, head){
    let rating = 0;
    $app.innerHTML = `${head}<div class="lesson"><span class="pill">Практика</span><h1>${s.title}</h1>
      <div class="card">${s.body}<p class="muted">Выполните задание и отметьте пункты. Можно закрыть урок и вернуться, когда выполните.</p></div>
      <div class="card"><b>Чек-лист</b>${s.checklist.map((c,i) => `<label class="check"><input type="checkbox" data-c="${i}"> <span>${c}</span></label>`).join('')}</div>
      <div class="card"><b>Как прошло?</b><div class="stars">${[1,2,3,4,5].map(n => `<button data-n="${n}" aria-label="${n}">⭐</button>`).join('')}</div></div></div>
      <div class="footer"><div class="inner"><button class="btn ok" id="send" disabled>Готово ✓</button></div></div><div style="height:90px"></div>`;
    const boxes = [...document.querySelectorAll('[data-c]')], send = document.getElementById('send');
    const stars = [...document.querySelectorAll('.stars button')];
    const validate = () => { send.disabled = !(boxes.every(b => b.checked) && rating > 0); };
    boxes.forEach(b => b.onchange = validate);
    stars.forEach(st => st.onclick = () => { rating = +st.dataset.n; stars.forEach(x => x.classList.toggle('on', +x.dataset.n <= rating)); validate(); });
    send.onclick = () => {
      S.reports.unshift({ lesson:lesson.title, unit:lesson.unit.title, task:s.title, date:new Date().toISOString(),
        checklist:s.checklist, rating });
      S.tasksDone[lesson.id] = true; S.xp += XP_TASK; save(); next(s);
    };
  }

  function finish(){
    if (mode === 'task') {
      bumpStreak(); save();
      $app.innerHTML = `<div class="center" style="padding-top:10vh"><div class="big">💪</div><h1>Задание выполнено!</h1>
        <p>${esc(lesson.title)}</p><div class="card"><p>⭐ +${XP_TASK} XP</p><p>🔥 Серия: ${S.streak} дн.</p></div>
        <button class="btn" id="home">К списку заданий</button></div>`;
      document.getElementById('home').onclick = () => { S.tab = 'practice'; render(); };
      return;
    }
    const first = !S.done[lesson.id];
    S.done[lesson.id] = true; S.xp += XP_LESSON; bumpStreak(); save();
    const idx = ALL.findIndex(l => l.id === lesson.id), nxt = ALL[idx+1];
    $app.innerHTML = `<div class="center" style="padding-top:10vh"><div class="big">${idx === ALL.length-1 ? '🏆' : '🎉'}</div>
      <h1>Урок пройден!</h1><p>${esc(lesson.title)}</p>
      <div class="card"><p>⭐ +${XP_LESSON + (hasTask(lesson) ? XP_TASK : 0)} XP</p><p>🎯 Ошибок: ${mistakes}</p><p>🔥 Серия: ${S.streak} дн.</p>
      ${first ? '' : '<p class="muted">Повторение урока</p>'}</div>
      ${nxt ? `<button class="btn" id="nx">Следующий урок: ${esc(nxt.title)}</button><div style="height:12px"></div>` : '<p>Вы прошли весь курс! 🎓</p>'}
      <button class="btn ghost" id="home">На карту</button></div>`;
    document.getElementById('home').onclick = () => { S.tab = 'learn'; render(); };
    if (nxt) document.getElementById('nx').onclick = () => startLesson(nxt.id);
  }

  step();
}

/* ───── Daily gag-reflex training ───── */
const REFLEX_SIZE = 4; // основных упражнений в день
const reflexDays = () => Object.keys(S.reflex.log).length;
const reflexLevel = () => { const d = reflexDays(); return d >= 14 ? 3 : d >= 7 ? 2 : 1; };
const REF = id => REFLEX.find(r => r.id === id);
const fmtSec = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

function seeded(seed){ let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
function shuffle(arr, rnd){ const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function makePlan(){
  const lvl = reflexLevel(), rnd = seeded(today() + ':' + reflexDays());
  const pick = (kind, n, pool) => shuffle(pool || REFLEX.filter(r => r.kind === kind && r.level <= lvl), rnd).slice(0, n).map(r => r.id);
  let main = [];
  if (lvl > 1) main = pick('main', 1, REFLEX.filter(r => r.kind === 'main' && r.level === lvl)); // одно упражнение текущего уровня
  main = main.concat(pick('main', REFLEX_SIZE + 2).filter(id => !main.includes(id))).slice(0, REFLEX_SIZE);
  return { date:today(), ids:[...pick('warmup', 1), ...main, ...pick('cool', 1)], done:[] };
}
function todayPlan(){
  if (!S.reflex.plan || S.reflex.plan.date !== today()) { S.reflex.plan = makePlan(); save(); }
  return S.reflex.plan;
}

function reflexBanner(){
  const p = todayPlan(), doneToday = !!S.reflex.log[today()];
  const n = p.done.length, total = p.ids.length;
  return `<button class="banner" id="reflexBanner">
    <span class="rowic">${doneToday ? '✅' : '🌬️'}</span>
    <span style="flex:1;text-align:left"><b>Ежедневная тренировка рефлекса</b><br>
    <span class="sub">${doneToday ? 'Сегодня выполнено — отлично!' : `Сегодня: ${total} упражнений · ${n}/${total}`} · уровень ${reflexLevel()}</span></span>
    <span style="font-size:22px">›</span></button>`;
}
function bindBanner(){ const b = document.getElementById('reflexBanner'); if (b) b.onclick = renderReflex; }

let reflexTimer = null;
function stopTimer(){ if (reflexTimer) { clearInterval(reflexTimer.id); reflexTimer = null; } }

function renderReflex(){
  stopTimer(); window.scrollTo(0,0);
  const p = todayPlan(), lvl = reflexLevel(), days = reflexDays(), doneToday = S.reflex.log[today()];
  const nextLvl = lvl === 1 ? `Уровень 2 откроется через ${7 - days} дн. тренировок` : lvl === 2 ? `Уровень 3 откроется через ${14 - days} дн. тренировок` : 'Максимальный уровень';
  const label = {warmup:'Разминка', main:'Основное', cool:'Заминка'};
  const cards = p.ids.map((id, i) => { const r = REF(id), done = p.done.includes(id);
    return `<div class="card ex ${done ? 'exdone' : ''}" data-ex="${id}">
      <div class="exhead"><span class="rowic">${done ? '✅' : r.icon}</span>
        <span style="flex:1"><span class="pill">${label[r.kind]}${r.level > 1 ? ' · ур. ' + r.level : ''}</span><br><b>${r.title}</b> <span class="muted">· ${fmtSec(r.sec)}</span></span>
        ${done ? '' : `<button class="swap" data-swap="${i}" title="Заменить упражнение">🔀</button>`}</div>
      <p style="margin:8px 0">${r.how}</p>
      ${done ? '' : `<div class="exbtns"><button class="btn small" data-start="${id}">▶ Таймер ${fmtSec(r.sec)}</button>
        <button class="btn small ghost" data-mark="${id}">Готово</button></div>`}</div>`; }).join('');
  const allDone = p.done.length === p.ids.length;

  // график последних 14 дней
  const bars = []; for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i*864e5).toISOString().slice(0,10), e = S.reflex.log[d];
    bars.push(`<div class="bar" title="${d}${e ? ': ' + e.rating + '/10' : ''}"><div style="height:${e ? e.rating*10 : 0}%"></div><span>${d.slice(8)}</span></div>`);
  }

  $app.innerHTML = `<div class="lessonhead"><button class="close" id="x" aria-label="Назад">←</button><b>Тренировка рефлекса</b></div>
    <div class="card"><p style="margin-top:0">🔥 Дней тренировок: <b>${days}</b> · 📈 Уровень: <b>${lvl}</b></p>
      <p class="muted" style="margin:0">${nextLvl}. Каждый день — новый набор упражнений. Не нравится упражнение — нажмите 🔀.</p></div>
    ${warn('Только до границы комфорта. Боль, першение или охриплость — пропустите день.')}
    ${cards}
    ${doneToday ? `<div class="card center"><div class="big" style="margin:8px 0">🎉</div><b>Тренировка на сегодня выполнена</b>
      <p class="muted">Чувствительность рефлекса: ${doneToday.rating}/10. Возвращайтесь завтра за новым набором.</p></div>` :
    `<div class="card"><b>Насколько сильный рефлекс сегодня?</b>
      <p class="muted" style="margin:4px 0">1 — почти не чувствую, 10 — очень сильный</p>
      <input type="range" min="1" max="10" value="5" id="rate" style="width:100%"><div class="center"><b id="rateV">5</b>/10</div>
      <button class="btn ok" id="finish" ${allDone ? '' : 'disabled'}>${allDone ? 'Завершить тренировку' : `Выполните все упражнения (${p.done.length}/${p.ids.length})`}</button></div>`}
    <div class="card"><b>Чувствительность за 14 дней</b><div class="chart">${bars.join('')}</div>
      <p class="muted" style="margin-bottom:0">Чем ниже столбики — тем лучше результат.</p></div>
    <details class="card"><summary><b>📚 Все упражнения (${REFLEX.length})</b></summary>
      ${REFLEX.map(r => `<div class="entry"><b>${r.icon} ${r.title}</b> <span class="muted">· ${label[r.kind]} · ур. ${r.level}${r.level > lvl ? ' 🔒' : ''}</span><p style="margin:4px 0">${r.how}</p></div>`).join('')}</details>
    <div id="timerBox"></div><div style="height:40px"></div>`;

  document.getElementById('x').onclick = () => { stopTimer(); render(); };
  const mark = id => { if (!p.done.includes(id)) p.done.push(id); save(); renderReflex(); };
  document.querySelectorAll('[data-mark]').forEach(b => b.onclick = () => mark(b.dataset.mark));
  document.querySelectorAll('[data-swap]').forEach(b => b.onclick = () => {
    const i = +b.dataset.swap, cur = REF(p.ids[i]);
    const opts = REFLEX.filter(r => r.kind === cur.kind && r.level <= lvl && !p.ids.includes(r.id));
    if (!opts.length) return alert('Других упражнений этого типа на вашем уровне пока нет.');
    p.ids[i] = opts[Math.floor(Math.random() * opts.length)].id; save(); renderReflex();
  });
  document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => {
    const r = REF(b.dataset.start); stopTimer();
    let left = r.sec; const box = document.getElementById('timerBox');
    const draw = () => { box.innerHTML = `<div class="timer"><div class="inner"><span style="font-size:22px">${r.icon}</span>
      <span style="flex:1"><b>${r.title}</b><div class="progress"><div style="width:${(1 - left / r.sec) * 100}%"></div></div></span>
      <b class="tnum">${fmtSec(left)}</b><button class="close" id="tstop">✕</button></div></div>`;
      document.getElementById('tstop').onclick = () => { stopTimer(); box.innerHTML = ''; }; };
    draw();
    reflexTimer = { id: setInterval(() => { left--; if (left <= 0) { stopTimer(); try { navigator.vibrate && navigator.vibrate([200,100,200]); } catch {} mark(r.id); } else draw(); }, 1000) };
  });
  const rate = document.getElementById('rate');
  if (rate) rate.oninput = () => document.getElementById('rateV').textContent = rate.value;
  const fin = document.getElementById('finish');
  if (fin) fin.onclick = () => {
    const rating = +rate.value;
    S.reflex.log[today()] = { rating, ex:p.ids.slice() };
    S.reports.unshift({ lesson:'Ежедневная тренировка рефлекса', unit:'', task:'🌬️ Тренировка рефлекса', date:new Date().toISOString(),
      checklist:p.ids.map(id => REF(id).title), rating:0, text:`Чувствительность рефлекса: ${rating}/10` });
    S.xp += XP_TASK; bumpStreak(); save(); renderReflex();
  };
}


/* ───── Practice: all tasks directly ───── */
function renderPractice(){
  const total = ALL.filter(hasTask).length, doneN = ALL.filter(l => S.tasksDone[l.id]).length;
  let html = topbar() + `<h1>Практика</h1><p class="muted">Все задания сразу, без прохождения уроков. Выполнено: ${doneN}/${total}</p>` + reflexBanner();
  COURSE.forEach(u => {
    const ls = u.lessons.filter(hasTask); if (!ls.length) return;
    html += `<div class="unit" style="background:${u.color};margin-top:20px"><h2>${u.title}</h2></div>`;
    ls.forEach(l => { const t = l.steps.find(s => s.type === 'task');
      html += `<button class="option row" data-task="${l.id}"><span class="rowic">${S.tasksDone[l.id] ? '✅' : l.icon}</span>
        <span><b>${cap(t.title.replace(/^(Итоговое |Финальное )?[Зз]адание:\s*/,''))}</b><br><span class="muted">${esc(l.title)} · ${t.checklist.length} пунктов</span></span></button>`; });
  });
  $app.innerHTML = html + nav();
  document.querySelectorAll('[data-task]').forEach(b => b.onclick = () => openTask(b.dataset.task));
  bindBanner();
}
function openTask(id){
  const l = ALL.find(x => x.id === id), t = l.steps.find(s => s.type === 'task');
  const theory = l.steps.filter(s => s.type === 'theory');
  window.scrollTo(0,0);
  $app.innerHTML = `<div class="lessonhead"><button class="close" id="x" aria-label="Назад">←</button><b>${esc(l.title)}</b></div>
    <span class="pill">Практика</span><h1 style="margin-top:4px">${t.title}</h1><div class="card">${t.body}
    <b>Чек-лист</b><ul>${t.checklist.map(c => `<li>${c}</li>`).join('')}</ul></div>
    <details class="card"><summary><b>📖 Теория к заданию</b></summary>${theory.map(s => s.body).join('')}</details>
    <div class="footer"><div class="inner"><button class="btn ok" id="go">Я выполнил(а) — отметить</button></div></div><div style="height:90px"></div>`;
  document.getElementById('x').onclick = () => { S.tab = 'practice'; render(); };
  document.getElementById('go').onclick = () => startLesson(id, 'task');
}

/* ───── Techniques library ───── */
function renderTech(){
  let html = topbar() + `<h1>Техники</h1><p class="muted">Справочник: вся теория курса. Нажмите, чтобы раскрыть.</p>`;
  COURSE.forEach(u => {
    html += `<div class="unit" style="background:${u.color};margin-top:20px"><h2>${u.title}</h2></div>`;
    u.lessons.forEach(l => {
      const th = l.steps.filter(s => s.type === 'theory').map(s => s.body).join('');
      html += `<details class="card tech"><summary><span class="rowic">${l.icon}</span><b>${esc(l.title)}</b></summary>${th}
        <div class="row-btns">${hasTask(l) ? `<button class="btn ok" data-task="${l.id}">🎯 К заданию</button>` : ''}
        <button class="btn ghost" data-lesson="${l.id}">Пройти урок с тестом</button></div></details>`;
    });
  });
  $app.innerHTML = html + nav();
  document.querySelectorAll('[data-task]').forEach(b => b.onclick = () => openTask(b.dataset.task));
  document.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => startLesson(b.dataset.lesson));
}

/* ───── Journal ───── */
function renderJournal(){
  const items = S.reports.map(r => `<div class="entry">
    <div class="muted">${new Date(r.date).toLocaleString('ru-RU')} · ${'⭐'.repeat(r.rating)}</div>
    <b>${esc(r.task)}</b><div class="muted">${esc(r.lesson)}</div>
    ${r.text ? `<p style="white-space:pre-wrap;margin:6px 0">${esc(r.text)}</p>` : ''}
    <div class="muted">✓ ${r.checklist.map(esc).join(' · ✓ ')}</div></div>`).join('');
  $app.innerHTML = topbar() + `<h1>История</h1>
    <div class="card">${items || '<p class="muted">Пока пусто. Здесь появятся выполненные задания и тренировки.</p>'}</div>` + nav();
}

/* ───── Profile ───── */
function renderProfile(){
  const done = Object.keys(S.done).length;
  const tasksTotal = ALL.filter(hasTask).length;
  const units = COURSE.map(u => { const d = u.lessons.filter(l => S.done[l.id]).length;
    return `<div style="margin:10px 0"><div class="muted">${u.title} — ${d}/${u.lessons.length}</div>
      <div class="progress"><div style="width:${d/u.lessons.length*100}%;background:${u.color}"></div></div></div>`; }).join('');
  $app.innerHTML = topbar() + `<h1>Профиль</h1>
    <div class="card"><p>⭐ Опыт: <b>${S.xp}</b></p><p>🔥 Серия: <b>${liveStreak()}</b> дн.</p>
    <p>📘 Уроков: <b>${done}/${ALL.length}</b></p><p>📝 Заданий выполнено: <b>${Object.keys(S.tasksDone).length}/${tasksTotal}</b></p><p>🌬️ Тренировок рефлекса: <b>${Object.keys(S.reflex.log).length}</b></p></div>
    <div class="card"><b>Прогресс по разделам</b>${units}</div>
    <div class="card"><p class="muted">Курс носит образовательный характер. При боли, травмах или проблемах со здоровьем обратитесь к врачу.</p></div>
    <button class="btn ghost" id="reset">Сбросить прогресс</button>` + nav();
  document.getElementById('reset').onclick = () => { if (confirm('Удалить весь прогресс и отчёты?')) { S = { adult:true, done:{}, tasksDone:{}, xp:0, streak:0, lastDay:null, reports:[], tab:'learn', reflex:{ log:{}, plan:null } }; save(); render(); } };
}

render();
})();
