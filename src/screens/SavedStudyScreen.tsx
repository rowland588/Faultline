import { useEffect, useState } from 'react';
import { getStudy, onDataChange } from '../db';
import type { ToolStudy } from '../lib/study';
import { studyTitle } from '../lib/studyLinks';
import { PageHeader } from '../ui/parts';

const label = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');

function Values({ value }: { value: unknown }) {
  if (Array.isArray(value)) return <ol>{value.map((item, i) => <li key={i}><Values value={item} /></li>)}</ol>;
  if (value && typeof value === 'object') return <dl>{Object.entries(value).map(([key, v]) => <div key={key}><dt>{label(key)}</dt><dd><Values value={v} /></dd></div>)}</dl>;
  return <span style={{ overflowWrap: 'anywhere' }}>{value == null ? '—' : String(value)}</span>;
}

/** Older records without a dedicated editor remain readable, including their original inputs and observations. */
export function SavedStudyScreen({ id }: { id: string }) {
  const [study, setStudy] = useState<ToolStudy | null>();
  useEffect(() => {
    let live = true;
    const load = () => void getStudy(id).then(record => { if (live) setStudy(record ?? null); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [id]);
  if (!study) return <p className="sub wrap" role="status">{study === null ? 'This record is no longer on this device.' : 'Loading saved work…'}</p>;
  return <div className="wrap"><PageHeader title={studyTitle(study)} says="Saved record" />
    {study.agreed && Object.keys(study.agreed).length > 0 && <section><h2>Agreed setup</h2><Values value={study.agreed} /></section>}
    <section><h2>Recorded work</h2>{Object.keys(study.facts).length ? <Values value={study.facts} /> : <p>No observations recorded.</p>}</section>
  </div>;
}
