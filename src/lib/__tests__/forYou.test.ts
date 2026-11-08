import { describe, expect, it } from 'vitest';
import { forYou, isMine, namesIn, namesOnActions } from '../forYou';
import type { ProjectAction } from '../projectActions';

const a = (key: string, who: string, o: Partial<ProjectAction> = {}): ProjectAction => ({ key, kind: 'Problem', what: key, who, late: false, soon: false, ...o } as ProjectAction);

describe('for you', () => {
  it('reads two people out of one Who box, and a name in another case or with accents as the same', () => {
    expect(namesIn('Sam & Jo')).toEqual(['sam', 'jo']);
    expect(namesIn('Sam and Jo, Kim / Łukasz')).toEqual(['sam', 'jo', 'kim', 'łukasz']);
    expect(isMine({ who: 'Sam, Jo' }, 'jo')).toBe(true);
    expect(isMine({ who: 'Joanne' }, 'Jo')).toBe(false);
    expect(isMine({ who: 'Renée' }, 'renee')).toBe(true);
  });
  it('groups what is theirs: late, due by tomorrow, the rest of the week; the bell counts the first two', () => {
    const rows = [
      a('late', 'Sam', { late: true, due: '2026-11-05' }),
      a('today', 'Sam', { due: '2026-11-08' }),
      a('tomorrow', 'Sam & Jo', { due: '2026-11-09' }),
      a('friday', 'Sam', { due: '2026-11-13' }),
      a('later', 'Sam', { due: '2026-11-30' }),
      a('nodate', 'Sam'),
      a('theirs', 'Jo', { late: true, due: '2026-11-01' }),
    ];
    const f = forYou(rows, 'Sam', '2026-11-08');
    expect(f.late.map(x => x.key)).toEqual(['late']);
    expect(f.soon.map(x => x.key)).toEqual(['today', 'tomorrow']);
    expect(f.week.map(x => x.key)).toEqual(['friday']);
    expect(f.count).toBe(3);
    expect(forYou(rows, '', '2026-11-08').count).toBe(0);
  });
  it('offers the names on the actions, most used first', () => {
    expect(namesOnActions([a('1', 'Sam'), a('2', 'Sam & Jo'), a('3', ''), a('4', 'Kim')])).toEqual(['Sam', 'Jo', 'Kim']);
  });
});
