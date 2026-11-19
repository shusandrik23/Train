/* ═════════ Запуск приложения ═════════ */
applyTheme();

function boot(){
  if (S.adult && S.settings.pin && sessionStorage.getItem('unlocked') !== '1') return lockScreen(render);
  render();
}

// Блокировка PIN-кодом, если приложение было свёрнуто больше минуты
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (S.settings.pin && hiddenAt && Date.now() - hiddenAt > 60000) { sessionStorage.removeItem('unlocked'); stopAllTimers(); lockScreen(render); }
});

// Офлайн-режим и установка на главный экран
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

checkAchievements();
boot();
