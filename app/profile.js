/* ═════════ Профиль: навыки, достижения, настройки ═════════ */
const cnt = k => (S.counts && S.counts[k]) || 0;
const doneTasks = () => Object.keys(S.tasksDone).length;
const unitDone = ui => COURSE[ui].lessons.every(l => S.done[l.id]);

const ACHIEVEMENTS = [
 ['first', '🌱', 'Первый шаг', 'Пройти первый урок', () => Object.keys(S.done).length >= 1],
 ['l10', '📘', 'Ученик', 'Пройти 10 уроков', () => Object.keys(S.done).length >= 10],
 ['l37', '📗', 'Половина пути', 'Пройти половину курса', () => Object.keys(S.done).length >= Math.ceil(ALL.length / 2)],
 ['lall', '🎓', 'Выпускник', 'Пройти все уроки', () => Object.keys(S.done).length >= ALL.length],
 ['t1', '🎯', 'Практик', 'Выполнить первое задание', () => doneTasks() >= 1],
 ['t20', '💪', 'Деятель', 'Выполнить 20 заданий', () => doneTasks() >= 20],
 ['tall', '🏋️', 'Все задания', 'Выполнить все практические задания', () => doneTasks() >= ALL.filter(hasTask).length],
 ['s3', '🔥', 'Три дня подряд', 'Серия 3 дня', () => S.streak >= 3],
 ['s7', '🔥', 'Неделя огня', 'Серия 7 дней', () => S.streak >= 7],
 ['s30', '☄️', 'Месяц огня', 'Серия 30 дней', () => S.streak >= 30],
 ['r1', '🌬️', 'Первый вдох', 'Первая тренировка рефлекса', () => trackDays('reflex') >= 1],
 ['r7', '🌬️', 'Уровень 2', 'Открыть 2-й уровень тренировки рефлекса', () => trackDays('reflex') >= 7],
 ['r14', '🌪️', 'Уровень 3', 'Открыть 3-й уровень тренировки рефлекса', () => trackDays('reflex') >= 14],
 ['r30', '🧘', 'Мастер горла', '30 тренировок рефлекса', () => trackDays('reflex') >= 30],
 ['j7', '👄', 'Сильные губы', '7 тренировок рта и челюсти', () => trackDays('jaw') >= 7],
 ['u1', '💬', 'Мастер общения', 'Пройти раздел «Согласие и общение»', () => unitDone(0)],
 ['u6', '🌬️', 'Открытое горло', 'Пройти раздел о тренировке горла', () => unitDone(5)],
 ['u7', '🔥', 'Продвинутый', 'Пройти раздел продвинутых техник', () => unitDone(6)],
 ['sess', '💞', 'Командная работа', 'Завершить сессию', () => cnt('sessions') >= 1],
 ['sess10', '💞', 'Сыгранная пара', 'Завершить 10 сессий', () => cnt('sessions') >= 10],
 ['combo', '🧩', 'Хореограф', 'Сохранить свою связку', () => cnt('combos') >= 1],
 ['ch1', '🏅', 'Вызов принят', 'Выполнить вызов недели', () => cnt('challenges') >= 1],
 ['ch4', '🏆', 'Месяц вызовов', 'Выполнить 4 вызова недели', () => cnt('challenges') >= 4],
 ['myth', '🧠', 'Разрушитель мифов', 'Пройти «Мифы и факты»', () => cnt('myths') >= 1],
 ['mist', '🔍', 'Внимательный', 'Пройти «Найди ошибку»', () => cnt('mistakes') >= 1],
 ['rev5', '🔁', 'Отличная память', '5 повторений', () => cnt('review') >= 5],
 ['talk', '🗣️', 'Откровенность', 'Пройти все карточки для разговора', () => cnt('talkAll') >= 1],
 ['pq', '🔎', 'Знаток партнёра', 'Пройти анкету «Узнай партнёра»', () => cnt('pquiz') >= 1],
 ['rec', '📈', 'Рекордсмен', 'Записать 10 результатов', () => cnt('records') >= 10],
 ['mood', '📊', 'Самонаблюдение', '7 записей в дневнике ощущений', () => cnt('mood') >= 7],
 ['xp500', '⭐', '500 XP', 'Набрать 500 опыта', () => S.xp >= 500],
 ['xp2000', '🌟', '2000 XP', 'Набрать 2000 опыта', () => S.xp >= 2000],
 ['goal7', '🎯', 'Целеустремлённость', 'Выполнить цель дня 7 раз', () => Object.values(S.xpLog).filter(v => v >= S.goal).length >= 7],
];
function checkAchievements(){
  ACHIEVEMENTS.forEach(([id, ic, t, , cond]) => {
    if (!S.ach[id] && cond()) { S.ach[id] = today(); save(); setTimeout(() => toast(`${ic} Достижение: <b>${t}</b>`), 300); }
  });
}

/* ── Навыки ── */
const SKILL_LEVELS = ['Новичок', 'Ученик', 'Практик', 'Умелец', 'Мастер'];
function skillScore(sk){
  const ls = sk.lessons, lessonPart = ls.filter(id => S.done[id]).length / ls.length;
  const withTask = ls.filter(id => ALL.find(l => l.id === id && hasTask(l)));
  const taskPart = withTask.length ? withTask.filter(id => S.tasksDone[id]).length / withTask.length : lessonPart;
  let extra = 0;
  if (sk.tracks) extra = Math.min(1, sk.tracks.reduce((a, t) => a + trackDays(t), 0) / 21);
  else if (sk.tools) extra = Math.min(1, sk.tools.reduce((a, t) => a + cnt(t === 'combo' ? 'combos' : t === 'metro' ? 'sessions' : t), 0) / 5);
  else extra = taskPart;
  return Math.round((lessonPart * 0.4 + taskPart * 0.35 + extra * 0.25) * 100);
}

/* ── Календарь (.ics) для надёжных напоминаний ── */
function downloadFile(name, content, type){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function ics(summary, desc, dt, rrule){
  const p = n => String(n).padStart(2, '0'), f = d => `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
  const end = new Date(dt.getTime() + 15 * 60000);
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Trainer//RU','BEGIN:VEVENT', `UID:${Date.now()}@trainer`, `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(dt)}`, `DTEND:${f(end)}`, rrule ? `RRULE:${rrule}` : '', `SUMMARY:${summary}`, `DESCRIPTION:${desc}`,
    'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY',`DESCRIPTION:${summary}`,'END:VALARM','END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n');
}

/* ── PIN ── */
async function hashPin(pin){
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('oralingo:' + pin)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch { let h = 0; for (const c of 'oralingo:' + pin) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h; }
}
function pinPad(title, onDone, cancelable){
  let v = '';
  const draw = (err) => {
    $app.innerHTML = `<div class="center" style="padding-top:12vh"><div class="big">🔒</div><h2>${title}</h2>
      <div class="dots">${[0,1,2,3].map(i => `<span class="${i < v.length ? 'on' : ''}"></span>`).join('')}</div>
      <p class="feedback wrong" style="min-height:24px">${err || ''}</p>
      <div class="pad">${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => k === '' ? '<span></span>' : `<button data-k="${k}">${k}</button>`).join('')}</div>
      ${cancelable ? '<button class="btn ghost" id="pcancel" style="margin-top:16px">Отмена</button>' : ''}</div>`;
    document.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => {
      const k = b.dataset.k; if (k === '⌫') v = v.slice(0, -1); else if (v.length < 4) v += k;
      if (v.length === 4) { const r = await onDone(v); if (r === false) { v = ''; buzz([80, 60, 80]); return draw('Неверный код'); } return; }
      draw();
    });
    const c = document.getElementById('pcancel'); if (c) c.onclick = () => render();
  };
  draw();
}
function lockScreen(then){
  pinPad('Введите код', async v => { if (await hashPin(v) !== S.settings.pin) return false; sessionStorage.setItem('unlocked', '1'); then(); });
}

/* ── Тема и скрытый режим ── */
function applyTheme(){
  const t = S.settings.theme || 'auto';
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  document.title = S.settings.disguise ? 'Тренер' : 'Oralingo';
}
const brand = () => S.settings.disguise ? 'Тренер' : 'Oralingo';

/* ── Профиль ── */
VIEWS.profile = function(){
  const st = S.settings, done = Object.keys(S.done).length, tasksTotal = ALL.filter(hasTask).length;
  const achN = Object.keys(S.ach).length;
  const skills = SKILLS.map(sk => { const sc = skillScore(sk), lv = Math.min(4, Math.floor(sc / 20));
    return `<div class="skill"><span class="rowic">${sk.icon}</span><span style="flex:1"><div class="cb"><b>${sk.title}</b><span class="muted">${SKILL_LEVELS[lv]} · ${sc}%</span></div>
      <div class="progress"><div style="width:${sc}%"></div></div></span></div>`; }).join('');
  const nextTest = st.lastTest ? new Date(new Date(st.lastTest).getTime() + (st.testMonths || 6) * 30.4 * 864e5).toISOString().slice(0, 10) : null;
  const testDue = nextTest && nextTest <= today();
  $app.innerHTML = topbar() + `<h1>Профиль</h1>
    <div class="card"><div class="statgrid">
      <div><b>${S.xp}</b><span>⭐ опыт</span></div><div><b>${liveStreak()}</b><span>🔥 серия</span></div>
      <div><b>${done}/${ALL.length}</b><span>📘 уроки</span></div><div><b>${doneTasks()}/${tasksTotal}</b><span>🎯 задания</span></div>
      <div><b>${trackDays('reflex')}</b><span>🌬️ рефлекс</span></div><div><b>${trackDays('jaw')}</b><span>👄 челюсть</span></div></div></div>

    <h3 class="grp">🗺️ Карта навыков</h3><div class="card">${skills}</div>

    <h3 class="grp">🏆 Достижения · ${achN}/${ACHIEVEMENTS.length}</h3>
    <div class="achs">${ACHIEVEMENTS.map(([id, ic, t, d]) => `<div class="ach ${S.ach[id] ? 'got' : ''}" title="${d}"><span>${S.ach[id] ? ic : '🔒'}</span><b>${t}</b><small>${d}</small></div>`).join('')}</div>

    <h3 class="grp">🎯 Цель дня</h3><div class="card"><p class="muted" style="margin-top:0">Сегодня: ${xpToday()}/${S.goal} XP</p>
      <div class="chips">${[[10,'Лёгкая'],[20,'Обычная'],[30,'Серьёзная'],[50,'Интенсив']].map(([v, l]) => `<button class="chip ${S.goal === v ? 'picked' : ''}" data-goal="${v}">${l} · ${v} XP</button>`).join('')}</div></div>

    <h3 class="grp">⏰ Напоминания</h3><div class="card">
      <p style="margin-top:0">Ежедневная тренировка в <input type="time" id="rtime" value="${st.rtime || '21:00'}" class="inp" style="width:auto;display:inline-block;margin:0 4px"></p>
      <button class="btn small" id="rcal">📅 Добавить в календарь телефона</button>
      <p class="muted">Календарь — самый надёжный способ: напоминание сработает, даже если приложение закрыто. Событие называется нейтрально — «Тренировка».</p></div>

    <h3 class="grp">🩺 Анализы на ИППП</h3><div class="card ${testDue ? 'due' : ''}">
      <p style="margin-top:0">Последний раз: <input type="date" id="ltest" value="${st.lastTest || ''}" class="inp" style="width:auto;display:inline-block;margin:0 4px"></p>
      <p>Повторять раз в <select id="tmon" class="inp" style="width:auto;display:inline-block;margin:0">${[3,6,12].map(m => `<option value="${m}" ${(st.testMonths || 6) == m ? 'selected' : ''}>${m} мес.</option>`).join('')}</select></p>
      ${nextTest ? `<p>${testDue ? '⚠️ Пора сдать анализы!' : `Следующий раз: <b>${nextTest}</b>`}</p><button class="btn small ghost" id="tcal">📅 Напомнить в календаре</button>` : '<p class="muted">Укажите дату — приложение подскажет, когда пора.</p>'}</div>

    <h3 class="grp">⚙️ Настройки</h3><div class="card">
      <b>Тема</b><div class="chips">${[['auto','🌗 Авто'],['light','☀️ Светлая'],['dark','🌙 Тёмная']].map(([k, l]) => `<button class="chip ${(st.theme || 'auto') === k ? 'picked' : ''}" data-theme-set="${k}">${l}</button>`).join('')}</div>
      <label class="check"><input type="checkbox" id="disg" ${st.disguise ? 'checked' : ''}> <span><b>Скрытый режим</b> — нейтральное название «Тренер» во вкладке и в шапке</span></label>
      <div class="cb"><span><b>PIN-код</b><br><span class="muted">${st.pin ? 'Включён — запрашивается при открытии' : 'Выключен'}</span></span>
        <span class="cbt">${st.pin ? '<button id="pinoff">Выключить</button><button id="pinset">Сменить</button>' : '<button id="pinset">Включить</button>'}</span></div>
      <p class="muted">Установить на главный экран: в браузере меню → «Добавить на главный экран». На экране оно будет называться «Тренер».</p></div>

    <h3 class="grp">💾 Данные</h3><div class="card">
      <p class="muted" style="margin-top:0">Весь прогресс хранится только на этом устройстве. Сохраните файл, чтобы перенести его на другое устройство или не потерять.</p>
      <div class="exbtns"><button class="btn small" id="exp">⬇️ Экспорт</button><button class="btn small ghost" id="imp">⬆️ Импорт</button></div>
      <input type="file" id="impf" accept="application/json,.json" hidden></div>

    <div class="card"><p class="muted" style="margin:0">Курс носит образовательный характер. При боли, травмах или проблемах со здоровьем обратитесь к врачу.</p></div>
    <button class="btn ghost" id="reset">Сбросить прогресс</button><div style="height:20px"></div>` + nav();

  const $ = id => document.getElementById(id);
  document.querySelectorAll('[data-goal]').forEach(b => b.onclick = () => { S.goal = +b.dataset.goal; save(); render(); });
  $('rtime').onchange = e => { st.rtime = e.target.value; save(); };
  $('rcal').onclick = () => { const [h, m] = (st.rtime || '21:00').split(':'); const d = new Date(); d.setHours(+h, +m, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1);
    downloadFile('trenirovka.ics', ics('Тренировка', 'Ежедневная тренировка (8 минут)', d, 'FREQ=DAILY'), 'text/calendar'); toast('Откройте скачанный файл, чтобы добавить в календарь'); };
  $('ltest').onchange = e => { st.lastTest = e.target.value; save(); render(); };
  $('tmon').onchange = e => { st.testMonths = +e.target.value; save(); render(); };
  if ($('tcal')) $('tcal').onclick = () => { const d = new Date(nextTest + 'T10:00'); downloadFile('analizy.ics', ics('Записаться к врачу', 'Плановые анализы', d < new Date() ? new Date(Date.now() + 864e5) : d), 'text/calendar'); };
  document.querySelectorAll('[data-theme-set]').forEach(b => b.onclick = () => { st.theme = b.dataset.themeSet; save(); applyTheme(); render(); });
  $('disg').onchange = e => { st.disguise = e.target.checked; save(); applyTheme(); render(); };
  $('pinset').onclick = () => pinPad('Придумайте код из 4 цифр', v1 => pinPad('Повторите код', async v2 => {
    if (v1 !== v2) { toast('Коды не совпали'); return render(); }
    st.pin = await hashPin(v1); sessionStorage.setItem('unlocked', '1'); save(); toast('🔒 PIN-код включён'); render(); }, true), true);
  if ($('pinoff')) $('pinoff').onclick = () => pinPad('Введите текущий код', async v => { if (await hashPin(v) !== st.pin) return false; delete st.pin; save(); toast('PIN-код выключен'); render(); }, true);
  $('exp').onclick = () => downloadFile(`trener-backup-${today()}.json`, JSON.stringify(S), 'application/json');
  $('imp').onclick = () => $('impf').click();
  $('impf').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); if (typeof d !== 'object' || !d.done) throw 0;
      if (!confirm('Заменить текущий прогресс данными из файла?')) return;
      localStorage.setItem(KEY, JSON.stringify(d)); location.reload(); } catch { toast('Не удалось прочитать файл'); } };
    r.readAsText(f); };
  $('reset').onclick = () => { if (confirm('Удалить весь прогресс, отчёты и настройки?')) { const keep = { pin:st.pin }; S = DEFAULTS(); S.adult = true; S.settings = keep.pin ? keep : {}; save(); applyTheme(); render(); } };
};
