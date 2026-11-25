const form = document.querySelector('#brief-form');
const button = form.querySelector('button[type="submit"]');
const status = document.querySelector('#form-status');
const fields = [form.elements.name, form.elements.contact, form.elements.project];
const touched = new Set();
let submitting = false;
button.disabled = false;

function showError(field, message) {
  field.setAttribute('aria-invalid', String(Boolean(message)));
  document.getElementById(field.getAttribute('aria-describedby')).textContent = message;
}

function validate(field) {
  const value = field.value.trim();
  const valid = value.length >= field.minLength && value.length <= field.maxLength;
  const messages = {
    name: 'Напишите имя: от 2 до 80 символов.',
    contact: 'Укажите удобный способ связи: до 150 символов.',
    project: 'Опишите проект: от 10 до 3000 символов.'
  };
  showError(field, valid ? '' : messages[field.name]);
  return valid;
}

fields.forEach((field) => {
  field.addEventListener('blur', () => { touched.add(field); validate(field); });
  field.addEventListener('input', () => {
    if (touched.has(field)) validate(field);
    if (!submitting) {
      status.textContent = 'Оставьте контакт, чтобы мы могли вам ответить.';
      delete status.dataset.state;
    }
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting) return;
  const invalid = fields.filter((field) => { touched.add(field); return !validate(field); });
  if (invalid.length) { invalid[0].focus(); return; }
  const payload = Object.fromEntries(new FormData(form));
  for (const field of fields) payload[field.name] = field.value.trim();
  submitting = true;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  form.setAttribute('aria-busy', 'true');
  fields.forEach(field => { field.readOnly = true; });
  button.textContent = 'Отправляем…';
  status.textContent = 'Отправляем вашу заявку.';
  delete status.dataset.state;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true) {
      if (result?.errors) {
        const invalidFields = fields.filter(field => typeof result.errors[field.name] === 'string');
        invalidFields.forEach(field => showError(field, result.errors[field.name]));
        invalidFields[0]?.focus();
      }
      throw new Error(result?.message || 'Не удалось отправить заявку. Ваш текст сохранён в форме. Попробуйте позже или напишите на info@h7septima.ru.');
    }
    // Clear only after the mail server has accepted the message.
    fields.forEach(field => { field.value = ''; field.removeAttribute('aria-invalid'); });
    touched.clear();
    status.dataset.state = 'success';
    status.textContent = 'Заявка отправлена! Свяжемся с вами по указанному контакту.';
  } catch (error) {
    status.dataset.state = 'error';
    status.textContent = error.name === 'AbortError'
      ? 'Сервер долго не отвечает. Заявка могла отправиться. Уточните по почте info@h7septima.ru; ваш текст сохранён в форме.'
      : error instanceof TypeError
        ? 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз. Ваш текст сохранён в форме.'
        : error.message;
  } finally {
    clearTimeout(timeout);
    submitting = false;
    button.disabled = false;
    button.removeAttribute('aria-busy');
    form.removeAttribute('aria-busy');
    fields.forEach(field => { field.readOnly = false; });
    button.textContent = 'Отправить заявку';
  }
});
