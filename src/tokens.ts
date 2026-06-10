// Design tokens — Nimbus NAS panel design system

export const C = {
  bg:         '#14181d',
  surface:    '#1b2128',
  surface2:   '#222a33',
  surface3:   '#2b343f',
  border:     'rgba(255,255,255,0.07)',
  borderHi:   'rgba(255,255,255,0.13)',
  text:       '#e8eef4',
  textDim:    '#9bacbd',
  textFaint:  '#65778a',
  track:      'rgba(255,255,255,0.09)',
  accent:     '#3b9eff',
  accentDim:  'rgba(59,158,255,0.16)',
  accentBg:   'rgba(59,158,255,0.16)',
  ok:         '#2dd4a7',
  okDim:      'rgba(45,212,167,0.14)',
  warn:       '#f5a623',
  warnDim:    'rgba(245,166,35,0.15)',
  danger:     '#ff5d5d',
  dangerDim:  'rgba(255,93,93,0.15)',
  purple:     '#a78bfa',
  purpleDim:  'rgba(167,139,250,0.15)',
  textSub:    '#9bacbd',
  textMute:   '#65778a',
  green:      '#2dd4a7',
  greenBg:    'rgba(45,212,167,0.14)',
  red:        '#ff5d5d',
  redBg:      'rgba(255,93,93,0.15)',
};

/** Call this at app startup (before first render) or when theme changes.
 *  Mutates C in place — next render will pick up new values. */
export function applyAccent(hex: string) {
  C.accent    = hex;
  // Convert hex to rgba for dim variants
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  C.accentDim = `rgba(${r},${g},${b},0.18)`;
  C.accentBg  = `rgba(${r},${g},${b},0.18)`;
}

export const FONTS = {
  regular:  'HankenGrotesk_400Regular',
  medium:   'HankenGrotesk_600SemiBold',
  semibold: 'HankenGrotesk_600SemiBold',
  bold:     'HankenGrotesk_700Bold',
  extrabold:'HankenGrotesk_800ExtraBold',
  mono:     'JetBrainsMono_400Regular',
  monomed:  'JetBrainsMono_500Medium',
  monobold: 'JetBrainsMono_700Bold',
};

// ── Simple i18n ───────────────────────────────────────────────────────────────
type Lang = 'pl' | 'en';
let _lang: Lang = 'pl';

export function setLang(lang: Lang) { _lang = lang; }
export function getLang(): Lang { return _lang; }

const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  'Dzień dobry':          { pl: 'Dzień dobry',          en: 'Good morning' },
  'Stan systemu':         { pl: 'Stan systemu',          en: 'System status' },
  'Wszystkie sprawne':    { pl: 'Wszystkie sprawne',     en: 'All healthy' },
  'Ruch sieciowy':        { pl: 'Ruch sieciowy',         en: 'Network traffic' },
  'Pule ZFS':             { pl: 'Pule ZFS',              en: 'ZFS Pools' },
  'Zobacz wszystkie':     { pl: 'Zobacz wszystkie',      en: 'See all' },
  'Usługi':               { pl: 'Usługi',                en: 'Services' },
  'Powiadomienia':        { pl: 'Powiadomienia',         en: 'Notifications' },
  'Magazyn':              { pl: 'Magazyn',               en: 'Storage' },
  'Dyski fizyczne':       { pl: 'Dyski fizyczne',        en: 'Physical disks' },
  'Procesy':              { pl: 'Procesy',               en: 'Processes' },
  'Logi systemowe':       { pl: 'Logi systemowe',        en: 'System logs' },
  'Użytkownicy':          { pl: 'Użytkownicy',           en: 'Users' },
  'Terminal':             { pl: 'Terminal',              en: 'Terminal' },
  'Ustawienia':           { pl: 'Ustawienia',            en: 'Settings' },
  'Zasilanie (UPS)':      { pl: 'Zasilanie (UPS)',       en: 'Power (UPS)' },
  'Antywirus':            { pl: 'Antywirus',             en: 'Antivirus' },
  'Media':                { pl: 'Media',                 en: 'Media' },
  'Sieć':                 { pl: 'Sieć',                  en: 'Network' },
  'Pulpit':               { pl: 'Pulpit',                en: 'Dashboard' },
  'Docker':               { pl: 'Docker',                en: 'Docker' },
  'Więcej':               { pl: 'Więcej',                en: 'More' },
  'Spróbuj ponownie':     { pl: 'Spróbuj ponownie',      en: 'Try again' },
  'Brak danych':          { pl: 'Brak danych',           en: 'No data' },
  'Wyloguj się':          { pl: 'Wyloguj się',           en: 'Log out' },
  'Serwer':               { pl: 'Serwer',                en: 'Server' },
  'Konto':                { pl: 'Konto',                 en: 'Account' },
  'Interfejs':            { pl: 'Interfejs',             en: 'Interface' },
  'Język':                { pl: 'Język',                 en: 'Language' },
  'Motyw':                { pl: 'Motyw',                 en: 'Theme' },
  'Ciemny':               { pl: 'Ciemny',                en: 'Dark' },
  'AKTYWNY':              { pl: 'AKTYWNY',               en: 'ACTIVE' },
  'Kolor akcentu':        { pl: 'Kolor akcentu',         en: 'Accent color' },
  'NA ŻYWO':              { pl: 'NA ŻYWO',               en: 'LIVE' },
  'Temp. CPU':            { pl: 'Temp. CPU',             en: 'CPU Temp' },
  'Uptime':               { pl: 'Uptime',                en: 'Uptime' },
  'Kontenery · uruchomione': { pl: 'Kontenery · uruchomione', en: 'Containers · running' },
  'Zagrożenia · Chroniony':  { pl: 'Zagrożenia · Chroniony',  en: 'Threats · Protected' },
  'Wpisz polecenie…':     { pl: 'Wpisz polecenie…',     en: 'Enter command…' },
  'Podtrzymanie':         { pl: 'Podtrzymanie',          en: 'Runtime' },
  'Napięcie':             { pl: 'Napięcie',              en: 'Voltage' },
  'Obciążenie':           { pl: 'Obciążenie',            en: 'Load' },
  'Brak połączenia z UPS':{ pl: 'Brak połączenia z UPS', en: 'UPS not connected' },
  'użyte':                { pl: 'użyte',                 en: 'used' },
};

export function t(key: string): string {
  return TRANSLATIONS[key]?.[_lang] ?? key;
}
