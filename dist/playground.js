const lab = document.querySelector('#design-lab');
const preview = document.querySelector('#lab-preview');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const businesses = {
  shop: { name: 'Магазин', navigation: 'Коллекция', brand: 'Пример магазина', title: 'Вещи с характером.', line: 'Для дома и повседневных радостей.', glyph: '&', action: 'Посмотреть коллекцию' },
  bureau: { name: 'Бюро', navigation: 'Проекты', brand: 'Пример бюро', title: 'Пространство для жизни.', line: 'Архитектура начинается с вашей идеи.', glyph: 'Аа', action: 'Обсудить пространство' },
  cafe: { name: 'Кафе', navigation: 'Меню', brand: 'Пример кофейни', title: 'Кофе. Здесь и сейчас.', line: 'Место для вашей маленькой паузы.', glyph: 'О', action: 'Заглянуть в меню' }
};
const styles = { soft: 'Мягко', bold: 'Смело', precise: 'Строго' };
let state = { business: 'shop', style: 'soft' };
let animation;
function render(animate = true) {
  const business = businesses[state.business];
  lab.dataset.style = state.style;
  lab.dataset.business = state.business;
  for (const key of ['brand', 'title', 'line', 'glyph', 'action', 'navigation']) document.querySelector(`[data-sample="${key}"]`).textContent = business[key];
  lab.querySelectorAll('[data-business]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.business === state.business)));
  lab.querySelectorAll('[data-style-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.styleChoice === state.style)));
  document.querySelector('#lab-status').textContent = `${business.name}. Стиль: ${styles[state.style].toLowerCase()}.`;
  if (animate && !reducedMotion.matches) {
    animation?.cancel();
    animation = preview.animate([{ opacity: .45, transform: 'translateY(10px) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
}
lab.querySelectorAll('button').forEach(button => { button.disabled = false; });
lab.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.business) state.business = button.dataset.business;
  else if (button.dataset.styleChoice) state.style = button.dataset.styleChoice;
  else if (button.id === 'lab-shuffle') {
    const choices = Object.keys(businesses).flatMap(business => Object.keys(styles).map(style => ({ business, style }))).filter(option => option.business !== state.business || option.style !== state.style);
    state = choices[Math.floor(Math.random() * choices.length)];
  } else return;
  render();
});
lab.querySelectorAll('.lab-options').forEach(group => group.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const buttons = [...group.querySelectorAll('button')];
  const current = buttons.indexOf(document.activeElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next].focus(); buttons[next].click();
}));
document.querySelector('#lab-pick').addEventListener('click', () => {
  const choice = `${businesses[state.business].name}, стиль «${styles[state.style]}»`;
  document.querySelector('#brief-design').value = choice;
  document.querySelector('#design-choice').textContent = `Ваш ориентир: ${choice}.`;
});
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) animation?.cancel(); });
render(false);
window.hallmarkSlots = mapping => {
  for (const [key, value] of Object.entries(mapping)) {
    const slot = document.querySelector(`[data-slot="${key}"]`);
    if (!slot) continue;
    const img = new Image(); img.src = typeof value === 'string' ? value : value.src; img.alt = typeof value === 'string' ? '' : value.alt || '';
    slot.prepend(img);
  }
};
