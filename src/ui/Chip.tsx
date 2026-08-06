/* Selectable pill + a wrapping picker with add-inline. The floor's whole
 * vocabulary (what / where / why) is chips you can grow with one tap. */
import { useState } from 'react';

export function Chip({ label, on, color, onClick }: {
  label: string; on?: boolean; color?: string; onClick?: () => void;
}) {
  const style = on && color
    ? { background: color, borderColor: color, color: '#fff' }
    : color ? { borderColor: color + '66', color } : undefined;
  return (
    <button type="button" className={'chip' + (on ? ' on' : '')} style={style} onClick={onClick}>
      {label}
    </button>
  );
}

export function ChipPicker({ options, value, onChange, onAdd, color, addLabel = 'Add…' }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  onAdd?: (v: string) => void;
  color?: string;
  addLabel?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const commit = () => {
    const t = text.trim();
    if (!t) return;
    if (!options.includes(t)) onAdd?.(t);
    onChange(t);
    setText('');
    setAdding(false);
  };
  return (
    <div className="chip-row">
      {options.map(o => <Chip key={o} label={o} on={o === value} color={color} onClick={() => onChange(o)} />)}
      {onAdd && (adding ? (
        <span className="chip chip-add-form">
          <input
            autoFocus value={text} placeholder={addLabel} maxLength={48}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setAdding(false); setText(''); }
            }}
          />
          <button type="button" onClick={commit} disabled={!text.trim()}>Add</button>
        </span>
      ) : (
        <button type="button" className="chip chip-add" onClick={() => setAdding(true)} aria-label="Add option">＋</button>
      ))}
    </div>
  );
}
