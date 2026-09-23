/* Local (camelCase, epoch-ms) <-> cloud row (snake_case, bigint) translation for
 * every synced entity, plus which media blob keys each one references. The sync
 * engine iterates MAPS; nothing here touches the network. */
import type { SyncKind } from '../db';
import type { Workspace, Observation, Case, Project, ProjectLineTarget, ProjectLineActual } from '../types';
import type { PaceLineRow, PaceTodoRow, PaceSnapshotRow, PaceWinRow, TreeNodeRow } from '../db';
import type { Asset, Test, TestItem } from '../lib/testing';
import type { Reading, Target } from '../lib/measures';
import type { Material } from '../lib/materials';
import type { Program, ProgramState } from '../lib/programs';
import type { Segment, SnagAsset, Snag } from '../snag/types';

type Row = Record<string, unknown>;

/** A blob this record points at. `mime` is a fallback used only when the bytes
 *  aren't self-identifying — storage doesn't reliably preserve content types,
 *  and an untyped blob won't play (see lib/mime). `owner` is the capturer's
 *  auth id — the legacy per-user storage folder to try when the shared flat
 *  path misses (media uploaded before workspaces became shared lives there). */
export interface MediaKey { key: string; mime?: string; owner?: string }

export interface EntityMap {
  /** `fallbackOwner` is used only for rows created on THIS device — editing a
   *  teammate's row must never steal its ownership. */
  toRow(local: unknown, fallbackOwner: string): Row;
  fromRow(row: Row): Row;
  mediaKeys(local: unknown): MediaKey[];
  /** The LWW clock for this local record. */
  clock(local: unknown): number;
}

const k = (key: string | undefined, mime?: string, owner?: string): MediaKey[] => (key ? [{ key, mime, owner }] : []);

const n = (v: unknown): number | undefined => (v == null ? undefined : Number(v));

export const MAPS: Record<SyncKind, EntityMap> = {
  workspaces: {
    clock: l => (l as Workspace).updatedAt ?? (l as Workspace).createdAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const w = l as Workspace;
      return {
        id: w.id, owner_id: w.ownerId ?? fallbackOwner, name: w.name, color: w.color ?? null,
        categories: w.categories, subcategories: w.subcategories, assets: w.assets, shifts: w.shifts,
        crew: w.crew ?? null, labour_rate_per_hour: w.labourRatePerHour ?? null, labour_burden: w.labourBurden ?? null,
        packs_per_min: w.packsPerMin ?? null, margin_per_pack: w.marginPerPack ?? null,
        last_category: w.lastCategory ?? null, last_asset: w.lastAsset ?? null,
        archived: !!w.archived, created_at: w.createdAt, updated_at: w.updatedAt ?? w.createdAt, deleted_at: null,
      };
    },
    // NB: device-only fields (activeTimer, lastRoute, schemaVersion) are NOT in
    // the row and are preserved by the sync merge, not reconstructed here.
    fromRow: (r) => ({
      id: r.id as string, ownerId: (r.owner_id as string) ?? undefined, name: r.name as string, color: (r.color as string) ?? undefined,
      categories: (r.categories as string[]) ?? [], subcategories: (r.subcategories as Record<string, string[]>) ?? {},
      assets: (r.assets as string[]) ?? [], shifts: (r.shifts as Workspace['shifts']) ?? [],
      crew: n(r.crew), labourRatePerHour: n(r.labour_rate_per_hour), labourBurden: n(r.labour_burden),
      packsPerMin: n(r.packs_per_min), marginPerPack: n(r.margin_per_pack),
      lastCategory: (r.last_category as string) ?? undefined, lastAsset: (r.last_asset as string) ?? undefined,
      archived: !!r.archived, createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
    }),
  },

  observations: {
    clock: l => (l as Observation).updatedAt ?? (l as Observation).createdAt,
    mediaKeys: l => { const o = l as Observation; return o.media.flatMap(m => [...k(m.blobKey, m.mime, o.ownerId), ...k(m.thumbKey, 'image/jpeg', o.ownerId)]); },
    toRow: (l, fallbackOwner) => {
      const o = l as Observation;
      return {
        id: o.id, owner_id: o.ownerId ?? fallbackOwner, workspace_id: o.workspaceId, category: o.category, subcategory: o.subcategory ?? null,
        asset: o.asset, shift: o.shift ?? null, started_at: o.startedAt, ended_at: o.endedAt ?? null,
        duration_ms: o.durationMs, timing: o.timing, count: o.count, value_num: o.valueNum ?? null, cost_per: o.costPer ?? null,
        note: o.note ?? null, media: o.media, created_at: o.createdAt, updated_at: o.updatedAt, deleted_at: o.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, ownerId: (r.owner_id as string) ?? undefined, workspaceId: r.workspace_id as string, category: r.category as string,
      subcategory: (r.subcategory as string) ?? undefined, asset: r.asset as string, shift: (r.shift as string) ?? undefined,
      startedAt: Number(r.started_at), endedAt: n(r.ended_at), durationMs: Number(r.duration_ms), timing: r.timing as Observation['timing'],
      count: Number(r.count) || 1, valueNum: n(r.value_num), costPer: n(r.cost_per), note: (r.note as string) ?? undefined,
      media: (r.media as Observation['media']) ?? [], createdAt: Number(r.created_at), updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    }),
  },

  segments: {
    clock: l => (l as Segment).updatedAt ?? (l as Segment).createdAt,
    mediaKeys: l => { const s = l as Segment; return [...k(s.videoKey, 'video/mp4', s.ownerId), ...k(s.posterKey, 'image/jpeg', s.ownerId)]; },
    toRow: (l, fallbackOwner) => {
      const s = l as Segment;
      return { id: s.id, owner_id: s.ownerId ?? fallbackOwner, workspace_id: s.workspaceId, sequence: s.sequence, name: s.name ?? null,
        video_key: s.videoKey, poster_key: s.posterKey ?? null, duration_s: s.durationS ?? null,
        created_at: s.createdAt, updated_at: s.updatedAt ?? s.createdAt, deleted_at: null };
    },
    fromRow: (r) => ({
      id: r.id as string, ownerId: (r.owner_id as string) ?? undefined, workspaceId: r.workspace_id as string, sequence: Number(r.sequence) || 0,
      name: (r.name as string) ?? undefined, videoKey: r.video_key as string, posterKey: (r.poster_key as string) ?? undefined,
      durationS: n(r.duration_s), createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
    }),
  },

  snag_assets: {
    clock: l => (l as SnagAsset).updatedAt ?? (l as SnagAsset).createdAt,
    mediaKeys: l => { const a = l as SnagAsset; return k(a.stillKey, 'image/jpeg', a.ownerId); },
    toRow: (l, fallbackOwner) => {
      const a = l as SnagAsset;
      // segment_id is null once the clip is gone — an explicit null, not an
      // absent key, or the upsert would leave the old link standing on the server
      return { id: a.id, owner_id: a.ownerId ?? fallbackOwner, workspace_id: a.workspaceId, segment_id: a.segmentId ?? null, timestamp_s: a.timestampS,
        name: a.name, code: a.code ?? null, still_key: a.stillKey,
        created_at: a.createdAt, updated_at: a.updatedAt ?? a.createdAt, deleted_at: null };
    },
    fromRow: (r) => ({
      id: r.id as string, ownerId: (r.owner_id as string) ?? undefined, workspaceId: r.workspace_id as string,
      // null once the clip is deleted — the frame stays, the link to the video goes
      segmentId: (r.segment_id as string) ?? undefined,
      timestampS: Number(r.timestamp_s) || 0, name: r.name as string, code: (r.code as string) ?? undefined,
      stillKey: r.still_key as string, createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
    }),
  },

  snags: {
    clock: l => (l as Snag).updatedAt ?? (l as Snag).raisedAt,
    mediaKeys: l => { const s = l as Snag; return [...k(s.detailPhotoKey, 'image/jpeg', s.ownerId), ...k(s.fixedPhotoKey, 'image/jpeg', s.ownerId)]; },
    toRow: (l, fallbackOwner) => {
      const s = l as Snag;
      return { id: s.id, owner_id: s.ownerId ?? fallbackOwner, workspace_id: s.workspaceId,
        asset_id: s.assetId ?? null, x_pct: s.xPct ?? null, y_pct: s.yPct ?? null,
        target_category: s.targetCategory ?? null, target_subcategory: s.targetSubcategory ?? null, target_asset: s.targetAsset ?? null,
        case_id: s.caseId ?? null,
        problem: s.problem, proposed_solution: s.proposedSolution ?? null, status: s.status, owner: s.owner ?? null,
        raised_at: s.raisedAt, due_at: s.dueAt ?? null,
        latest_update: s.latestUpdate ?? null, latest_update_at: s.latestUpdateAt ?? null,
        closed_at: s.closedAt ?? null, close_note: s.closeNote ?? null,
        detail_photo_key: s.detailPhotoKey ?? null, fixed_photo_key: s.fixedPhotoKey ?? null, linked_obs_ids: s.linkedObsIds ?? [],
        updated_at: s.updatedAt ?? s.raisedAt, deleted_at: s.deletedAt ?? null };
    },
    fromRow: (r) => ({
      id: r.id as string, ownerId: (r.owner_id as string) ?? undefined, workspaceId: r.workspace_id as string,
      assetId: (r.asset_id as string) ?? undefined,
      xPct: r.x_pct == null ? undefined : Number(r.x_pct), yPct: r.y_pct == null ? undefined : Number(r.y_pct),
      targetCategory: (r.target_category as string) ?? undefined, targetSubcategory: (r.target_subcategory as string) ?? undefined,
      targetAsset: (r.target_asset as string) ?? undefined, caseId: (r.case_id as string) ?? undefined, problem: r.problem as string,
      proposedSolution: (r.proposed_solution as string) ?? undefined, status: r.status as Snag['status'],
      owner: (r.owner as string) ?? undefined, raisedAt: Number(r.raised_at), dueAt: n(r.due_at),
      latestUpdate: (r.latest_update as string) ?? undefined, latestUpdateAt: n(r.latest_update_at),
      closedAt: n(r.closed_at),
      closeNote: (r.close_note as string) ?? undefined, detailPhotoKey: (r.detail_photo_key as string) ?? undefined,
      fixedPhotoKey: (r.fixed_photo_key as string) ?? undefined,
      linkedObsIds: (r.linked_obs_ids as string[]) ?? undefined, updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    }),
  },

  cases: {
    clock: l => (l as Case).updatedAt ?? (l as Case).openedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const c = l as Case;
      return { id: c.id, owner_id: c.ownerId ?? fallbackOwner, workspace_id: c.workspaceId,
        title: c.title, path: c.path, note: c.note ?? null, whys: c.whys ?? null, study: c.study ?? null,
        baseline_ms_week: c.baselineMsWeek, target_ms_week: c.targetMsWeek ?? null,
        status: c.status, opened_at: c.openedAt, closed_at: c.closedAt ?? null,
        updated_at: c.updatedAt ?? c.openedAt, deleted_at: c.deletedAt ?? null };
    },
    fromRow: (r) => ({
      id: r.id as string, ownerId: (r.owner_id as string) ?? undefined, workspaceId: r.workspace_id as string,
      title: r.title as string, path: (r.path as Case['path']) ?? [], note: (r.note as string) ?? undefined,
      whys: (r.whys as string[]) ?? undefined, study: (r.study as Case['study']) ?? undefined,
      baselineMsWeek: Number(r.baseline_ms_week) || 0, targetMsWeek: n(r.target_ms_week),
      status: (r.status as Case['status']) ?? 'open', openedAt: Number(r.opened_at), closedAt: n(r.closed_at),
      updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    }),
  },
  // Projects — the initiative itself: its name, who leads it, and nothing more.
  // Its lines live in pace_ppm and its people in project_members.
  projects: {
    clock: (l) => (l as Project).updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const p = l as Project;
      return {
        id: p.id, owner_id: p.ownerId ?? fallbackOwner,
        name: p.name, description: p.description ?? null, color: p.color,
        workspace_ids: p.workspaceIds,
        lead: p.lead ?? null, lead_email: p.leadEmail ?? null,
        lever_tree: p.leverTree ?? false,
        pareto: p.pareto ?? false,
        commissioning: p.commissioning ?? false,
        planned_at: p.plannedAt ?? null, expected_at: p.expectedAt ?? null,
        measures: p.measures ?? null, periods: p.periods ?? null,
        archived_at: p.archivedAt ?? null,
        created_at: p.createdAt, updated_at: p.updatedAt, deleted_at: p.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, ownerId: (r.owner_id as string) ?? undefined,
      name: r.name as string, description: (r.description as string) ?? undefined,
      color: r.color as string,
      workspaceIds: (r.workspace_ids as string[]) ?? [],
      lead: (r.lead as string) ?? undefined, leadEmail: (r.lead_email as string) ?? undefined,
      leverTree: r.lever_tree === true || undefined,
      pareto: r.pareto === true || undefined,
      commissioning: r.commissioning === true || undefined,
      plannedAt: (r.planned_at as string) ?? undefined,
      expectedAt: (r.expected_at as string) ?? undefined,
      measures: (r.measures as Project['measures']) ?? undefined,
      periods: (r.periods as Project['periods']) ?? undefined,
      archivedAt: n(r.archived_at),
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    }),
  },
  project_targets: {
    clock: (l) => (l as ProjectLineTarget).updatedAt,
    mediaKeys: () => [],
    toRow: (l) => {
      const t = l as ProjectLineTarget;
      return {
        id: t.id, project_id: t.projectId, workspace_id: t.workspaceId, line_variant: t.lineVariant ?? null,
        q1_target: t.q1Target, q2_target: t.q2Target, q3_target: t.q3Target, q4_target: t.q4Target,
        start_date: t.startDate, created_at: t.createdAt, updated_at: t.updatedAt, deleted_at: t.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: r.project_id as string, workspaceId: r.workspace_id as string,
      lineVariant: (r.line_variant as string) ?? undefined, q1Target: Number(r.q1_target),
      q2Target: Number(r.q2_target), q3Target: Number(r.q3_target), q4Target: Number(r.q4_target),
      startDate: Number(r.start_date), createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    }),
  },
  project_actuals: {
    clock: (l) => (l as ProjectLineActual).updatedAt,
    mediaKeys: () => [],
    toRow: (l) => {
      const a = l as ProjectLineActual;
      return {
        id: a.id, project_id: a.projectId, workspace_id: a.workspaceId, line_variant: a.lineVariant ?? null,
        date: a.date, actual_ppm: a.actualPpm, created_at: a.createdAt, updated_at: a.updatedAt, deleted_at: a.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: r.project_id as string, workspaceId: r.workspace_id as string,
      lineVariant: (r.line_variant as string) ?? undefined, date: Number(r.date),
      actualPpm: Number(r.actual_ppm), createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    }),
  },

  /* ---- Project Pace ----
   * Per-USER rows, not workspace children: this is one person's management
   * surface, so the cloud scopes them by owner_id rather than by membership.
   * JSON columns hold the arrays whole (a snapshot's actions, a line's weekly
   * readings) — they are read and written as one document, never queried into,
   * so splitting them into rows would buy nothing and cost a join. */
  pace_ppm: {
    clock: l => (l as PaceLineRow).updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const p = l as PaceLineRow;
      return {
        id: p.id, owner_id: fallbackOwner, project_id: p.projectId ?? null,
        line_key: p.key, name: p.name, variant: p.variant ?? null,
        line_owner: p.owner ?? null, line_owner_email: p.ownerEmail ?? null,
        sponsor: p.sponsor ?? null, sponsor_email: p.sponsorEmail ?? null,
        workspace_id: p.workspaceId ?? null, sort: p.sort ?? 0,
        /* q1..q4 and weekly are still columns on this table and are no longer
           written: the numbers moved to `targets` and `readings`. They default
           to 0 and [] in the cloud, so an insert without them is accepted —
           which is why removing them needed no migration. */
        updated_at: p.updatedAt, deleted_at: p.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, key: r.line_key as string, name: r.name as string,
      variant: (r.variant as string) ?? undefined,
      projectId: (r.project_id as string) ?? undefined,
      owner: (r.line_owner as string) ?? undefined, ownerEmail: (r.line_owner_email as string) ?? undefined,
      sponsor: (r.sponsor as string) ?? undefined, sponsorEmail: (r.sponsor_email as string) ?? undefined,
      workspaceId: (r.workspace_id as string) ?? undefined, sort: Number(r.sort) || 0,
      updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    }),
  },

  pace_todos: {
    clock: l => (l as PaceTodoRow).updatedAt,
    // the attached pictures travel with the row, same as an observation's
    mediaKeys: l => ((l as PaceTodoRow).media ?? [])
      .flatMap(m => [...k(m.blobKey, m.mime), ...k(m.thumbKey, 'image/jpeg')]),
    toRow: (l, fallbackOwner) => {
      const t = l as PaceTodoRow;
      return {
        id: t.id, owner_id: fallbackOwner, project_id: t.projectId ?? null, line_id: t.lineId ?? null,
        what: t.what, where_at: t.where, why: t.why, who: t.who, when_at: t.when,
        state: t.state, media: t.media ?? [], notes: t.notes ?? '', outcome: t.outcome ?? '',
        created_at: t.createdAt, updated_at: t.updatedAt, deleted_at: null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: (r.project_id as string) ?? undefined,
      lineId: (r.line_id as string) ?? undefined,
      what: (r.what as string) ?? '', where: (r.where_at as string) ?? '', why: (r.why as string) ?? '',
      who: (r.who as string) ?? '', when: (r.when_at as string) ?? '',
      state: (r.state as PaceTodoRow['state']) ?? 'todo',
      media: (r.media as PaceTodoRow['media']) ?? [],
      notes: (r.notes as string) ?? '',
      outcome: (r.outcome as string) ?? '',
      createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
    }),
  },

  pace_wins: {
    clock: l => (l as PaceWinRow).updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const w = l as PaceWinRow;
      return {
        id: w.id, owner_id: fallbackOwner, project_id: w.projectId ?? null, line_id: w.lineId ?? null,
        title: w.title, story: w.story, where_at: w.where, who: w.who, impact: w.impact,
        proof: w.proof ?? null,
        created_at: w.createdAt, updated_at: w.updatedAt, deleted_at: null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: (r.project_id as string) ?? undefined,
      lineId: (r.line_id as string) ?? undefined,
      title: (r.title as string) ?? '', story: (r.story as string) ?? '',
      where: (r.where_at as string) ?? '', who: (r.who as string) ?? '', impact: (r.impact as string) ?? '',
      proof: (r.proof as PaceWinRow['proof']) ?? undefined,
      createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
    }),
  },

  tree_nodes: {
    clock: l => (l as TreeNodeRow).updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const n = l as TreeNodeRow;
      return {
        id: n.id, owner_id: fallbackOwner, project_id: n.projectId,
        // null, not undefined: the root has no parent, and an absent key would
        // leave whatever the row said before standing on the server
        parent_id: n.parentId ?? null,
        text: n.text, rag: n.rag, sort: n.sort, bind: n.bind ?? null,
        created_at: n.createdAt, updated_at: n.updatedAt, deleted_at: null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: r.project_id as string,
      parentId: (r.parent_id as string) ?? undefined,
      text: (r.text as string) ?? '', rag: ((r.rag as string) ?? 'n') as TreeNodeRow['rag'],
      sort: Number(r.sort) || 0, bind: (r.bind as TreeNodeRow['bind']) ?? undefined,
      createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
    }),
  },

  /* THE MACHINES. One row per machine on the line, carrying its state, who
     supplied it and the paperwork they sent. `docs` is jsonb metadata; the BYTES
     ride the media pipeline exactly like a snag photo, which is what makes an
     OEM report openable on a factory floor with no signal. */
  commission_assets: {
    clock: l => (l as Asset).updatedAt,
    mediaKeys: l => ((l as Asset).docs ?? []).flatMap(d => k(d.blobKey, d.mime)),
    toRow: (l, fallbackOwner) => {
      const a = l as Asset;
      return {
        id: a.id, owner_id: fallbackOwner, project_id: a.projectId,
        name: a.name, oem: a.oem ?? null, state: a.state,
        due_on: a.dueOn ?? null, on_site_on: a.onSiteOn ?? null,
        installed_on: a.installedOn ?? null, running_on: a.runningOn ?? null,
        docs: a.docs ?? null, note: a.note ?? null, sort: a.sort,
        updated_at: a.updatedAt, deleted_at: a.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: r.project_id as string,
      name: (r.name as string) ?? '', oem: (r.oem as string) ?? undefined,
      state: ((r.state as Asset['state']) ?? 'onSite'),
      dueOn: (r.due_on as string) ?? undefined,
      onSiteOn: (r.on_site_on as string) ?? undefined,
      installedOn: (r.installed_on as string) ?? undefined,
      runningOn: (r.running_on as string) ?? undefined,
      docs: (r.docs as Asset['docs']) ?? undefined,
      note: (r.note as string) ?? undefined,
      sort: Number(r.sort) || 0,
      updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    } satisfies Asset),
  },

  /* A TEST. The plan and the day are separate columns on purpose — planned_for
     against ran_on, planned against product — because the day is fluid and the
     difference between what you meant to do and what you did is usually the
     story. One column that followed the result around would always report that
     everything went to plan. */
  tests: {
    clock: l => (l as Test).updatedAt,
    mediaKeys: l => ((l as Test).media ?? []).flatMap(m => [...k(m.blobKey, m.mime), ...k(m.thumbKey, 'image/jpeg')])
      .concat(((l as Test).docs ?? []).flatMap(d => k(d.blobKey, d.mime))),
    toRow: (l, fallbackOwner) => {
      const t = l as Test;
      return {
        id: t.id, owner_id: fallbackOwner, project_id: t.projectId,
        kind: t.kind ?? 'test',
        title: t.title, asset_id: t.assetId ?? null,
        planned_for: t.plannedFor ?? null, planned_to: t.plannedTo ?? null,
        passes_if: t.passesIf ?? null,
        with_whom: t.withWhom ?? null, planned: t.planned ?? null,
        ran_on: t.ranOn ?? null, ran_to: t.ranTo ?? null,
        product: t.product ?? null, result: t.result ?? null,
        outcome: t.outcome,
        media: t.media ?? null, docs: t.docs ?? null,
        from_test_id: t.fromTestId ?? null,
        sort: t.sort, created_at: t.createdAt,
        updated_at: t.updatedAt, deleted_at: t.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: r.project_id as string,
      /* A row written before fixes existed has no kind and is a test. */
      kind: ((r.kind as Test['kind']) ?? 'test'),
      title: (r.title as string) ?? '',
      assetId: (r.asset_id as string) ?? undefined,
      plannedFor: (r.planned_for as string) ?? undefined,
      plannedTo: (r.planned_to as string) ?? undefined,
      passesIf: (r.passes_if as string) ?? undefined,
      withWhom: (r.with_whom as string) ?? undefined,
      planned: (r.planned as string) ?? undefined,
      ranOn: (r.ran_on as string) ?? undefined,
      ranTo: (r.ran_to as string) ?? undefined,
      product: (r.product as string) ?? undefined,
      result: (r.result as string) ?? undefined,
      outcome: ((r.outcome as Test['outcome']) ?? 'planned'),
      media: (r.media as Test['media']) ?? undefined,
      docs: (r.docs as Test['docs']) ?? undefined,
      fromTestId: (r.from_test_id as string) ?? undefined,
      sort: Number(r.sort) || 0, createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    } satisfies Test),
  },

  /* WHAT WE FOUND, and WHAT WE DO NEXT. One table for both: they are the same
     shape — a line of words, somebody's name, a date and whatever was filmed —
     and `kind` is the only thing that differs. */
  test_items: {
    clock: l => (l as TestItem).updatedAt,
    mediaKeys: l => ((l as TestItem).media ?? []).flatMap(m => [...k(m.blobKey, m.mime), ...k(m.thumbKey, 'image/jpeg')]),
    toRow: (l, fallbackOwner) => {
      const i = l as TestItem;
      return {
        id: i.id, owner_id: fallbackOwner, project_id: i.projectId,
        test_id: i.testId, kind: i.kind, what: i.what, note: i.note ?? null,
        owner: i.owner ?? null, due: i.due ?? null, done_at: i.doneAt ?? null,
        media: i.media ?? null, became_test_id: i.becameTestId ?? null,
        became_item_id: i.becameItemId ?? null, from_item_id: i.fromItemId ?? null,
        sort: i.sort, created_at: i.createdAt,
        updated_at: i.updatedAt, deleted_at: i.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: r.project_id as string,
      testId: (r.test_id as string) ?? '',
      kind: ((r.kind as TestItem['kind']) ?? 'found'),
      what: (r.what as string) ?? '',
      note: (r.note as string) ?? undefined,
      owner: (r.owner as string) ?? undefined,
      due: (r.due as string) ?? undefined,
      doneAt: n(r.done_at),
      media: (r.media as TestItem['media']) ?? undefined,
      becameTestId: (r.became_test_id as string) ?? undefined,
      becameItemId: (r.became_item_id as string) ?? undefined,
      fromItemId: (r.from_item_id as string) ?? undefined,
      sort: Number(r.sort) || 0, createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    } satisfies TestItem),
  },

  /* WHAT A LINE IS AIMING AT. One row per line x measure x period. The measures
     and the periods themselves ride on the project row, because they are small
     lists owned entirely by it and are always read with it. */
  targets: {
    clock: l => (l as Target).updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const t = l as Target;
      return {
        id: t.id, owner_id: fallbackOwner, project_id: t.projectId,
        line_id: t.lineId, measure_id: t.measureId, period_id: t.periodId,
        value: t.value, updated_at: t.updatedAt, deleted_at: t.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: r.project_id as string,
      lineId: (r.line_id as string) ?? '', measureId: (r.measure_id as string) ?? '',
      periodId: (r.period_id as string) ?? '', value: Number(r.value) || 0,
      updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    } satisfies Target),
  },

  /* WHAT IT ACTUALLY DID. One row per line x measure x date. `at` is an ISO
     date rather than a timestamp: a reading is taken on a DAY, and a midnight
     in some zone shows in Manchester as the day before. */
  readings: {
    clock: l => (l as Reading).updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const r = l as Reading;
      return {
        id: r.id, owner_id: fallbackOwner, project_id: r.projectId,
        line_id: r.lineId, measure_id: r.measureId, at: r.at, value: r.value,
        note: r.note ?? null, created_at: r.createdAt,
        updated_at: r.updatedAt, deleted_at: r.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: r.project_id as string,
      lineId: (r.line_id as string) ?? '', measureId: (r.measure_id as string) ?? '',
      at: (r.at as string) ?? '', value: Number(r.value) || 0,
      note: (r.note as string) ?? undefined,
      createdAt: Number(r.created_at), updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    } satisfies Reading),
  },

  programs: {
    clock: l => (l as Program).updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const p = l as Program;
      return {
        id: p.id, owner_id: fallbackOwner, project_id: p.projectId,
        what: p.what, runs: p.runs ?? null,
        asset_id: p.assetId ?? null, line_id: p.lineId ?? null,
        state: p.state,
        test_on: p.testOn ?? null, proved_on: p.provedOn ?? null, test_id: p.testId ?? null,
        supplier: p.from ?? null, note: p.note ?? null,
        sort: p.sort, created_at: p.createdAt,
        updated_at: p.updatedAt, deleted_at: p.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: r.project_id as string,
      what: (r.what as string) ?? '',
      runs: (r.runs as string) ?? undefined,
      assetId: (r.asset_id as string) ?? undefined,
      lineId: (r.line_id as string) ?? undefined,
      // A cloud row written by a build that knows a state this one does not
      // reads as needed rather than as undefined, which would crash a screen.
      state: (['needed', 'onMachine', 'proved'].includes(r.state as string)
        ? r.state as ProgramState : 'needed'),
      testOn: (r.test_on as string) ?? undefined,
      provedOn: (r.proved_on as string) ?? undefined,
      testId: (r.test_id as string) ?? undefined,
      from: (r.supplier as string) ?? undefined,
      note: (r.note as string) ?? undefined,
      sort: Number(r.sort) || 0, createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    } satisfies Program),
  },

  materials: {
    clock: l => (l as Material).updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const m = l as Material;
      return {
        id: m.id, owner_id: fallbackOwner, project_id: m.projectId,
        what: m.what, how_much: m.howMuch ?? null, line_id: m.lineId ?? null,
        supplier: m.from ?? null, due: m.due ?? null,
        here: !!m.here, in_on: m.inOn ?? null, note: m.note ?? null,
        sort: m.sort, created_at: m.createdAt,
        updated_at: m.updatedAt, deleted_at: m.deletedAt ?? null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: r.project_id as string,
      what: (r.what as string) ?? '',
      howMuch: (r.how_much as string) ?? undefined,
      lineId: (r.line_id as string) ?? undefined,
      from: (r.supplier as string) ?? undefined,
      due: (r.due as string) ?? undefined,
      here: r.here === true || undefined,
      inOn: (r.in_on as string) ?? undefined,
      note: (r.note as string) ?? undefined,
      sort: Number(r.sort) || 0, createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at), deletedAt: n(r.deleted_at),
    } satisfies Material),
  },

  pace_snapshots: {
    // A snapshot is never edited, so its clock is simply when it was taken.
    clock: l => (l as PaceSnapshotRow).takenAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const s = l as PaceSnapshotRow;
      return {
        id: s.id, owner_id: fallbackOwner, project_id: s.projectId ?? null,
        taken_at: s.takenAt, file_name: s.fileName,
        actions: s.actions, roster: s.roster ?? null, pareto: s.pareto ?? null,
        // the engine's LWW reads updated_at for every kind; a snapshot is never
        // edited, so it mirrors when it was taken
        updated_at: s.takenAt, deleted_at: null,
      };
    },
    fromRow: (r) => ({
      id: r.id as string, projectId: (r.project_id as string) ?? undefined,
      takenAt: Number(r.taken_at), fileName: (r.file_name as string) ?? 'upload',
      actions: (r.actions as unknown[]) ?? [], roster: r.roster ?? undefined,
      pareto: r.pareto ?? undefined,
    }),
  },
};

// cases push before snags so a snag's case_id never points at a case the cloud
// hasn't met (no hard FK, but no reason to arrive out of order either).
// A project must reach the cloud BEFORE the lines that name it, so somebody
// invited into it never receives a line pointing at a project they can't see.
export const SYNC_KINDS: SyncKind[] = [
  'workspaces', 'cases', 'observations', 'segments', 'snag_assets', 'snags',
  'projects', 'project_targets', 'project_actuals',
  'pace_ppm', 'pace_todos', 'pace_snapshots', 'pace_wins',
  // after projects, because every node and every item names one
  // machines, then the tests that name them, then what hangs off a test
  'tree_nodes', 'commission_assets', 'tests', 'test_items',
  // after projects, because a target and a reading both name a measure that
  // lives on the project row
  'targets', 'readings',
  // after the lines, because a material can name the line it is for
  'materials',
  // after the machines and the tests, because a program names both
  'programs',
];
