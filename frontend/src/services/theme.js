const THEME_OVERRIDE_KEY = 'themePreference';

export function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getPreferredTheme() {
  const savedPreference = localStorage.getItem(THEME_OVERRIDE_KEY);
  return savedPreference === 'dark' || savedPreference === 'light'
    ? savedPreference
    : getSystemTheme();
}

export function applyTheme(theme, rememberChoice = false) {
  const safeTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', safeTheme);
  // Keep the existing key for compatibility with the rest of the application.
  localStorage.setItem('theme', safeTheme);

  if (rememberChoice) {
    localStorage.setItem(THEME_OVERRIDE_KEY, safeTheme);
  }

  window.dispatchEvent(new CustomEvent('app-theme-change', { detail: safeTheme }));
}

export function watchSystemTheme(onChange) {
  const query = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!query) return () => {};

  const handleChange = (event) => {
    if (!localStorage.getItem(THEME_OVERRIDE_KEY)) {
      onChange(event.matches ? 'dark' : 'light');
    }
  };

  if (query.addEventListener) query.addEventListener('change', handleChange);
  else query.addListener(handleChange);

  return () => {
    if (query.removeEventListener) query.removeEventListener('change', handleChange);
    else query.removeListener(handleChange);
  };
}
