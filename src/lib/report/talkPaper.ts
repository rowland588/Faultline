/** Saved Line Talk documents must use their real paper body in every combined export. */
import type { ToolStudy } from '../study';
import { photoLabels, turnsOf, wordsOf } from '../../tools/talk/talk';
import { shrinkPicture, type Picture } from '../../tools/talk/talkPictures';
import { talkDocBlocks, type TalkDocPaper } from '../../tools/talk/talkDocPdf';
import { text } from './blocks';
import { leanHead } from './lean';
import type { Block } from './flow';

const pictures = new Map<string, Picture>();
export async function preloadTalkPictures(studies: readonly ToolStudy[]): Promise<void> {
  for (const s of studies) {
    if (s.tool !== 'talk') continue;
    const turns = s.facts.turns ?? [];
    const used = new Set(turns.filter(t => !t.struck).flatMap(t => (t.doc?.sections ?? []).flatMap(sc => sc.photos.map(p => p.photo))));
    const labels = photoLabels(turns);
    for (const t of turns) {
      if (t.struck || !t.media || !used.has(labels.get(t.id) ?? '')) continue;
      const key = t.media.blobKey;
      if (pictures.has(key)) continue;
      let pic = await shrinkPicture(key, 1400, 0.82).catch(() => undefined);
      if(!pic){const {fetchBlobNow}=await import('../../cloud/sync');if(await fetchBlobNow(key)==='got')pic=await shrinkPicture(key,1400,0.82).catch(()=>undefined);}
      if (pic) pictures.set(key, pic);
    }
  }
}
export function talkPaper(s: ToolStudy, turnId: string, printed: string, line?: string): TalkDocPaper | undefined {
  const turns = s.facts.turns ?? [], turn = turns.find(t => t.id === turnId && !t.struck && t.doc);
  if (!turn?.doc) return undefined;
  const labels = photoLabels(turns), photos = new Map<string, Picture>(), taken = new Map<string, string>();
  for (const t of turns) {
    const label = labels.get(t.id); if (!label || t.struck) continue;
    taken.set(label, new Date(t.at).toLocaleString('en-GB', { day:'numeric',month:'short',hour:'2-digit',minute:'2-digit' }));
    const pic = t.media && pictures.get(t.media.blobKey); if (pic) photos.set(label,pic);
  }
  return { doc:turn.doc,talk:s.name,printed,photos,taken,...(line ? {line} : {}) };
}
export function talkStudyBlocks(s:ToolStudy, printed:string, line?:string, turnId?:string):Block[]{
  const docs=(s.facts.turns ?? []).filter(t=>!t.struck && t.doc && (!turnId || t.id===turnId));
  if(docs.length)return docs.flatMap(t=>{const p=talkPaper(s,t.id,printed,line);return p ? talkDocBlocks(p) : [];});
  return [leanHead('Saved Line Talk'),...turnsOf(s.facts).filter(t=>!t.struck).flatMap(t=>[
    text({text:t.kind==='reply' ? 'Luna response — review against evidence' : 'Recorded on the line',size:8,style:'bold'}),
    text({text:wordsOf(t) || (t.kind==='photo' ? 'Photo retained in the original talk.' : 'Recording retained in the original talk; no transcript saved.'),size:9,after:8}),
  ])];
}
