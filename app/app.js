const KEY = 'oralingo-v1';
const XP_LESSON = 10, XP_TASK = 15;
const $app = document.getElementById('app');

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const DEFAULTS = () => ({ adult:false, done:{}, tasksDone:{}, xp:0, streak:0, lastDay:null, reports:[], tab:'learn',
  daily:{}, xpLog:{}, goal:30, ach:{}, quizStats:{}, records:{}, mood:[], wish:[], combos:[], challenge:{}, settings:{}, counts:{} });
let S = Object.assign(DEFAULTS(), load());
for (const k of ['daily','xpLog','ach','quizStats','records','challenge','settings','counts']) S[k] = S[k] || {};
// миграция старого формата тренировки рефлекса
if (S.reflex) { S.daily.reflex = S.daily.reflex || S.reflex; delete S.reflex; }
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

const xpToday = () => S.xpLog[today()] || 0;
function gainXP(n){
  S.xp += n; S.xpLog[today()] = xpToday() + n; bumpStreak(); save();
  if (typeof checkAchievements === 'function') checkAchievements();
}
function toast(msg){
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg;
  document.body.appendChild(t); setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
}
const VIEWS = {};

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
  const done = Object.keys(S.done).length, g = Math.min(100, xpToday() / S.goal * 100);
  return `<div class="top"><span class="logo">${brand()}</span>
    <span class="stat" title="Дней подряд">🔥 ${liveStreak()}</span>
    <span class="stat" title="Опыт">⭐ ${S.xp}</span>
    <span class="stat" title="Уроков пройдено">📘 ${done}/${ALL.length}</span></div>
    <div class="goalbar" title="Цель дня: ${xpToday()}/${S.goal} XP"><div style="width:${g}%"></div><span>🎯 Цель дня ${xpToday()}/${S.goal} XP</span></div>`;
}
function nav(){
  const b = (t, ic, label) => `<button data-tab="${t}" class="${S.tab===t?'on':''}"><span class="ic">${ic}</span>${label}</button>`;
  return `<div class="nav">${b('learn','🏠','Курс')}${b('practice','🎯','Практика')}${b('tools','🧰','Тренер')}${b('journal','📓','История')}${b('profile','👤','Профиль')}</div>`;
}
function bindNav(){ document.querySelectorAll('.nav button').forEach(x => x.onclick = () => { S.tab = x.dataset.tab; save(); render(); }); }

function render(){
  if (!S.adult) return renderGate();
  window.scrollTo(0,0);
  if (typeof stopAllTimers === 'function') stopAllTimers();
  (VIEWS[S.tab] || VIEWS.learn)();
  bindNav();
}

/* ───── Learning path ───── */
function renderLearn(){
  const offsets = [0, 60, 90, 60, 0, -60, -90, -60];
  let html = topbar();
  html += dailyBanners();
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
  html += `<p class="muted center">📝 — урок с практическим заданием</p>` + nav();
  $app.innerHTML = html;
  bindBanners();
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
      S.tasksDone[lesson.id] = true; gainXP(XP_TASK); next(s);
    };
  }

  function finish(){
    if (mode === 'task') {
      $app.innerHTML = `<div class="center" style="padding-top:10vh"><div class="big">💪</div><h1>Задание выполнено!</h1>
        <p>${esc(lesson.title)}</p><div class="card"><p>⭐ +${XP_TASK} XP</p><p>🔥 Серия: ${S.streak} дн.</p></div>
        <button class="btn" id="home">К списку заданий</button></div>`;
      document.getElementById('home').onclick = () => { S.tab = 'practice'; render(); };
      return;
    }
    const first = !S.done[lesson.id];
    S.done[lesson.id] = true; gainXP(XP_LESSON);
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

/* ───── Practice: all tasks directly ───── */
function renderPractice(){
  const total = ALL.filter(hasTask).length, doneN = ALL.filter(l => S.tasksDone[l.id]).length;
  let html = topbar() + `<h1>Практика</h1><p class="muted">Все задания сразу, без прохождения уроков. Выполнено: ${doneN}/${total}</p>` + dailyBanners();
  COURSE.forEach(u => {
    const ls = u.lessons.filter(hasTask); if (!ls.length) return;
    html += `<div class="unit" style="background:${u.color};margin-top:20px"><h2>${u.title}</h2></div>`;
    ls.forEach(l => { const t = l.steps.find(s => s.type === 'task');
      html += `<button class="option row" data-task="${l.id}"><span class="rowic">${S.tasksDone[l.id] ? '✅' : l.icon}</span>
        <span><b>${cap(t.title.replace(/^(Итоговое |Финальное )?[Зз]адание:\s*/,''))}</b><br><span class="muted">${esc(l.title)} · ${t.checklist.length} пунктов</span></span></button>`; });
  });
  $app.innerHTML = html + nav();
  document.querySelectorAll('[data-task]').forEach(b => b.onclick = () => openTask(b.dataset.task));
  bindBanners();
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
  document.getElementById('x').onclick = () => render();
  document.getElementById('go').onclick = () => startLesson(id, 'task');
}

/* ───── Techniques library ───── */
function renderTech(){
  let html = backbar('Справочник техник') + `<h1>Техники</h1><p class="muted">Справочник: вся теория курса. Нажмите, чтобы раскрыть.</p>`;
  COURSE.forEach(u => {
    html += `<div class="unit" style="background:${u.color};margin-top:20px"><h2>${u.title}</h2></div>`;
    u.lessons.forEach(l => {
      const th = l.steps.filter(s => s.type === 'theory').map(s => s.body).join('');
      html += `<details class="card tech"><summary><span class="rowic">${l.icon}</span><b>${esc(l.title)}</b></summary>${th}
        <div class="row-btns">${hasTask(l) ? `<button class="btn ok" data-task="${l.id}">🎯 К заданию</button>` : ''}
        <button class="btn ghost" data-lesson="${l.id}">Пройти урок с тестом</button></div></details>`;
    });
  });
  $app.innerHTML = html;
  bindBack();
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


function backbar(title){ return `<div class="lessonhead"><button class="close" id="x" aria-label="Назад">←</button><b>${title}</b></div>`; }
function bindBack(fn){ const x = document.getElementById('x'); if (x) x.onclick = fn || (() => render()); }

Object.assign(VIEWS, { learn:renderLearn, practice:renderPractice, journal:renderJournal });
