// Internationalization: language detection, message lookup and static text.
//
// - Initial language: saved choice, else the browser languages, else pt-BR.
// - Messages live in js/locales/*.js as flat "area.name" keys; placeholders
//   use {name} and are filled by t(key, { name }).
// - Static HTML text is marked with data-i18n="key" (textContent) and
//   data-i18n-attr="attr:key;attr2:key2" (attributes). Pages hide
//   [data-i18n] until translated (see the inline <head> script and the
//   .i18n-pending rule in style.css) to avoid flashing the wrong language.
// - Changing the language reloads the page: all text is rendered once per load.

import en from "./locales/en.js";
import ptBR from "./locales/pt-BR.js";

const STORAGE_KEY = "morphomatrix.language";
const DEFAULT_LANGUAGE = "pt-BR";

// Language names are shown in their own language, as users look for them.
export const LANGUAGES = {
  "pt-BR": { name: "Português", messages: ptBR },
  en: { name: "English", messages: en },
};

function storedLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored in LANGUAGES ? stored : null;
  } catch {
    return null;
  }
}

function browserLanguage() {
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    const primary = String(tag ?? "").toLowerCase().split("-")[0];
    if (primary === "pt") return "pt-BR";
    if (primary === "en") return "en";
  }
  return null;
}

const current = storedLanguage() ?? browserLanguage() ?? DEFAULT_LANGUAGE;

/** Current language code ("pt-BR" | "en"), also usable as an Intl locale. */
export const getLanguage = () => current;

/** Look up a message and fill its {placeholders}. Falls back to pt-BR, then to the key. */
export function t(key, params = {}) {
  const template = LANGUAGES[current].messages[key] ?? LANGUAGES[DEFAULT_LANGUAGE].messages[key];
  if (template === undefined) {
    console.warn(`Missing translation: ${key}`);
    return key;
  }
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

const pluralRules = new Intl.PluralRules(current);

/**
 * Plural-aware lookup: uses "{key}.{category}" (e.g. "x.one", "x.other")
 * chosen by Intl.PluralRules for `count`, falling back to "{key}.other".
 */
export function tn(key, count, params = {}) {
  const category = pluralRules.select(count);
  const messages = LANGUAGES[current].messages;
  const pluralKey = `${key}.${category}` in messages ? `${key}.${category}` : `${key}.other`;
  return t(pluralKey, { count, ...params });
}

/** Translate data-i18n / data-i18n-attr elements and reveal them. */
export function applyStaticTranslations(root = document) {
  document.documentElement.lang = current;
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll("[data-i18n-attr]")) {
    for (const pair of node.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":").map((part) => part.trim());
      if (attr && key) node.setAttribute(attr, t(key));
    }
  }
  document.documentElement.classList.remove("i18n-pending");
}

/** Fill a <select> with the available languages and switch on change. */
export function initLanguageSelect(select) {
  if (!select) return;
  select.replaceChildren(
    ...Object.entries(LANGUAGES).map(([code, { name }]) => {
      const option = document.createElement("option");
      option.value = code;
      option.lang = code;
      option.textContent = name;
      option.selected = code === current;
      return option;
    }),
  );
  select.addEventListener("change", () => {
    try {
      localStorage.setItem(STORAGE_KEY, select.value);
    } catch {
      // Storage unavailable: the choice cannot survive the reload.
      select.value = current;
      return;
    }
    window.location.reload();
  });
}
