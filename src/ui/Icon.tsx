/**
 * The app's one icon family.
 *
 * Why it exists: the older screens used emoji as icons (🎥 📍 ⏱ ⚑ 💷 🔬 …).
 * Emoji are drawn by the phone, not by us — every make draws them differently,
 * in full colour, and they read as a toy. Worse, a coloured emoji breaks the
 * one-colour-one-meaning rule: a red 📌 or a yellow ⚠ wears a state hue it
 * has no right to. These are drawn once, here, and wear the colour of the
 * words beside them (`currentColor`), so brand blue stays on what you press
 * and the state colours stay on states.
 *
 * The drawing rules, so the set stays one family: a 24×24 grid, 1.75 stroke,
 * round caps and joins, no fills, corners at radius 2 (1–1.5 on small parts),
 * the live area kept inside 3–21 so every icon has the same optical size.
 * Only what the app uses is drawn; a new one is one more entry in ICONS and
 * the test in __tests__/Icon.test.ts will refuse a name that isn't here.
 *
 * Decorative by default (`aria-hidden`) because every icon sits beside its
 * words — the state in words beside the marks. Pass `label` when the icon is
 * the only thing in a control and has no aria-label of its own.
 */
import type { ReactElement } from 'react';

const ICONS = {
  camera: <><path d="M4 8.75A1.75 1.75 0 0 1 5.75 7H7.8l1.45-2.25h5.5L16.2 7h2.05A1.75 1.75 0 0 1 20 8.75v8.5A1.75 1.75 0 0 1 18.25 19H5.75A1.75 1.75 0 0 1 4 17.25z" /><circle cx="12" cy="12.75" r="3.25" /></>,
  video: <><rect x="3" y="6.5" width="12.5" height="11" rx="2" /><path d="m15.5 10.5 5.5-3v9l-5.5-3" /></>,
  photo: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.5" r="1.5" /><path d="m20.5 15-4.5-4.5-9.5 9" /></>,
  upload: <path d="M12 15V4.5M7.75 8.5 12 4.25l4.25 4.25M4.5 14.5v4a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4" />,
  download: <path d="M12 4.5V15M7.75 10.75 12 15l4.25-4.25M4.5 14.5v4a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4" />,
  play: <path d="M8 5.25v13.5L18.5 12z" />,
  stop: <rect x="6.25" y="6.25" width="11.5" height="11.5" rx="1.5" />,
  pin: <><path d="M12 20.75s-6.5-5.5-6.5-10.75a6.5 6.5 0 0 1 13 0c0 5.25-6.5 10.75-6.5 10.75z" /><circle cx="12" cy="10" r="2.25" /></>,
  time: <><circle cx="12" cy="13.5" r="7" /><path d="M12 13.5v-3.75M10 3.25h4M12 3.25V6.5M18.25 6.75l1.5-1.5" /></>,
  flag: <path d="M5.5 20.75V4M5.5 4.5h11.25L14 8.75 16.75 13H5.5" />,
  check: <path d="m4.75 12.5 4.5 4.5 10-10" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  warning: <><path d="M10.27 4.5 3.1 17.25A2 2 0 0 0 4.85 20.25h14.3a2 2 0 0 0 1.75-3L13.73 4.5a2 2 0 0 0-3.46 0z" /><path d="M12 9.5v4M12 16.75h.01" /></>,
  eye: <><path d="M2.75 12S6.25 5.75 12 5.75 21.25 12 21.25 12 17.75 18.25 12 18.25 2.75 12 2.75 12z" /><circle cx="12" cy="12" r="3" /></>,
  pound: <path d="M16.25 7a3.75 3.75 0 0 0-6.75 2.25V13c0 2.75-.9 4.6-2.75 6H17.5M7 13.25h7" />,
  study: <><path d="M9.25 3.5h5.5M10.5 3.5v6.25l-5.4 9.2A1.4 1.4 0 0 0 6.3 21h11.4a1.4 1.4 0 0 0 1.2-2.05l-5.4-9.2V3.5" /><path d="M7.4 15h9.2" /></>,
  trophy: <><path d="M8 4.25h8V9.5a4 4 0 0 1-8 0z" /><path d="M8 6.25H5.25A2.75 2.75 0 0 0 8.4 10.6M16 6.25h2.75a2.75 2.75 0 0 1-3.15 4.35M12 13.5v3.75M8.5 20.5h7M9.75 20.5l.5-3.25h3.5l.5 3.25" /></>,
  case: <><path d="M9 4.5H7.25A2 2 0 0 0 5.25 6.5v12a2 2 0 0 0 2 2h9.5a2 2 0 0 0 2-2v-12a2 2 0 0 0-2-2H15" /><rect x="9" y="3" width="6" height="3.25" rx="1" /><path d="M9 11.5h6M9 15h4" /></>,
  pencil: <path d="M14.75 5.25l4 4L8.5 19.5H4.5v-4zM12.5 7.5l4 4" />,
  document: <><path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" /><path d="M14 3.5V8h4.5M9 12.75h6M9 16.25h6" /></>,
  printer: <><path d="M7 9V3.75h10V9M7 17H5.5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H17" /><rect x="7" y="13.5" width="10" height="7" rx="1" /></>,
  chart: <path d="M4 3.75V20h16.25M7.5 15l4-4 3 3 5-6" />,
  list: <><path d="M9 7h10.5M9 12h10.5M9 17h10.5" /><circle cx="4.75" cy="7" r=".6" /><circle cx="4.75" cy="12" r=".6" /><circle cx="4.75" cy="17" r=".6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  plusNext: <path d="M9 6.5v11M3.5 12h11M16.5 8l4 4-4 4" />,
  chevron: <path d="m9.5 5.75 6.25 6.25-6.25 6.25" />,
  chevronDown: <path d="m5.75 9.5 6.25 6.25 6.25-6.25" />,
  chevronUp: <path d="m5.75 14.5 6.25-6.25 6.25 6.25" />,
  chevronLeft: <path d="m14.5 5.75-6.25 6.25 6.25 6.25" />,
  arrowUp: <path d="M12 19.5V4.75M6.25 10.5 12 4.75l5.75 5.75" />,
  arrowDown: <path d="M12 4.5v14.75M6.25 13.5 12 19.25l5.75-5.75" />,
  grip: <><circle cx="9" cy="6" r=".9" /><circle cx="15" cy="6" r=".9" /><circle cx="9" cy="12" r=".9" /><circle cx="15" cy="12" r=".9" /><circle cx="9" cy="18" r=".9" /><circle cx="15" cy="18" r=".9" /></>,
  hash: <path d="M5 9h15M4 15h15M10.5 4l-2 16M15.5 4l-2 16" />,
  person: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20.25c.75-3.75 3.5-6 7-6s6.25 2.25 7 6" /></>,
  people: <><circle cx="9" cy="8.5" r="3.25" /><path d="M3 19.75c.6-3.25 2.9-5.25 6-5.25s5.4 2 6 5.25M15.5 5.5a3.25 3.25 0 0 1 0 6M17.25 14.75c2 .6 3.3 2.3 3.75 5" /></>,
  machine: <><rect x="3.5" y="6" width="17" height="11.5" rx="2" /><circle cx="9" cy="11.75" r="2.5" /><path d="M14.5 10.25h3M14.5 13.25h3M6.5 17.5v2.5M17.5 17.5v2.5" /></>,
  board: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M7.75 8.5v6M12 8.5v8.5M16.25 8.5v3.5" /></>,
  home: <path d="M4 10.5 12 4l8 6.5v8.25a1.75 1.75 0 0 1-1.75 1.75H15v-5.5H9v5.5H5.75A1.75 1.75 0 0 1 4 18.75z" />,
  route: <path d="M4 12h16M7.5 8.25 3.75 12l3.75 3.75M16.5 8.25 20.25 12l-3.75 3.75" />,
  link: <path d="M10 14a4 4 0 0 0 5.66 0l3-3A4 4 0 0 0 13 5.34l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 18.66l1-1" />,
  cloud: <path d="M7.25 18.5a4.5 4.5 0 0 1-.7-8.95 6 6 0 0 1 11.4-.3 4.75 4.75 0 0 1-.45 9.25z" />,
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.75 4.25v4.25H15.5" />,
  pointer: <path d="M5.5 4.5 18.5 11l-5.75 1.75L10 18.5z" />,
} satisfies Record<string, ReactElement>;

export type IconName = keyof typeof ICONS;

/** Every name in the set — for the test that a typo can't ship a blank. */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function Icon({ name, size = 18, label, className }: {
  name: IconName;
  /** px, or any CSS length — '1.1em' sizes it to the words it sits beside. */
  size?: number | string;
  /** Only when the icon stands alone and nothing else names it. */
  label?: string;
  className?: string;
}) {
  return (
    <svg
      className={'icon' + (className ? ' ' + className : '')}
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round"
      focusable="false"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {ICONS[name]}
    </svg>
  );
}
