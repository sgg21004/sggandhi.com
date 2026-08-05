// Dark / light toggle — persists to localStorage.
const btn = document.getElementById('theme-toggle');

btn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
});

// ── Name entrance: split into per-character spans for a staggered reveal ──
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const nameEl = document.querySelector('.name');

if (nameEl && !reduceMotion) {
  const text = nameEl.textContent;
  nameEl.textContent = '';
  let i = 0;
  for (const ch of text) {
    const span = document.createElement('span');
    if (ch === ' ') {
      span.className = 'space';
      span.innerHTML = '&nbsp;';
    } else {
      span.className = 'char';
      span.textContent = ch;
      span.style.setProperty('--i', i);
    }
    nameEl.appendChild(span);
    i++;
  }
  nameEl.classList.add('is-ready');

  // Once the entrance finishes, drop the entrance styling so resting/hover
  // states (and cursor interactions) take back over cleanly.
  setTimeout(() => document.body.classList.add('entered'), 2000);
}
