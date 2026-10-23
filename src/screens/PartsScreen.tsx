/* THE PARTS PAGE — every part every page is built from, on one page (docs/STRUCTURE.md §7, B1).
 *
 * In development only (#/parts): photographed with every other page by scripts/inventory.mjs
 * --shots, so a change to a part is seen everywhere it is used before it ships. The words are a
 * stage-gate project's and a line's from the seeds' world, so a part is judged on the house's own
 * content, not on lorem ipsum. Nothing here reads or writes a record. */
import { useState } from 'react';
import { APP_TOOLS } from '../catalogue/registry';
import { KIND_PLACE } from '../catalogue/types';
import { BelongsTo, FilterBar, MoreMenu, PageHeader, RecordRow, RecordRows, ReportMenu, Section, StateTag, Tiles, ViewTabs, type Tone } from '../ui/parts';

const wait = () => new Promise<void>(r => setTimeout(r, 400));

export function PartsScreen() {
  const [view, setView] = useState('plan');
  const [only, setOnly] = useState('all');
  const [said, setSaid] = useState('');
  const tones: [Tone, string][] = [['r', '4 late'], ['a', 'Waiting on Ishida'], ['w', 'Under way'], ['g', 'Done 14 Oct'], ['n', 'Not started']];
  return (
    <div className="wrap parts">
      <PageHeader
        eyebrow="THE PARTS · EVERY PAGE IS BUILT FROM THESE"
        title="Line 2 commissioning"
        state={{ tone: 'r', word: 'Behind target' }}
        says="Handover expected Wed 11 Nov, 8 days after the agreed Tue 3 Nov — 4 of 18 things late."
        primary={{ label: 'Plan the re-test', run: () => setSaid('Plan the re-test') }}
        papers={[
          { label: 'Status report — 1 page', for: 'For the client — where it is, why, what is being done', make: async () => { await wait(); setSaid('Status report — 1 page'); } },
          { label: 'Commissioning report', for: 'For the meeting, machine by machine', make: async () => { await wait(); setSaid('Commissioning report'); } },
          { label: 'Test cards', for: 'For the floor and the OEM — a card a test', make: async () => { await wait(); setSaid('Test cards'); } },
        ]}
        more={[{ label: 'Rename', run: () => setSaid('Rename') }, { label: 'Details', run: () => setSaid('Details') }, { label: 'Delete the project', run: () => setSaid('Delete'), danger: true }]}>
        <BelongsTo line={{ name: 'Line 7', open: () => setSaid('Line 7') }} project={{ name: 'Line 2 commissioning' }} onChange={() => setSaid('Change')} />
      </PageHeader>
      {said && <p className="sub" role="status">Pressed: {said}</p>}

      <Section title="Tiles" count="the lean page's counted figures, each of what it should be">
        <Tiles tiles={[
          { k: 'Handover', v: '27 days', of: 'expected Wed 11 Nov' },
          { k: 'Late', v: '4', of: 'of 18 still to do', tone: 'r' },
          { k: 'Critical', v: '1', of: 'stopping the project', tone: 'r' },
          { k: 'Fixes open', v: '5', of: '2 with no day yet' },
        ]} />
      </Section>

      <Section title="Views" count="one thing, seen several ways">
        <ViewTabs label="The plan" value={view} onChange={setView} views={[
          { key: 'plan', label: 'Install' }, { key: 'setup', label: 'Set up' }, { key: 'commission', label: 'Commission', count: 9 }, { key: 'handover', label: 'Hand over' }, { key: 'timeline', label: 'Timeline' },
        ]} />
      </Section>

      <Section title="Filters that are the counts" count="a count carries colour only when it is abnormal">
        <FilterBar label="Which" value={only} onChange={setOnly} filters={[
          { key: 'all', label: 'open', count: 12 }, { key: 'late', label: 'late', count: 4, tone: 'r' }, { key: 'critical', label: 'critical', count: 1, tone: 'r' }, { key: 'none', label: 'nobody yet', count: 0, tone: 'a' },
        ]} />
      </Section>

      <Section title="A state, in its colour and its word">
        <p>{tones.map(([t, w]) => <StateTag key={t} tone={t}>{w}</StateTag>)}</p>
      </Section>

      <Section title="Rows" count="what it is · what it says · where it is" action={{ label: 'All actions ›', run: () => setSaid('All actions') }}>
        <RecordRows label="Needs you">
          <RecordRow what="Programs cannot be copied over from the old line" says="Critical" tone="r" where="Ilapak flow wrapper · Ilapak UK" onOpen={() => setSaid('the critical problem')} />
          <RecordRow what="Changeover 2kg → 1.25kg" says="was 9 Oct" tone="r" where="Test · Ilapak UK" onOpen={() => setSaid('the late test')} />
          <RecordRow what="Domino coder on site" says="due Fri" tone="a" where="Machine · Domino UK" onOpen={() => setSaid('the machine')} />
        </RecordRows>
      </Section>

      <Section title="Menus on their own" count="Report ▾ and More ▾, wherever a page has paper or other actions">
        <div className="chip-row">
          <ReportMenu papers={[{ label: 'Line report', for: 'The week on this line in one page', make: () => setSaid('Line report') }]} />
          <MoreMenu items={[{ label: 'Set up the line', run: () => setSaid('Set up the line') }]} />
        </div>
      </Section>

      <Section title="The app's tools, from the catalogue" count={`${APP_TOOLS.length} — each listed where its kind lives`}>
        <RecordRows label="The app's tools">
          {APP_TOOLS.map(t => <RecordRow key={t.id} what={t.label} says={`${t.kind} · listed under ${KIND_PLACE[t.kind]}`} where={`${t.id} · ${t.says}`} onOpen={() => setSaid(t.label)} />)}
        </RecordRows>
      </Section>
    </div>
  );
}
