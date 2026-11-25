import type { AgreedAnalysis, AgreedChart } from './study';

const analysis: Record<string, AgreedAnalysis['kind']> = {
  'FC-020': 'plan', 'FC-027': 'learn', 'FC-104': 'sure', 'FC-105': 'change', 'FC-106': 'paired',
  'FC-107': 'groups', 'FC-108': 'table', 'FC-109': 'relate', 'FC-110': 'relate', 'FC-111': 'doe',
  'FC-113': 'plan', 'FC-118': 'grr', 'FC-119': 'gauge', 'FC-120': 'gauge', 'FC-121': 'attr', 'FC-153': 'strat',
};
const charts: Record<string, AgreedChart['kind']> = { 'FC-086': 'xmr', 'FC-087': 'xbar', 'FC-092': 'precontrol' };
export const analysisMode = (id?: string): AgreedAnalysis['kind'] | undefined => id ? analysis[id] : undefined;
export const chartMode = (id?: string): AgreedChart['kind'] | undefined => id ? charts[id] : undefined;
