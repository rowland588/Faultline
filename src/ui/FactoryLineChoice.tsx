import { useCallback, useEffect, useRef, useState } from 'react';
import type { Workspace } from '../types';
import { registerFactoryLinePicker } from '../lib/factoryLineChoice';
import { Sheet, SheetRow } from './Sheet';

/** Only displayed when a saved project line name identifies several factory lines. */
export function FactoryLineChoice() {
  const [options, setOptions] = useState<readonly Workspace[]>([]);
  const resolve = useRef<((choice?: Workspace) => void) | undefined>();
  const choices = useRef<HTMLDivElement>(null);
  const finish = useCallback((choice?: Workspace) => {
    if (!resolve.current) return;
    resolve.current(choice);
    resolve.current = undefined;
    setOptions([]);
  }, []);
  useEffect(() => {
    const remove = registerFactoryLinePicker(list => new Promise(done => {
      resolve.current?.();
      resolve.current = done;
      setOptions(list);
    }));
    const leave = () => finish();
    window.addEventListener('hashchange', leave);
    return () => { remove(); resolve.current?.(); window.removeEventListener('hashchange', leave); };
  }, [finish]);
  const open = options.length > 0;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    choices.current?.querySelector('button')?.focus();
    // A problem editor may already be open underneath this question.
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      finish();
    };
    window.addEventListener('keydown', escape, true);
    return () => {
      window.removeEventListener('keydown', escape, true);
      if (previous?.isConnected) previous.focus();
    };
  }, [open, finish]);
  return <Sheet open={open} onClose={() => finish()} title="Choose the factory line">
    <div ref={choices}>{options.map(w => <SheetRow key={w.id} label={w.name} hint={[w.clientName || 'No customer assigned', w.siteName, w.areaName].filter(Boolean).join(' · ')} onClick={() => finish(w)} />)}</div>
  </Sheet>;
}
