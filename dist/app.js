document.querySelectorAll('.mobile-menu a').forEach((link) => {
  link.addEventListener('click', () => { link.closest('details').open = false; });
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const menu = document.querySelector('.mobile-menu[open]');
    if (menu) { menu.open = false; menu.querySelector('summary').focus(); }
  }
});

const uiReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const taskResult = document.querySelector('.task-result');
let taskAnimations = [];
function cancelTaskAnimations() {
  taskAnimations.forEach(animation => animation.cancel());
  taskAnimations = [];
}
const mobileTasks = matchMedia('(max-width:46rem)');
const taskResultAnchor = document.createComment('Desktop task result position');
taskResult.before(taskResultAnchor);
function placeTaskResult() {
  cancelTaskAnimations();
  if (mobileTasks.matches) {
    document.querySelector('input[name="task"]:checked').parentElement.append(taskResult);
  } else {
    taskResultAnchor.after(taskResult);
  }
}
mobileTasks.addEventListener('change', placeTaskResult);
placeTaskResult();
uiReducedMotion.addEventListener('change', () => {
  if (uiReducedMotion.matches) cancelTaskAnimations();
});
const tasks = {
  new: { label: 'Нужен новый сайт', title: 'Что должен делать сайт?', description: 'Расскажите, чем занимаетесь и что хотите получить от сайта. Вместе определим нужный формат.', action: 'Начать с разработки' },
  support: { label: 'Сайт уже есть', title: 'Что улучшить на вашем сайте?', description: 'Покажите текущий сайт. Обсудим, что обновить, исправить или добавить, и подберём формат поддержки.', action: 'Начать с поддержки' },
  advice: { label: 'Пока не знаю', title: 'Начнём с разговора.', description: 'Не нужно готовое техническое задание. Достаточно рассказать о бизнесе и о том, что хочется изменить.', action: 'Разобраться вместе' }
};
document.querySelectorAll('input[name="task"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const previousHeight = taskResult.getBoundingClientRect().height;
    cancelTaskAnimations();
    const task = tasks[radio.value];
    document.querySelector('#task-title').textContent = task.title;
    document.querySelector('#task-description').textContent = task.description;
    document.querySelector('#task-action').textContent = task.action;
    placeTaskResult();
    if (!uiReducedMotion.matches) {
      const nextHeight = taskResult.getBoundingClientRect().height;
      const timing = { duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };
      taskAnimations = [...taskResult.children].map(element => element.animate([
        { opacity: .25, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], timing));
      if (Math.abs(nextHeight - previousHeight) > 1) {
        taskAnimations.push(taskResult.animate([
          { height: `${previousHeight}px` }, { height: `${nextHeight}px` }
        ], timing));
      }
    }
  });
});

import './brief-form.js';

import './point-field.js';

const careGraphic = document.querySelector('.care-graphic');
// Short overlapping segments fade along the contour, including around corners.
careGraphic.querySelectorAll('.care-trace').forEach((path) => {
  const trail = document.createDocumentFragment();
  const count = 48;
  const length = path.classList.contains('care-trace-seven') ? .14 : .1;
  const step = length / count;
  for (let index = count - 1; index >= 0; index--) {
    const segment = path.cloneNode();
    const fade = (Math.exp(-index / 12) - Math.exp(-count / 12)) / (1 - Math.exp(-count / 12));
    const head = Math.min(1, (index + 1) / 4);
    segment.style.setProperty('--trace-offset', `${index * step}px`);
    segment.style.strokeDasharray = `${step * 1.2} ${1 - step * 1.2}`;
    segment.style.opacity = String(fade * head);
    trail.append(segment);
  }
  path.replaceWith(trail);
});
const careReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let careVisible = false;
function syncCareMotion() {
  careGraphic.classList.toggle('is-active', careVisible && !document.hidden && !careReducedMotion.matches);
}
new IntersectionObserver(([entry]) => {
  careVisible = entry.isIntersecting;
  syncCareMotion();
}).observe(careGraphic);
document.addEventListener('visibilitychange', syncCareMotion);
careReducedMotion.addEventListener('change', syncCareMotion);
