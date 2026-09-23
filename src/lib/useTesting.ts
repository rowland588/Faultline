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
  listTests, putTest, deleteTest, testContents,
  listTestItems, putTestItem, deleteTestItem, actionsBecomeFixes,
  onDataChange,
} from '../db';
import { uid, now } from './ids';
import { nextFrom, standing } from './testing';
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
  /** Decide an observation needs doing: it becomes a next step, and the two are
   *  linked. Returns the new next step's id. */
  actionItem: (obs: TestItem) => Promise<string>;
  saveItem: (i: TestItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
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

  const saveAsset = useCallback(async (a: Asset) => { await putAsset({ ...a, updatedAt: now() }); }, []);
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

  /* "I'm live, taking observations, writing stuff down... and I'd appreciate
     then the ability to go yes, let's action this, and then it becomes an
     action."  So the observation stays exactly as written — it is the record of
     what was seen — and a NEXT STEP is made from it, which is the row that
     carries an owner and a date and gets chased. The two point at each other so
     the report can read the chain either way. */
  const actionItem = useCallback(async (obs: TestItem) => {
    const t = now();
    const mine = items.filter(i => i.testId === obs.testId && i.kind === 'next');
    const id = uid();
    await putTestItem({
      id, projectId, testId: obs.testId, kind: 'next', what: obs.what,
      owner: obs.owner, media: obs.media, fromItemId: obs.id,
      sort: mine.reduce((n, i) => Math.max(n, i.sort), 0) + 1,
      createdAt: t, updatedAt: t,
    });
    /* `doneAt` comes off: an observation somebody has decided to act on is not
       also one they decided needed nothing. */
    await putTestItem({ ...obs, becameItemId: id, doneAt: undefined, updatedAt: t });
    return id;
  }, [projectId, items]);

  const saveItem = useCallback(async (i: TestItem) => { await putTestItem({ ...i, updatedAt: now() }); }, []);
  const removeItem = useCallback(async (id: string) => { await deleteTestItem(id); }, []);

  const answer = useMemo(() => standing(tests, items), [tests, items]);

  return {
    loading, assets, tests, items, standing: answer,
    addAsset, saveAsset, removeAsset,
    planTest, saveTest, removeTest, testCost, planNextFrom,
    addItem, actionItem, saveItem, removeItem,
  };
}
