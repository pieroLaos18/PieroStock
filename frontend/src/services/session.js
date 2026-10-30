export function clearSession() {
  const selectedTheme = localStorage.getItem('theme');
  const themePreference = localStorage.getItem('themePreference');

  localStorage.clear();

  if (selectedTheme) localStorage.setItem('theme', selectedTheme);
  if (themePreference) localStorage.setItem('themePreference', themePreference);
}
