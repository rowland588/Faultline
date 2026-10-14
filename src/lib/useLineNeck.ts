/* THE LINE'S BOTTLENECK, FOR A SCREEN THAT COUNTS ITS LOST PACKS — read from
 * the line's Line capacity (lib/lineLoss neckOf), kept current as anything is
 * written. Undefined while loading and when no capacity is counted. */
import { useEffect, useState } from 'react';
import { listStandardsForLine, onDataChange } from '../db';
import { neckOf, type Neck } from './lineLoss';

export function useLineNeck(wsId: string | undefined): Neck | undefined {
  const [neck, setNeck] = useState<Neck | undefined>(undefined);
  useEffect(() => {
    if (!wsId) { setNeck(undefined); return; }
    let live = true;
    const load = () => void listStandardsForLine(wsId).then(s => { if (live) setNeck(neckOf(s, wsId)); }).catch(() => {});
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [wsId]);
  return neck;
}
