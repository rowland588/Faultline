import { useEffect, useRef, useState } from 'react';
import { ConnectLink } from '../colleague/ConnectSheet';
import { CONNECTION_CHECKS, describeWorkbook, inspectWorkbook } from '../lib/fileLink/connectionChecks';
import { PageHeader, StateTag } from '../ui/parts';

type Result = { passed: boolean; detail: string };
const why = (error: unknown) => error instanceof Error ? error.message : 'The check could not finish. Try again.';

export default function ConnectionTests() {
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const [ownFile, setOwnFile] = useState('');
  const run = useRef<AbortController | null>(null);
  const ownRead = useRef(0);
  useEffect(() => () => { run.current?.abort(); ownRead.current++; }, []);

  const checkAll = async () => {
    if (run.current) return;
    const controller = new AbortController();
    run.current = controller;
    setResults({});
    setRunning(true);
    await Promise.all(CONNECTION_CHECKS.map(async check => {
      let result: Result;
      try { result = { passed: true, detail: await check.run(controller.signal) }; }
      catch (error) { result = { passed: false, detail: why(error) }; }
      if (!controller.signal.aborted) setResults(prev => ({ ...prev, [check.id]: result }));
    }));
    if (!controller.signal.aborted) setRunning(false);
    if (run.current === controller) run.current = null;
  };

  const inspectOwnFile = async (file: File) => {
    const id = ++ownRead.current;
    let message = `Downloaded ${file.name} · ${file.size.toLocaleString('en-GB')} bytes.`;
    if (/\.xls[xm]$/i.test(file.name)) {
      try { message = describeWorkbook(file, await inspectWorkbook(file)); }
      catch (error) { message = `The file downloaded. ${why(error)}`; }
    }
    if (ownRead.current === id) setOwnFile(message);
  };

  const count = Object.keys(results).length;
  const passed = Object.values(results).filter(result => result.passed).length;
  return <div className="wrap qsl dc-page dc-tests" data-connection-tests>
    <PageHeader eyebrow="SET UP" title="Test file connections" back={{ to: '/factory/data', label: 'Data connections' }}
      says={<span className="sub">Run these checks with your Faultline sign-in. You can try SharePoint here without a Microsoft account.</span>} />
    <button type="button" className="btn btn-primary" disabled={running} onClick={() => void checkAll()}>{running ? 'Testing…' : count ? 'Run again' : 'Run checks'}</button>
    <p className="sub" role="status" aria-atomic="true">{running ? `${count} of ${CONNECTION_CHECKS.length} checks complete` : count ? `${passed} of ${CONNECTION_CHECKS.length} passed` : ''}</p>
    {(['Live', 'Simulated'] as const).map(mode => <section key={mode} className="dc-group" aria-label={mode === 'Live' ? 'Live downloads' : 'Simulated SharePoint access'}>
      <h2 className="dc-h">{mode === 'Live' ? 'Live downloads' : 'Simulated SharePoint access'}</h2>
      {mode === 'Simulated' && <p className="sub">A practice site shows what happens when a customer grants or refuses access.</p>}
      <ul className="dc-check-list">{CONNECTION_CHECKS.filter(check => check.mode === mode).map(check => {
        const result = results[check.id];
        return <li key={check.id} data-connection-check={check.id}><div><strong>{check.name}</strong>{result && <p className="sub">{result.detail}</p>}</div>
          <StateTag tone={result ? result.passed ? 'g' : 'r' : 'n'}>{result ? result.passed ? 'Passed' : 'Failed' : running ? 'Testing' : 'Ready'}</StateTag></li>;
      })}</ul>
    </section>)}
    <details className="ms-help"><summary>Try your own file URL</summary>
      <p className="sub">Paste a sharing link to check what Faultline can read. This test leaves your library and customer records untouched.</p>
      <ConnectLink compact onStart={() => { ownRead.current++; setOwnFile(''); }} onPick={file => void inspectOwnFile(file)} />
      {ownFile && <p role="status" data-tested-file>{ownFile}</p>}
      <a className="cw-link" href="/sample/Plan-and-actual-October.xlsx" download>Download a sample workbook to put in your OneDrive</a>
    </details>
  </div>;
}
