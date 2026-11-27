/* THE PLACES EVERYTHING OFFERS, AND THE WORDS EACH IS FOUND BY (ui/Everything; 21 November — CLAUDE.md "Found by its name").
 *
 * PLACES are the ten shown before anything is typed — each the page it always was, said by what it is for. `words` are never shown:
 * they are the other things a person calls it and the everyday jobs done there ("add a line", "sign out", "sharepoint"), so typing
 * the job finds the place. FINDS are found only by typing — real places and sheets that do not earn a tile of their own (the business's
 * people, your templates, your account with the app's update and sign-out), kept off the first view so it stays the ten. */
import type { IconName } from './Icon';

export interface Place {
  key: string; label: string; icon: IconName; says: string;
  /** The page it opens — or `account`, the Account sheet (ui/AccountMenu). */
  to: string;
  /** Other words it is found by; never shown. */
  words: string;
}

export const PLACES: Place[] = [
  { key: 'story', label: 'Factory', to: '/room', icon: 'home', says: 'Every area and line — how each stands', words: 'lines areas board home overview factory floor' },
  { key: 'machines', label: 'Machines', to: '/machines', icon: 'machine', says: 'Every machine, line by line', words: 'machine equipment asset kit manual' },
  { key: 'projects', label: 'Projects', to: '/projects', icon: 'board', says: 'The improvement work under way', words: 'project start new improvement pdca dmaic a3 8d kaizen kata method' },
  { key: 'problems', label: 'Problems', to: '/snags', icon: 'warning', says: 'Every problem, by line and priority', words: 'problem issue fault snag raise report critical' },
  { key: 'actions', label: 'Actions', to: '/actions', icon: 'check', says: 'Who owes what, by when', words: 'action task todo owes owed late overdue due tracker gantt' },
  { key: 'tools', label: 'Tools', to: '/tools', icon: 'chart', says: 'Every tool, study and calculator', words: 'tool capability pareto smed changeover balance capacity value stream sampling reliability control chart analysis 6m fishbone' },
  { key: 'library', label: 'Library', to: '/library', icon: 'document', says: 'Every report and paper made', words: 'reports pdf papers download saved copies print' },
  { key: 'setup', label: 'Set up', to: '/factory', icon: 'pencil', says: 'The factory, its areas and lines', words: 'setup settings add new line area machine rename edit merge order archive a line' },
  /* the customers themselves (21 November — Rowland: "Can't find archive client?") */
  { key: 'customers', label: 'Customers', to: '/factory?customer=manage', icon: 'people', says: 'Add, archive or continue a customer (client)', words: 'customers clients business company new unarchive restore bring back reinstate put away finished' },
  /* the business's own systems Luna reads (docs/DATA-CONNECTIONS.md) — a place of its own since 20 November (Rowland: "Where is the connector … for Luna") */
  { key: 'connections', label: 'Data connections', to: '/factory/data', icon: 'cloud', says: 'The business’s own systems Luna reads', words: 'connect connector connectors connection link file sharepoint onedrive microsoft excel workbook spreadsheet csv mes erp import data send email outlook mail' },
];

export const FINDS: Place[] = [
  { key: 'line-recovery', label: 'Line recovery', to: '/projects?new=1&program=line-recovery', icon: 'board', says: 'A program for an underperforming line or several lines', words: 'underperforming line improve performance recovery pack bottleneck losses problems capacity' },
  { key: 'luna', label: 'Luna', to: '/ai', icon: 'spark', says: 'Ask Luna — make a report, send it, remind you tomorrow, schedules', words: 'luna ask colleague remind reminder tomorrow make report send conversation voice schedules schedule every morning daily briefing' },
  { key: 'people', label: 'People', to: '/business', icon: 'people', says: 'Who is in the business and what each may do — invite someone', words: 'invite team member user roles permission access staff colleague' },
  { key: 'templates', label: 'My templates', to: '/templates', icon: 'document', says: 'Your own sheets and frameworks, at any customer', words: 'template framework checklist reuse' },
  { key: 'standing-jobs', label: 'Standing briefings', to: '/factory?standing=1', icon: 'document', says: 'Briefings on a schedule — every Monday, what moved', words: 'standing job weekly briefing monday digest what moved schedule automated' },
  { key: 'account', label: 'Your account', to: 'account', icon: 'pencil', says: 'Update the app, your brand, how you work, backup, sign out', words: 'update version upgrade install brand logo sign out log logout backup sync profile preferences luna on off' },
];

/** Everything a place is found by: its name, what it is for, and its other words. */
export const placeWords = (p: Place): string => `${p.label} ${p.says} ${p.words}`;

/** The Account sheet asked to open from anywhere (ui/AccountMenu listens). */
export const ACCOUNT_EVENT = 'faultline-account';
export const openAccount = (): void => { window.dispatchEvent(new Event(ACCOUNT_EVENT)); };
