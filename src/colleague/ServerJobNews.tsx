/* OVERNIGHT JOBS — what Luna finished on the server (23 November 2026, docs/LUNA-G6-SERVER.md G6 job slice). */
import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import {
  fetchOpenServerJobs,
  finishServerJob,
  runDeviceLeg,
  serverJobSaid,
  type ServerJobRow,
} from './serverJobClient';
import type { CapCtx } from '../capabilities/types';
export function ServerJobNews({ conversationId, ctx, run, onMerged }: {
  conversationId?: string;
  ctx: () => CapCtx;
  run: (call: { id: string; name: string; input: unknown }) => Promise<{ id: string; ok: boolean; says: string; data?: unknown; declined?: boolean }>;
  onMerged: (row: ServerJobRow) => void;
}) {
  const [rows, setRows] = useState<ServerJobRow[]>([]);
  const [busy, setBusy] = useState('');

  const reload = async () => {
    const all = await fetchOpenServerJobs();
    setRows(all.filter(r => !conversationId || r.conversation_id === conversationId));
  };

  useEffect(() => { void reload(); }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps -- reload closes over fetch only

  useEffect(() => {
    void (async () => {
      for (const row of rows.filter(r => r.status === 'waiting_device')) {
        await runDeviceLeg(row, ctx(), call => run(call));
        await reload();
      }
    })();
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const merge = async (row: ServerJobRow) => {
    setBusy(row.id);
    onMerged(row);
    await finishServerJob(row);
    setRows(all => all.filter(x => x.id !== row.id));
    setBusy('');
  };

  const done = rows.filter(r => r.status === 'done' && !r.merged_at);
  if (!done.length) return null;

  return (
    <section className="ai-news" aria-label="A job Luna carried on while you were away" data-server-job>
      <p className="ai-news-h"><Icon name="spark" size={14} /><b>Luna carried on while you were away</b></p>
      <ul className="ai-news-l">
        {done.map(row => (
          <li key={row.id} className="ai-news-row" data-server-job-row={row.thread_id}>
            <span className="ai-news-w">
              <b>{row.snapshot.job?.goal?.slice(0, 80) || 'Your job'}</b>
              <span className="sub">{serverJobSaid(row).slice(0, 240)}{serverJobSaid(row).length > 240 ? '…' : ''}</span>
            </span>
            <span className="ai-news-acts">
              <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void merge(row)} data-server-job-read>
                {busy === row.id ? 'Putting it in the conversation…' : 'Read it'}
              </button>
              <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => void merge(row)} data-server-job-ok aria-label="OK — put this job away">
                OK
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
