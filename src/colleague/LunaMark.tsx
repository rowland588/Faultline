/* THE MARK ON AN ANSWER LUNA WROTE (W5, colleague/lunaAnswers): "Luna wrote this · hh:mm · from “…”" with Keep and Not this — drawn by
 * every method's boxes (the shared sheet and a method's own board), so a method page says the same thing however it is laid out. */
import { keepLunaAnswer, type LunaAnswer } from './lunaAnswers';

/** Whether the box still holds Luna's words, not yet kept by the person. */
export const isLunaDraft = (mark: LunaAnswer | undefined, value: string): mark is LunaAnswer => !!mark && !mark.kept && !!value.trim() && mark.text === value.trim();

export function LunaMark({ mark, canEdit, onNot }: { mark: LunaAnswer; canEdit: boolean; onNot: () => void }) {
  return (
    <span className="msheet-luna" data-luna-draft={mark.field}>
      <span>Luna wrote this · {new Date(mark.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · from “{mark.conversation}”{canEdit ? ' — keep it, change it in the box, or take it out' : ''}</span>
      {canEdit && <button type="button" className="btn btn-sm" data-luna-keep onClick={e => { e.preventDefault(); void keepLunaAnswer(mark); }}>Keep</button>}
      {canEdit && <button type="button" className="btn btn-sm" data-luna-not onClick={e => { e.preventDefault(); onNot(); }}>Not this</button>}
    </span>
  );
}
