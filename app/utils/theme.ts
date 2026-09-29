export type ThemePreference = 'light' | 'dark' | 'system'
export const THEME_STORAGE_KEY = 'nakavu_theme'

/** Inline, render-blocking script: sets data-theme before the page paints. */
export const themeBootScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');p=p&&JSON.parse(p);var d=p==='dark'||((!p||p==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}})()`
