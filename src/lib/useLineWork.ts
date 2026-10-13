/* THE FACTORY'S LINES AND THEIR OWN WORK, LIVE (lib/lineWork) — the lines on
 * the floor in order, every problem and every program on the device, read
 * again a moment after anything is written, so the control room counts a
 * line's own problems and programs the moment they change. `null` until read. */
import { useEffect, useState } from 'react';
import { listAllPrograms, listAllSnags, listWorkspaces, onDataChange } from '../db';
import { liveProductionLines } from './lines';
import type { LineInput } from './lineWork';

export function useLineWork(): LineInput[] | null {
  const [state, setState] = useState<LineInput[] | null>(null);
  useEffect(() => {
    let live = true;
    let timer: number | undefined;
    const load = async () => {
      const [ws, snags, programs] = await Promise.all([listWorkspaces(), listAllSnags(), listAllPrograms()]);
      const lines = await liveProductionLines(ws);
      if (live) setState(lines.map(w => ({ line: { id: w.id, name: w.name }, snags, programs })));
    };
    void load();
    const off = onDataChange(() => { window.clearTimeout(timer); timer = window.setTimeout(() => void load(), 250); });
    return () => { live = false; window.clearTimeout(timer); off(); };
  }, []);
  return state;
}
