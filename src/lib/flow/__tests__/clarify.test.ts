/* QUESTIONS BEFORE A DESIGN (lib/flow/clarifyCore): what the assistant asks is
 * read before it is shown — capped, trimmed, a question without words dropped
 * — and the answers go into the design request in the person's own words. */
import { describe, expect, it } from 'vitest';
import { CLARIFY_LIMITS, CLARIFY_SCHEMA, readClarify, withAnswers } from '../clarifyCore';
import { readClarified } from '../assist';

describe('the questions, read', () => {
  it('kept as asked, trimmed, the answers not repeated', () => {
    const c = readClarify({
      understood: '  Every short stop on the bagger logged, the biggest cause fixed and proved. ',
      ready: false,
      questions: [
        { ask: 'Who logs the stops?', why: 'Says whose step the log is.', options: ['The operator', 'The line lead', 'the operator', '  '] },
        { ask: 'How long is a short stop?', why: 'Sets what counts as an entry.', options: ['Under a minute', 'Under five minutes'] },
      ],
    });
    expect(c).toEqual({
      understood: 'Every short stop on the bagger logged, the biggest cause fixed and proved.', ready: false,
      questions: [
        { ask: 'Who logs the stops?', why: 'Says whose step the log is.', options: ['The operator', 'The line lead'] },
        { ask: 'How long is a short stop?', why: 'Sets what counts as an entry.', options: ['Under a minute', 'Under five minutes'] },
      ],
    });
  });

  it('never more than four questions or five answers, nor a question without words', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ ask: `Question number ${i + 1}?`, why: '', options: Array.from({ length: 9 }, (__, j) => `Answer ${j + 1}`) }));
    const c = readClarify({ understood: 'x', ready: false, questions: [{ ask: '?', why: '', options: [] }, ...many] });
    expect(c?.questions).toHaveLength(CLARIFY_LIMITS.questions);
    expect(c?.questions[0].ask).toBe('Question number 1?');
    expect(c?.questions.every(q => q.options.length === CLARIFY_LIMITS.options)).toBe(true);
    expect(readClarify({ understood: 'x', ready: false, questions: [{ ask: 'y'.repeat(900), why: '', options: [] }] })?.questions[0].ask).toHaveLength(CLARIFY_LIMITS.ask);
  });

  it('ready when it says so or asks nothing — then no questions; nothing readable is undefined', () => {
    expect(readClarify({ understood: 'Clear.', ready: true, questions: [{ ask: 'Still asking?', why: '', options: [] }] })).toEqual({ understood: 'Clear.', ready: true, questions: [] });
    expect(readClarify({ understood: 'Clear.', ready: false, questions: [] })).toEqual({ understood: 'Clear.', ready: true, questions: [] });
    expect(readClarify(null)).toBeUndefined();
    expect(readClarify('a string')).toBeUndefined();
    expect(readClarify({ ready: false, questions: [] })).toBeUndefined();
  });

  it('the schema is closed at every level, as structured outputs ask', () => {
    expect(CLARIFY_SCHEMA.additionalProperties).toBe(false);
    expect(CLARIFY_SCHEMA.properties.questions.items.additionalProperties).toBe(false);
    expect(CLARIFY_SCHEMA.required).toEqual(['understood', 'ready', 'questions']);
  });
});

describe('the answers, carried into the design', () => {
  const qs = [
    { ask: 'Who logs the stops?', why: '', options: ['The operator'] },
    { ask: 'How long is a short stop?', why: '', options: [] },
    { ask: 'Which shifts?', why: '', options: [] },
  ];
  it('only the questions answered, each in the person’s own answer', () => {
    expect(withAnswers('Log every stop on the bagger.', qs, ['The operator', '', '  all three  '])).toBe(
      'Log every stop on the bagger.\n\nAsked before designing:\n- Who logs the stops? — The operator\n- Which shifts? — all three');
    expect(withAnswers(' Log every stop. ', qs, [])).toBe('Log every stop.');
  });
});

describe('the gateway’s answer, read on the device', () => {
  it('off, refused, unreadable, or the questions', () => {
    expect(readClarified({ off: true, why: 'Not switched on.' })).toEqual({ ok: false, off: true, why: 'Not switched on.' });
    expect(readClarified({ ok: false, why: 'Over the allowance.' })).toEqual({ ok: false, why: 'Over the allowance.' });
    expect(readClarified({ ok: true, clarify: 'nonsense' })).toMatchObject({ ok: false });
    expect(readClarified({ ok: true, clarify: { understood: 'Read.', ready: false, questions: [{ ask: 'Which line is it?', why: 'Its project is on it.', options: ['Line 4'] }] } }))
      .toEqual({ ok: true, understood: 'Read.', questions: [{ ask: 'Which line is it?', why: 'Its project is on it.', options: ['Line 4'] }] });
  });
});
