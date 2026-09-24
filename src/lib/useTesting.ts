/* The tests for one project, and the few things you can do to them.
 *
 * Deliberately small. There is one record and two lists under it, so there are
 * makers for exactly those and nothing else — no kinds to choose between, no
 * grades, no conditions. If this file starts growing a vocabulary, the model
 * has drifted back towards the five rebuilds that came before it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listAssets, putAsset, deleteAsset,
  listTests, putTest, patchTest, deleteTest, testContents,
  listTestItems, putTestItem, patchTestItem, deleteTestItem, actionsBecomeFixes,
  onDataChange,
} from '../db';
import { uid, now } from './ids';
import { assetStateOf, nextFrom, standing } from './testing';
import type { Asset, AssetState, ItemKind, Standing, Test, TestItem, TestKind } from './testing';

export interface TestingState {
  loading: boolean;
  assets: Asset[];
  tests: Test[];
  items: TestItem[];
  /** The whole answer, derived in one place. */
  standing: Standing;

  /* ---- machines ---- */
  addAsset: (name: string, oem?: string, state?: AssetState) => Promise<string>;
  saveAsset: (a: Asset) => Promise<void>;
  removeAsset: (id: string) => Promise<void>;

  /* ---- tests ---- */
  /** Plan the same test on one machine or several. Picking two machines makes
   *  two tests, same plan, one each — because each asset wants the same sort of
   *  stages and typing them out per machine is the job the app should do. */
  /** `kind` picks which face the new record wears — see lib/testing. A fix is
   *  the same record and the same call; nothing needed a second one. */
  planTest: (title: string, assetIds?: (string | undefined)[], kind?: TestKind) => Promise<string>;
  saveTest: (t: Test) => Promise<void>;
  /** Change some fields of the row AS IT IS NOW. Use this from a button, a
   *  picker or anything that fires after an await — never `saveTest({...test})`
   *  with a row captured at render, which is how a typed result was lost. */
  patchTest: (id: string, patch: Partial<Test> | ((cur: Test) => Partial<Test>)) => Promise<void>;
  removeTest: (id: string) => Promise<void>;
  /** What deleting one would take with it. */
  testCost: (id: string) => Promise<{ found: number; next: number }>;
  /** THE LOOP. A new test carrying this one's machine, product and expectation
   *  forward, and the next step that prompted it marked as having become it.
   *
   *  `kind: 'fix'` makes it a FIX instead, which is the same journey: an
   *  observation or an agreed action outgrows being a line and becomes a
   *  record with its own days, its own findings and its own card. Rowland:
   *  "sometimes I'll discuss the action and agree the fix, other times I'll
   *  just review what we found today and decide myself that this is a fix." */
  planNextFrom: (t: Test, fromItemId?: string, title?: string, kind?: TestKind, problem?: string) => Promise<string>;

  /* ---- what we found, what we do next ---- */
  addItem: (testId: string, kind: ItemKind, what: string) => Promise<void>;
  /** TAKE THE DECISION BACK. Rowland: "when I take [an observation] to send to
   *  fix, I can't untick."
   *
   *  Resolves to true when the fix it made was removed with it, false when the
   *  fix was kept because somebody had already worked on it. */
  unmakeFix: (obs: TestItem) => Promise<boolean>;
  /** Would undoing take the fix with it? False once somebody has worked on it.
   *  The screen asks BEFORE drawing the button, so the consequence is written
   *  where the control is rather than reported afterwards. */
  fixUntouched: (obs: TestItem) => boolean;
  saveItem: (i: TestItem) => Promise<void>;
  patchItem: (id: string, patch: Partial<TestItem> | ((cur: TestItem) => Partial<TestItem>)) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

/** JUST THE MACHINES.
 *
 *  A screen that only wants to name a machine — Programs, say — should not have
 *  to mount the whole testing tree to get one, and certainly should not run the
 *  action-to-fix conversion as a side effect of drawing a dropdown. */
export function useAssets(projectId: string): {
  assets: Asset[]; loading: boolean;
  /** Name a machine from wherever you are standing. Programs needs this: a
   *  project whose machines were never typed in shows no machine picker at all,
   *  so the one screen that wants to say which machine a program is for is also
   *  the screen with no way to get one. Same record the Testing screen makes —
   *  a second door onto it, not a second kind of machine. */
  addAsset: (name: string) => Promise<string>;
} {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setAssets(await listAssets(projectId));
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  const addAsset = useCallback(async (name: string) => {
    const id = uid();
    const sort = assets.reduce((n, a) => Math.max(n, a.sort), 0) + 1;
    await putAsset({ id, projectId, name: name.trim(), state: 'onSite', sort, updatedAt: now() });
    return id;
  }, [projectId, assets]);

  return { assets, loading, addAsset };
}

export function useTesting(projectId: string): TestingState {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [items, setItems] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    /* One noun. Any agreed next step still stored as a line becomes a fix, once,
       on whichever device still has it — see actionsBecomeFixes, which is a
       no-op the moment there are none left. Done before the read so the screen
       never draws the old shape and then blinks. */
    await actionsBecomeFixes(projectId);
    const [a, t, i] = await Promise.all([listAssets(projectId), listTests(projectId), listTestItems(projectId)]);
    setAssets(a); setTests(t); setItems(i);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  const nextSort = useCallback(() => tests.reduce((n, t) => Math.max(n, t.sort), 0) + 1, [tests]);

  /* ------------------------------- machines ------------------------------- */

  const addAsset = useCallback(async (name: string, oem?: string, state: AssetState = 'onSite') => {
    const id = uid();
    const sort = assets.reduce((n, a) => Math.max(n, a.sort), 0) + 1;
    await putAsset({ id, projectId, name: name.trim(), oem: oem?.trim() || undefined, state, sort, updatedAt: now() });
    return id;
  }, [projectId, assets]);

  /* The word follows the dates on every save — see assetStateOf. A screen sets
     a date; nothing sets the word directly any more. */
  const saveAsset = useCallback(async (a: Asset) => { await putAsset({ ...a, state: assetStateOf(a), updatedAt: now() }); }, []);
  const removeAsset = useCallback(async (id: string) => { await deleteAsset(id, projectId); }, [projectId]);

  /* --------------------------------- tests -------------------------------- */

  const planTest = useCallback(async (title: string, assetIds: (string | undefined)[] = [undefined], kind: TestKind = 'test') => {
    const clean = title.trim();
    const t = now();
    let sort = nextSort();
    /* One test per machine, same plan on each. They are separate tests from the
       moment they exist — the wrapper can pass and the checkweigher fail on the
       same day, and a single shared record could not say that. */
    const made = (assetIds.length ? assetIds : [undefined]).map(assetId => ({
      id: uid(), projectId, kind, title: clean, assetId,
      outcome: 'planned' as const, sort: sort++, createdAt: t, updatedAt: t,
    }));
    for (const test of made) await putTest(test);
    return made[0].id;
  }, [projectId, nextSort]);

  const saveTest = useCallback(async (t: Test) => { await putTest({ ...t, updatedAt: now() }); }, []);
  const patchTestCb = useCallback(async (id: string, patch: Partial<Test> | ((cur: Test) => Partial<Test>)) => { await patchTest(id, patch); }, []);
  const removeTest = useCallback(async (id: string) => { await deleteTest(id, projectId); }, [projectId]);
  const testCost = useCallback((id: string) => testContents(id, projectId), [projectId]);

  const planNextFrom = useCallback(async (t: Test, fromItemId?: string, title?: string,
    kind: TestKind = 'test', problem?: string) => {
    const at = now();
    const next = { ...nextFrom(t, uid, at, title, kind, problem), sort: nextSort() };
    await putTest(next);
    /* The next step that prompted it points at the test it became, so the chain
       reads forwards as well as backwards and nobody plans the same re-test twice. */
    if (fromItemId) {
      const item = items.find(i => i.id === fromItemId);
      if (item) await putTestItem({ ...item, becameTestId: next.id, updatedAt: at });
    }
    return next.id;
  }, [nextSort, items]);

  /* ------------------------ found, and what's next ------------------------ */

  const addItem = useCallback(async (testId: string, kind: ItemKind, what: string) => {
    const clean = what.trim();
    if (!clean) return;
    const t = now();
    const mine = items.filter(i => i.testId === testId && i.kind === kind);
    await putTestItem({
      id: uid(), projectId, testId, kind, what: clean,
      sort: mine.reduce((n, i) => Math.max(n, i.sort), 0) + 1,
      createdAt: t, updatedAt: t,
    });
  }, [projectId, items]);

  /* UNDOING THE DECISION.
   *
   * There used to be an actionItem here, which turned an observation into a
   * next step. It is gone: actions are, by Rowland's own call, fixes, and the
   * loader above converts any line still stored as one. Leaving a maker for
   * the noun we removed meant the tick wrote a row that was silently rewritten
   * a moment later — planNextFrom(…, 'fix') writes the record the app
   * actually has, in one step, which is the sentence that earns the removal.
   *
   * THE FIX GOES WITH THE UNDO. An undo that unlinks and leaves the fix behind
   * is not an undo: it is a second row on the Fixes tab that somebody now has
   * to go and close, which is exactly the cost the one-noun decision was meant
   * to avoid. The exception is a fix somebody has already worked on — a day
   * on it, a result, findings under it, evidence attached. Then the work is
   * the thing worth keeping and only the link comes off, and the screen says
   * so beside the button rather than after the fact. */
  const fixUntouched = useCallback((obs: TestItem): boolean => {
    const fix = obs.becameTestId ? tests.find(t => t.id === obs.becameTestId) : undefined;
    if (!fix) return true;                       // already gone: nothing to keep
    return fix.outcome === 'planned' && !fix.result && !fix.ranOn
      && !fix.media?.length && !fix.docs?.length
      && !items.some(i => i.testId === fix.id && !i.deletedAt);
  }, [tests, items]);

  const unmakeFix = useCallback(async (obs: TestItem) => {
    const fix = obs.becameTestId ? tests.find(t => t.id === obs.becameTestId) : undefined;
    const removable = fixUntouched(obs);
    if (fix && removable) await deleteTest(fix.id, projectId);
    /* Both links come off. becameItemId is the old line-under-a-test shape and
       a row carrying one reads as decided just the same. */
    await putTestItem({ ...obs, becameTestId: undefined, becameItemId: undefined, updatedAt: now() });
    return removable;
    /* items is read through fixUntouched, which is itself a dependency. */
  }, [tests, projectId, fixUntouched]);

  const saveItem = useCallback(async (i: TestItem) => { await putTestItem({ ...i, updatedAt: now() }); }, []);
  const patchItem = useCallback(async (id: string, patch: Partial<TestItem> | ((cur: TestItem) => Partial<TestItem>)) => { await patchTestItem(id, patch); }, []);
  const removeItem = useCallback(async (id: string) => { await deleteTestItem(id); }, []);

  const answer = useMemo(() => standing(tests, items), [tests, items]);

  return {
    loading, assets, tests, items, standing: answer,
    addAsset, saveAsset, removeAsset,
    planTest, saveTest, patchTest: patchTestCb, removeTest, testCost, planNextFrom,
    addItem, unmakeFix, fixUntouched, saveItem, patchItem, removeItem,
  };
}
