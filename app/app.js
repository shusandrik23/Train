(() => {
const KEY = 'oralingo-v1';
const XP_LESSON = 10, XP_TASK = 15;
const $app = document.getElementById('app');

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let S = Object.assign({ adult:false, done:{}, xp:0, streak:0, lastDay:null, reports:[], tab:'learn' }, load());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

const ALL = COURSE.flatMap(u => u.lessons.map(l => ({...l, unit:u})));
const isUnlocked = id => { const i = ALL.findIndex(l => l.id === id); return i === 0 || !!S.done[ALL[i-1].id]; };
const hasTask = l => l.steps.some(s => s.type === 'task');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    <p class="muted">Курс сексуального просвещения для взрослых: 8 разделов, 50 уроков, теория, тесты и практические задания с отчётами.</p>
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
  const b = (t, label) => `<button data-tab="${t}" class="${S.tab===t?'on':''}">${label}</button>`;
  return `<div class="nav">${b('learn','🏠 Учёба')}${b('journal','📓 Отчёты')}${b('profile','👤 Профиль')}</div>`;
}
function bindNav(){ document.querySelectorAll('.nav button').forEach(x => x.onclick = () => { S.tab = x.dataset.tab; save(); render(); }); }

function render(){
  if (!S.adult) return renderGate();
  window.scrollTo(0,0);
  ({learn:renderLearn, journal:renderJournal, profile:renderProfile})[S.tab]();
  bindNav();
}

/* ───── Learning path ───── */
function renderLearn(){
  const offsets = [0, 60, 90, 60, 0, -60, -90, -60];
  let html = topbar();
  COURSE.forEach(u => {
    const doneN = u.lessons.filter(l => S.done[l.id]).length;
    html += `<div class="unit" style="background:${u.color}"><div class="unit-title"><h2>${u.title}</h2>
      <span class="unit-count">${doneN}/${u.lessons.length}</span></div><p>${u.desc}</p></div><div class="path">`;
    u.lessons.forEach((l, i) => {
      const st = S.done[l.id] ? 'done' : isUnlocked(l.id) ? '' : 'locked';
      html += `<div style="transform:translateX(${offsets[i % offsets.length]}px);display:flex;flex-direction:column;align-items:center">
        <button class="node ${st} ${hasTask(l)?'task':''}" data-id="${l.id}" ${st==='locked'?'aria-disabled="true"':''}>${st==='done'?'✓':st==='locked'?'🔒':l.icon}</button>
        <div class="node-label" style="margin-top:6px">${esc(l.title)}${hasTask(l)?' · 📝':''}</div></div>`;
    });
    html += `</div>`;
  });
  html += `<p class="muted center">📝 — урок с практическим заданием и отчётом</p>` + nav();
  $app.innerHTML = html;
  document.querySelectorAll('.node').forEach(n => n.onclick = () => { if (isUnlocked(n.dataset.id)) startLesson(n.dataset.id); });
  const cur = document.querySelector('.node:not(.done):not(.locked)');
  if (cur) cur.scrollIntoView({block:'center'});
}

/* ───── Lesson player ───── */
function startLesson(id){
  const lesson = ALL.find(l => l.id === id);
  const queue = lesson.steps.map((s, i) => ({...s, key:i}));
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
    document.getElementById('x').onclick = () => { if (confirm('Выйти из урока? Прогресс урока не сохранится.')) render(); };
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
      <div class="card">${s.body}<p class="muted">Выполните задание, затем отметьте пункты и напишите отчёт. Можно закрыть урок и вернуться, когда выполните.</p></div>
      <div class="card"><b>Чек-лист</b>${s.checklist.map((c,i) => `<label class="check"><input type="checkbox" data-c="${i}"> <span>${c}</span></label>`).join('')}</div>
      <div class="card"><b>Отчёт</b><p class="muted">Что получилось, что было трудно, что заметили?</p>
        <textarea id="rep" placeholder="Минимум 20 символов…"></textarea>
        <p style="margin-bottom:0"><b>Как прошло?</b></p><div class="stars">${[1,2,3,4,5].map(n => `<button data-n="${n}" aria-label="${n}">⭐</button>`).join('')}</div></div></div>
      <div class="footer"><div class="inner"><button class="btn ok" id="send" disabled>Отправить отчёт</button></div></div><div style="height:90px"></div>`;
    const boxes = [...document.querySelectorAll('[data-c]')], rep = document.getElementById('rep'), send = document.getElementById('send');
    const stars = [...document.querySelectorAll('.stars button')];
    const validate = () => { send.disabled = !(boxes.every(b => b.checked) && rep.value.trim().length >= 20 && rating > 0); };
    boxes.forEach(b => b.onchange = validate); rep.oninput = validate;
    stars.forEach(st => st.onclick = () => { rating = +st.dataset.n; stars.forEach(x => x.classList.toggle('on', +x.dataset.n <= rating)); validate(); });
    send.onclick = () => {
      S.reports.unshift({ lesson:lesson.title, unit:lesson.unit.title, task:s.title, date:new Date().toISOString(),
        checklist:s.checklist, text:rep.value.trim(), rating });
      S.xp += XP_TASK; save(); next(s);
    };
  }

  function finish(){
    const first = !S.done[lesson.id];
    S.done[lesson.id] = true; S.xp += XP_LESSON; bumpStreak(); save();
    const idx = ALL.findIndex(l => l.id === lesson.id), nxt = ALL[idx+1];
    $app.innerHTML = `<div class="center" style="padding-top:10vh"><div class="big">${idx === ALL.length-1 ? '🏆' : '🎉'}</div>
      <h1>Урок пройден!</h1><p>${esc(lesson.title)}</p>
      <div class="card"><p>⭐ +${XP_LESSON + (hasTask(lesson) ? XP_TASK : 0)} XP</p><p>🎯 Ошибок: ${mistakes}</p><p>🔥 Серия: ${S.streak} дн.</p>
      ${first ? '' : '<p class="muted">Повторение урока</p>'}</div>
      ${nxt ? `<button class="btn" id="nx">Следующий урок: ${esc(nxt.title)}</button><div style="height:12px"></div>` : '<p>Вы прошли весь курс! 🎓</p>'}
      <button class="btn ghost" id="home">На карту</button></div>`;
    document.getElementById('home').onclick = render;
    if (nxt) document.getElementById('nx').onclick = () => startLesson(nxt.id);
  }

  step();
}

/* ───── Journal ───── */
function renderJournal(){
  const items = S.reports.map(r => `<div class="entry">
    <div class="muted">${new Date(r.date).toLocaleString('ru-RU')} · ${'⭐'.repeat(r.rating)}</div>
    <b>${esc(r.task)}</b><div class="muted">${esc(r.lesson)}</div>
    <p style="white-space:pre-wrap;margin:6px 0">${esc(r.text)}</p>
    <div class="muted">✓ ${r.checklist.map(esc).join(' · ✓ ')}</div></div>`).join('');
  $app.innerHTML = topbar() + `<h1>Дневник отчётов</h1>
    <div class="card">${items || '<p class="muted">Пока пусто. Отчёты появятся после практических заданий 📝.</p>'}</div>` + nav();
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
    <p>📘 Уроков: <b>${done}/${ALL.length}</b></p><p>📝 Отчётов: <b>${S.reports.length}</b> (заданий в курсе: ${tasksTotal})</p></div>
    <div class="card"><b>Прогресс по разделам</b>${units}</div>
    <div class="card"><p class="muted">Курс носит образовательный характер. При боли, травмах или проблемах со здоровьем обратитесь к врачу.</p></div>
    <button class="btn ghost" id="reset">Сбросить прогресс</button>` + nav();
  document.getElementById('reset').onclick = () => { if (confirm('Удалить весь прогресс и отчёты?')) { S = { adult:true, done:{}, xp:0, streak:0, lastDay:null, reports:[], tab:'learn' }; save(); render(); } };
}

render();
})();
