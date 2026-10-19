// BUILT FROM src/lib/flow/serverCheck.ts by scripts/build-gatecheck.mjs — edit the source, then run it.

// src/lib/study.ts
function listById(v) {
  return Array.isArray(v) ? v.filter((x) => !!x && typeof x === "object" && typeof x.id === "string") : [];
}
function factsOf(v) {
  const o = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  return {
    ...o,
    ...o.readings !== void 0 ? { readings: listById(o.readings) } : {},
    ...o.steps !== void 0 ? { steps: listById(o.steps).map((st) => ({ ...st, laps: listById(st.laps) })) } : {},
    ...o.crew !== void 0 ? { crew: listById(o.crew) } : {},
    ...o.flow !== void 0 ? { flow: listById(o.flow) } : {},
    ...o.future !== void 0 ? { future: listById(o.future) } : {},
    ...o.sequence !== void 0 ? { sequence: listById(o.sequence) } : {},
    ...o.products !== void 0 ? { products: listById(o.products) } : {},
    ...o.taps !== void 0 ? { taps: listById(o.taps) } : {},
    ...o.timings !== void 0 ? { timings: listById(o.timings) } : {},
    ...o.vevents !== void 0 ? { vevents: listById(o.vevents) } : {}
  };
}

// src/lib/video/footage.ts
function unnamed(m) {
  const out = { ...m, blobKey: "" };
  delete out.thumbKey;
  return out;
}
function footageGone(facts) {
  const g = facts.videoGone;
  if (g) return { at: g.at, ...g.by ? { by: g.by } : {} };
  const v = facts.video;
  return v?.footageDeletedAt ? { at: v.footageDeletedAt, ...v.footageDeletedBy ? { by: v.footageDeletedBy } : {} } : void 0;
}
function footageKeys(facts) {
  const v = facts.video;
  if (!v || footageGone(facts)) return [];
  return [
    ...v.media.blobKey ? [{ key: v.media.blobKey, mime: v.media.mime }] : [],
    ...v.media.thumbKey ? [{ key: v.media.thumbKey, mime: "image/jpeg" }] : []
  ];
}
function forTheCloud(facts) {
  const g = facts.videoGone, v = facts.video;
  if (!g || !v || !v.media.blobKey && !v.media.thumbKey && v.footageDeletedAt) return facts;
  return { ...facts, video: { ...v, media: unnamed(v.media), footageDeletedAt: v.footageDeletedAt ?? g.at, ...g.by && !v.footageDeletedBy ? { footageDeletedBy: g.by } : {} } };
}

// src/cloud/mappers.ts
var k = (key, mime, owner) => key ? [{ key, mime, owner }] : [];
var n = (v) => v == null ? void 0 : Number(v);
var ENTRIES = "_entries";
function flowValues(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const { [ENTRIES]: list, ...rest } = raw;
  const entries = Array.isArray(list) ? list.filter((e) => !!e && typeof e === "object" && typeof e.id === "string") : void 0;
  return { ...Object.keys(rest).length ? { values: rest } : {}, ...entries ? { entries } : {} };
}
var MAPS = {
  workspaces: {
    clock: (l) => l.updatedAt ?? l.createdAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const w = l;
      return {
        id: w.id,
        owner_id: w.ownerId ?? fallbackOwner,
        name: w.name,
        color: w.color ?? null,
        categories: w.categories,
        subcategories: w.subcategories,
        assets: w.assets,
        shifts: w.shifts,
        crew: w.crew ?? null,
        labour_rate_per_hour: w.labourRatePerHour ?? null,
        labour_burden: w.labourBurden ?? null,
        packs_per_min: w.packsPerMin ?? null,
        margin_per_pack: w.marginPerPack ?? null,
        last_category: w.lastCategory ?? null,
        last_asset: w.lastAsset ?? null,
        line_type: w.lineType ?? null,
        floor_order: w.floorOrder ?? null,
        archived: !!w.archived,
        created_at: w.createdAt,
        updated_at: w.updatedAt ?? w.createdAt,
        deleted_at: null
      };
    },
    // NB: device-only fields (activeTimer, lastRoute, schemaVersion) are NOT in
    // the row and are preserved by the sync merge, not reconstructed here.
    fromRow: (r) => ({
      id: r.id,
      ownerId: r.owner_id ?? void 0,
      name: r.name,
      color: r.color ?? void 0,
      categories: r.categories ?? [],
      subcategories: r.subcategories ?? {},
      assets: r.assets ?? [],
      shifts: r.shifts ?? [],
      crew: n(r.crew),
      labourRatePerHour: n(r.labour_rate_per_hour),
      labourBurden: n(r.labour_burden),
      packsPerMin: n(r.packs_per_min),
      marginPerPack: n(r.margin_per_pack),
      lastCategory: r.last_category ?? void 0,
      lastAsset: r.last_asset ?? void 0,
      lineType: r.line_type ?? void 0,
      floorOrder: n(r.floor_order),
      archived: !!r.archived,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at)
    })
  },
  observations: {
    clock: (l) => l.updatedAt ?? l.createdAt,
    mediaKeys: (l) => {
      const o = l;
      return o.media.flatMap((m) => [...k(m.blobKey, m.mime, o.ownerId), ...k(m.thumbKey, "image/jpeg", o.ownerId)]);
    },
    toRow: (l, fallbackOwner) => {
      const o = l;
      return {
        id: o.id,
        owner_id: o.ownerId ?? fallbackOwner,
        workspace_id: o.workspaceId,
        category: o.category,
        subcategory: o.subcategory ?? null,
        asset: o.asset,
        shift: o.shift ?? null,
        started_at: o.startedAt,
        ended_at: o.endedAt ?? null,
        duration_ms: o.durationMs,
        timing: o.timing,
        count: o.count,
        value_num: o.valueNum ?? null,
        cost_per: o.costPer ?? null,
        note: o.note ?? null,
        media: o.media,
        cause_m: o.causeM ?? null,
        created_at: o.createdAt,
        updated_at: o.updatedAt,
        deleted_at: o.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      ownerId: r.owner_id ?? void 0,
      workspaceId: r.workspace_id,
      category: r.category,
      subcategory: r.subcategory ?? void 0,
      asset: r.asset,
      shift: r.shift ?? void 0,
      startedAt: Number(r.started_at),
      endedAt: n(r.ended_at),
      durationMs: Number(r.duration_ms),
      timing: r.timing,
      count: Number(r.count) || 1,
      valueNum: n(r.value_num),
      costPer: n(r.cost_per),
      note: r.note ?? void 0,
      media: r.media ?? [],
      causeM: r.cause_m ?? void 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  segments: {
    clock: (l) => l.updatedAt ?? l.createdAt,
    mediaKeys: (l) => {
      const s = l;
      return [...k(s.videoKey, "video/mp4", s.ownerId), ...k(s.posterKey, "image/jpeg", s.ownerId)];
    },
    toRow: (l, fallbackOwner) => {
      const s = l;
      return {
        id: s.id,
        owner_id: s.ownerId ?? fallbackOwner,
        workspace_id: s.workspaceId,
        sequence: s.sequence,
        name: s.name ?? null,
        video_key: s.videoKey,
        poster_key: s.posterKey ?? null,
        duration_s: s.durationS ?? null,
        created_at: s.createdAt,
        updated_at: s.updatedAt ?? s.createdAt,
        deleted_at: null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      ownerId: r.owner_id ?? void 0,
      workspaceId: r.workspace_id,
      sequence: Number(r.sequence) || 0,
      name: r.name ?? void 0,
      videoKey: r.video_key,
      posterKey: r.poster_key ?? void 0,
      durationS: n(r.duration_s),
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at)
    })
  },
  snag_assets: {
    clock: (l) => l.updatedAt ?? l.createdAt,
    mediaKeys: (l) => {
      const a = l;
      return k(a.stillKey, "image/jpeg", a.ownerId);
    },
    toRow: (l, fallbackOwner) => {
      const a = l;
      return {
        id: a.id,
        owner_id: a.ownerId ?? fallbackOwner,
        workspace_id: a.workspaceId,
        segment_id: a.segmentId ?? null,
        timestamp_s: a.timestampS,
        name: a.name,
        code: a.code ?? null,
        still_key: a.stillKey,
        created_at: a.createdAt,
        updated_at: a.updatedAt ?? a.createdAt,
        deleted_at: null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      ownerId: r.owner_id ?? void 0,
      workspaceId: r.workspace_id,
      // null once the clip is deleted — the frame stays, the link to the video goes
      segmentId: r.segment_id ?? void 0,
      timestampS: Number(r.timestamp_s) || 0,
      name: r.name,
      code: r.code ?? void 0,
      stillKey: r.still_key,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at)
    })
  },
  snags: {
    clock: (l) => l.updatedAt ?? l.raisedAt,
    mediaKeys: (l) => {
      const s = l;
      return [
        ...k(s.detailPhotoKey, "image/jpeg", s.ownerId),
        ...k(s.fixedPhotoKey, "image/jpeg", s.ownerId),
        ...(s.media ?? []).flatMap((m) => [...k(m.blobKey, m.mime, s.ownerId), ...k(m.thumbKey, "image/jpeg", s.ownerId)])
      ];
    },
    toRow: (l, fallbackOwner) => {
      const s = l;
      return {
        id: s.id,
        owner_id: s.ownerId ?? fallbackOwner,
        workspace_id: s.workspaceId,
        asset_id: s.assetId ?? null,
        x_pct: s.xPct ?? null,
        y_pct: s.yPct ?? null,
        target_category: s.targetCategory ?? null,
        target_subcategory: s.targetSubcategory ?? null,
        target_asset: s.targetAsset ?? null,
        case_id: s.caseId ?? null,
        problem: s.problem,
        priority: s.priority ?? null,
        journey: s.journey?.length ? s.journey : null,
        archived_at: s.archivedAt ?? null,
        proposed_solution: s.proposedSolution ?? null,
        status: s.status,
        owner: s.owner ?? null,
        raised_at: s.raisedAt,
        due_at: s.dueAt ?? null,
        latest_update: s.latestUpdate ?? null,
        latest_update_at: s.latestUpdateAt ?? null,
        closed_at: s.closedAt ?? null,
        close_note: s.closeNote ?? null,
        detail_photo_key: s.detailPhotoKey ?? null,
        fixed_photo_key: s.fixedPhotoKey ?? null,
        linked_obs_ids: s.linkedObsIds ?? [],
        media: s.media ?? null,
        project_id: s.projectId ?? null,
        sent: s.sent ?? null,
        updated_at: s.updatedAt ?? s.raisedAt,
        deleted_at: s.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      ownerId: r.owner_id ?? void 0,
      workspaceId: r.workspace_id,
      assetId: r.asset_id ?? void 0,
      xPct: r.x_pct == null ? void 0 : Number(r.x_pct),
      yPct: r.y_pct == null ? void 0 : Number(r.y_pct),
      targetCategory: r.target_category ?? void 0,
      targetSubcategory: r.target_subcategory ?? void 0,
      targetAsset: r.target_asset ?? void 0,
      caseId: r.case_id ?? void 0,
      problem: r.problem,
      ...r.priority === "critical" || r.priority === "high" || r.priority === "low" ? { priority: r.priority } : {},
      ...Array.isArray(r.journey) && r.journey.length ? { journey: r.journey } : {},
      ...r.archived_at != null ? { archivedAt: Number(r.archived_at) } : {},
      proposedSolution: r.proposed_solution ?? void 0,
      status: r.status,
      owner: r.owner ?? void 0,
      raisedAt: Number(r.raised_at),
      dueAt: n(r.due_at),
      latestUpdate: r.latest_update ?? void 0,
      latestUpdateAt: n(r.latest_update_at),
      closedAt: n(r.closed_at),
      closeNote: r.close_note ?? void 0,
      detailPhotoKey: r.detail_photo_key ?? void 0,
      fixedPhotoKey: r.fixed_photo_key ?? void 0,
      linkedObsIds: r.linked_obs_ids ?? void 0,
      ...Array.isArray(r.media) ? { media: r.media } : {},
      ...r.project_id ? { projectId: r.project_id } : {},
      ...Array.isArray(r.sent) ? { sent: r.sent } : {},
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  cases: {
    clock: (l) => l.updatedAt ?? l.openedAt,
    /* A cause on the fishbone can carry a photo ("I saw…", docs/SIXM.md) —
       those files go up with the problem, like a test's do. With none, the
       photo stayed on the phone and the laptop never saw it. */
    mediaKeys: (l) => {
      const c = l;
      return (c.causes ?? []).flatMap((x) => (x.media ?? []).flatMap((m) => [...k(m.blobKey, m.mime, c.ownerId), ...k(m.thumbKey, "image/jpeg", c.ownerId)]));
    },
    toRow: (l, fallbackOwner) => {
      const c = l;
      return {
        id: c.id,
        owner_id: c.ownerId ?? fallbackOwner,
        workspace_id: c.workspaceId,
        title: c.title,
        path: c.path,
        note: c.note ?? null,
        whys: c.whys ?? null,
        study: c.study ?? null,
        baseline_ms_week: c.baselineMsWeek,
        target_ms_week: c.targetMsWeek ?? null,
        status: c.status,
        opened_at: c.openedAt,
        closed_at: c.closedAt ?? null,
        updated_at: c.updatedAt ?? c.openedAt,
        deleted_at: c.deletedAt ?? null,
        project_id: c.projectId ?? null,
        line_id: c.lineId ?? null,
        source: c.source ?? null,
        causes: c.causes ?? [],
        hold: c.hold ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      ownerId: r.owner_id ?? void 0,
      workspaceId: r.workspace_id,
      title: r.title,
      path: r.path ?? [],
      note: r.note ?? void 0,
      whys: r.whys ?? void 0,
      study: r.study ?? void 0,
      baselineMsWeek: Number(r.baseline_ms_week) || 0,
      targetMsWeek: n(r.target_ms_week),
      status: r.status ?? "open",
      openedAt: Number(r.opened_at),
      closedAt: n(r.closed_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at),
      projectId: r.project_id ?? void 0,
      lineId: r.line_id ?? void 0,
      source: r.source ?? void 0,
      causes: r.causes ?? void 0,
      hold: r.hold ?? void 0
    })
  },
  // Projects — the initiative itself: its name, who leads it, and nothing more.
  // Its lines live in pace_ppm and its people in project_members.
  projects: {
    clock: (l) => l.updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const p = l;
      return {
        id: p.id,
        owner_id: p.ownerId ?? fallbackOwner,
        name: p.name,
        description: p.description ?? null,
        color: p.color,
        workspace_ids: p.workspaceIds,
        walk_workspace_id: p.walkWorkspaceId ?? null,
        lead: p.lead ?? null,
        lead_email: p.leadEmail ?? null,
        lever_tree: p.leverTree ?? false,
        day_hours: p.dayHours ?? null,
        pareto: p.pareto ?? false,
        commissioning: p.commissioning ?? false,
        planned_at: p.plannedAt ?? null,
        expected_at: p.expectedAt ?? null,
        measures: p.measures ?? null,
        periods: p.periods ?? null,
        install_stages: p.installStages ?? null,
        gate_stages: p.gateStages ?? null,
        flow: p.flow ?? null,
        archived_at: p.archivedAt ?? null,
        report_note: p.reportNote ?? null,
        report_note_at: p.reportNoteAt ?? null,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
        deleted_at: p.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      ownerId: r.owner_id ?? void 0,
      name: r.name,
      description: r.description ?? void 0,
      color: r.color,
      workspaceIds: r.workspace_ids ?? [],
      walkWorkspaceId: r.walk_workspace_id ?? void 0,
      lead: r.lead ?? void 0,
      leadEmail: r.lead_email ?? void 0,
      leverTree: r.lever_tree === true || void 0,
      dayHours: Number(r.day_hours) > 0 ? Number(r.day_hours) : void 0,
      pareto: r.pareto === true || void 0,
      commissioning: r.commissioning === true || void 0,
      plannedAt: r.planned_at ?? void 0,
      expectedAt: r.expected_at ?? void 0,
      measures: r.measures ?? void 0,
      periods: r.periods ?? void 0,
      installStages: r.install_stages ?? void 0,
      gateStages: r.gate_stages ?? void 0,
      flow: flowOf(r.flow),
      archivedAt: n(r.archived_at),
      reportNote: r.report_note ?? void 0,
      reportNoteAt: n(r.report_note_at),
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  /* ---- Project Pace ----
   * Per-USER rows, not workspace children: this is one person's management
   * surface, so the cloud scopes them by owner_id rather than by membership.
   * JSON columns hold the arrays whole (a snapshot's actions, a line's weekly
   * readings) — they are read and written as one document, never queried into,
   * so splitting them into rows would buy nothing and cost a join. */
  pace_ppm: {
    clock: (l) => l.updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const p = l;
      return {
        id: p.id,
        owner_id: fallbackOwner,
        project_id: p.projectId ?? null,
        line_key: p.key,
        name: p.name,
        variant: p.variant ?? null,
        line_owner: p.owner ?? null,
        line_owner_email: p.ownerEmail ?? null,
        sponsor: p.sponsor ?? null,
        sponsor_email: p.sponsorEmail ?? null,
        workspace_id: p.workspaceId ?? null,
        sort: p.sort ?? 0,
        capacity: p.capacity ?? null,
        /* q1..q4 and weekly are still columns on this table and are no longer
           written: the numbers moved to `targets` and `readings`. They default
           to 0 and [] in the cloud, so an insert without them is accepted —
           which is why removing them needed no migration. */
        updated_at: p.updatedAt,
        deleted_at: p.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      key: r.line_key,
      name: r.name,
      variant: r.variant ?? void 0,
      projectId: r.project_id ?? void 0,
      owner: r.line_owner ?? void 0,
      ownerEmail: r.line_owner_email ?? void 0,
      sponsor: r.sponsor ?? void 0,
      sponsorEmail: r.sponsor_email ?? void 0,
      workspaceId: r.workspace_id ?? void 0,
      sort: Number(r.sort) || 0,
      capacity: r.capacity ?? void 0,
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  pace_todos: {
    clock: (l) => l.updatedAt,
    // the attached pictures travel with the row, same as an observation's
    mediaKeys: (l) => (l.media ?? []).flatMap((m) => [...k(m.blobKey, m.mime), ...k(m.thumbKey, "image/jpeg")]),
    toRow: (l, fallbackOwner) => {
      const t = l;
      return {
        id: t.id,
        owner_id: fallbackOwner,
        project_id: t.projectId ?? null,
        line_id: t.lineId ?? null,
        what: t.what,
        where_at: t.where,
        why: t.why,
        who: t.who,
        when_at: t.when,
        state: t.state,
        media: t.media ?? [],
        notes: t.notes ?? "",
        outcome: t.outcome ?? "",
        pillar: t.pillar ?? null,
        due: t.due ?? null,
        case_id: t.caseId ?? null,
        done_on: t.doneOn ?? null,
        cause_ref: t.causeRef ?? null,
        expect: t.expect ?? null,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        deleted_at: null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id ?? void 0,
      lineId: r.line_id ?? void 0,
      what: r.what ?? "",
      where: r.where_at ?? "",
      why: r.why ?? "",
      who: r.who ?? "",
      when: r.when_at ?? "",
      state: r.state ?? "todo",
      media: r.media ?? [],
      notes: r.notes ?? "",
      outcome: r.outcome ?? "",
      pillar: r.pillar ?? void 0,
      due: r.due ?? void 0,
      caseId: r.case_id ?? void 0,
      doneOn: r.done_on ?? void 0,
      causeRef: r.cause_ref ?? void 0,
      expect: r.expect ?? void 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at)
    })
  },
  pace_wins: {
    clock: (l) => l.updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const w = l;
      return {
        id: w.id,
        owner_id: fallbackOwner,
        project_id: w.projectId ?? null,
        line_id: w.lineId ?? null,
        title: w.title,
        story: w.story,
        where_at: w.where,
        who: w.who,
        impact: w.impact,
        proof: w.proof ?? null,
        created_at: w.createdAt,
        updated_at: w.updatedAt,
        deleted_at: null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id ?? void 0,
      lineId: r.line_id ?? void 0,
      title: r.title ?? "",
      story: r.story ?? "",
      where: r.where_at ?? "",
      who: r.who ?? "",
      impact: r.impact ?? "",
      proof: r.proof ?? void 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at)
    })
  },
  tree_nodes: {
    clock: (l) => l.updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const n2 = l;
      return {
        id: n2.id,
        owner_id: fallbackOwner,
        project_id: n2.projectId,
        // null, not undefined: the root has no parent, and an absent key would
        // leave whatever the row said before standing on the server
        parent_id: n2.parentId ?? null,
        text: n2.text,
        rag: n2.rag,
        sort: n2.sort,
        bind: n2.bind ?? null,
        created_at: n2.createdAt,
        updated_at: n2.updatedAt,
        deleted_at: null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id,
      parentId: r.parent_id ?? void 0,
      text: r.text ?? "",
      rag: r.rag ?? "n",
      sort: Number(r.sort) || 0,
      bind: r.bind ?? void 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at)
    })
  },
  /* THE MACHINES. One row per machine on the line, carrying its state, who
     supplied it and the paperwork they sent. `docs` is jsonb metadata; the BYTES
     ride the media pipeline exactly like a snag photo, which is what makes an
     OEM report openable on a factory floor with no signal. */
  commission_assets: {
    clock: (l) => l.updatedAt,
    mediaKeys: (l) => (l.docs ?? []).flatMap((d) => k(d.blobKey, d.mime)),
    toRow: (l, fallbackOwner) => {
      const a = l;
      return {
        id: a.id,
        owner_id: fallbackOwner,
        project_id: a.projectId || null,
        workspace_id: a.workspaceId ?? null,
        name: a.name,
        oem: a.oem ?? null,
        state: a.state,
        due_on: a.dueOn ?? null,
        on_site_on: a.onSiteOn ?? null,
        installed_on: a.installedOn ?? null,
        running_on: a.runningOn ?? null,
        docs: a.docs ?? null,
        note: a.note ?? null,
        sort: a.sort,
        updated_at: a.updatedAt,
        deleted_at: a.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id ?? "",
      ...r.workspace_id ? { workspaceId: r.workspace_id } : {},
      name: r.name ?? "",
      oem: r.oem ?? void 0,
      state: r.state ?? "onSite",
      dueOn: r.due_on ?? void 0,
      onSiteOn: r.on_site_on ?? void 0,
      installedOn: r.installed_on ?? void 0,
      runningOn: r.running_on ?? void 0,
      docs: r.docs ?? void 0,
      note: r.note ?? void 0,
      sort: Number(r.sort) || 0,
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  /* A TEST. The plan and the day are separate columns on purpose — planned_for
     against ran_on, planned against product — because the day is fluid and the
     difference between what you meant to do and what you did is usually the
     story. One column that followed the result around would always report that
     everything went to plan. */
  tests: {
    clock: (l) => l.updatedAt,
    mediaKeys: (l) => (l.media ?? []).flatMap((m) => [...k(m.blobKey, m.mime), ...k(m.thumbKey, "image/jpeg")]).concat((l.docs ?? []).flatMap((d) => k(d.blobKey, d.mime))),
    toRow: (l, fallbackOwner) => {
      const t = l;
      return {
        id: t.id,
        owner_id: fallbackOwner,
        project_id: t.projectId,
        kind: t.kind ?? "test",
        title: t.title,
        asset_id: t.assetId ?? null,
        program_id: t.programId ?? null,
        planned_for: t.plannedFor ?? null,
        planned_to: t.plannedTo ?? null,
        passes_if: t.passesIf ?? null,
        overlap_ok: t.overlapOk ?? null,
        with_whom: t.withWhom ?? null,
        planned: t.planned ?? null,
        ran_on: t.ranOn ?? null,
        ran_to: t.ranTo ?? null,
        product: t.product ?? null,
        result: t.result ?? null,
        run_agreed: t.runAgreed ?? null,
        run: t.run ?? null,
        /* The product runs (lib/run): an array, merged by id on sync, so a
           product planned on the laptop and numbers put in on the phone both
           land. An emptied list is sent as [] — null would bring an older
           test's one run back as its first product. */
        runs: t.runs ?? null,
        outcome: t.outcome,
        media: t.media ?? null,
        docs: t.docs ?? null,
        from_test_id: t.fromTestId ?? null,
        gate: t.gate ?? null,
        pin: t.pin ?? null,
        sort: t.sort,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        deleted_at: t.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id,
      /* A row written before fixes existed has no kind and is a test. */
      kind: r.kind ?? "test",
      title: r.title ?? "",
      assetId: r.asset_id ?? void 0,
      programId: r.program_id ?? void 0,
      plannedFor: r.planned_for ?? void 0,
      plannedTo: r.planned_to ?? void 0,
      passesIf: r.passes_if ?? void 0,
      overlapOk: r.overlap_ok === true ? true : r.overlap_ok === false ? false : void 0,
      withWhom: r.with_whom ?? void 0,
      planned: r.planned ?? void 0,
      ranOn: r.ran_on ?? void 0,
      ranTo: r.ran_to ?? void 0,
      product: r.product ?? void 0,
      result: r.result ?? void 0,
      runAgreed: r.run_agreed ?? void 0,
      run: r.run ?? void 0,
      runs: productRunsOf(r.runs),
      outcome: r.outcome ?? "planned",
      media: r.media ?? void 0,
      docs: r.docs ?? void 0,
      fromTestId: r.from_test_id ?? void 0,
      gate: r.gate === "setup" || r.gate === "handover" ? r.gate : void 0,
      pin: pinOf(r.pin),
      sort: Number(r.sort) || 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  /* WHAT WE FOUND, and WHAT WE DO NEXT. One table for both: they are the same
     shape — a line of words, somebody's name, a date and whatever was filmed —
     and `kind` is the only thing that differs. */
  test_items: {
    clock: (l) => l.updatedAt,
    mediaKeys: (l) => (l.media ?? []).flatMap((m) => [...k(m.blobKey, m.mime), ...k(m.thumbKey, "image/jpeg")]),
    toRow: (l, fallbackOwner) => {
      const i = l;
      return {
        id: i.id,
        owner_id: fallbackOwner,
        project_id: i.projectId,
        test_id: i.testId,
        kind: i.kind,
        what: i.what,
        note: i.note ?? null,
        owner: i.owner ?? null,
        due: i.due ?? null,
        on_plan: i.onPlan ?? null,
        moved_from: i.movedFrom ?? null,
        moved_to: i.movedTo ?? null,
        done_at: i.doneAt ?? null,
        media: i.media ?? null,
        pin: i.pin ?? null,
        became_test_id: i.becameTestId ?? null,
        became_item_id: i.becameItemId ?? null,
        from_item_id: i.fromItemId ?? null,
        hours_lost: i.hoursLost ?? null,
        critical: i.critical ?? null,
        impact: i.impact ?? null,
        ways: i.ways?.length ? i.ways : null,
        results: i.results?.length ? i.results : null,
        risk: i.risk ?? null,
        could_lose: i.couldLose ?? null,
        sort: i.sort,
        created_at: i.createdAt,
        updated_at: i.updatedAt,
        deleted_at: i.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id,
      testId: r.test_id ?? "",
      kind: r.kind ?? "found",
      what: r.what ?? "",
      note: r.note ?? void 0,
      owner: r.owner ?? void 0,
      due: r.due ?? void 0,
      ...r.on_plan ? { onPlan: true } : {},
      ...r.moved_from ? { movedFrom: r.moved_from } : {},
      ...r.moved_to ? { movedTo: r.moved_to } : {},
      doneAt: n(r.done_at),
      media: r.media ?? void 0,
      pin: pinOf(r.pin),
      becameTestId: r.became_test_id ?? void 0,
      becameItemId: r.became_item_id ?? void 0,
      fromItemId: r.from_item_id ?? void 0,
      hoursLost: Number(r.hours_lost) > 0 ? Number(r.hours_lost) : void 0,
      ...r.critical ? { critical: true } : {},
      ...r.impact ? { impact: r.impact } : {},
      ...Array.isArray(r.ways) && r.ways.length ? { ways: r.ways } : {},
      ...Array.isArray(r.results) && r.results.length ? { results: r.results } : {},
      ...r.risk ? { risk: true } : {},
      ...Number(r.could_lose) > 0 ? { couldLose: Number(r.could_lose) } : {},
      sort: Number(r.sort) || 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  /* WHAT A LINE IS AIMING AT. One row per line x measure x period. The measures
     and the periods themselves ride on the project row, because they are small
     lists owned entirely by it and are always read with it. */
  targets: {
    clock: (l) => l.updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const t = l;
      return {
        id: t.id,
        owner_id: fallbackOwner,
        project_id: t.projectId,
        line_id: t.lineId,
        measure_id: t.measureId,
        period_id: t.periodId,
        value: t.value,
        updated_at: t.updatedAt,
        deleted_at: t.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id,
      lineId: r.line_id ?? "",
      measureId: r.measure_id ?? "",
      periodId: r.period_id ?? "",
      value: Number(r.value) || 0,
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  /* WHAT IT ACTUALLY DID. One row per line x measure x date. `at` is an ISO
     date rather than a timestamp: a reading is taken on a DAY, and a midnight
     in some zone shows in Manchester as the day before. */
  readings: {
    clock: (l) => l.updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const r = l;
      return {
        id: r.id,
        owner_id: fallbackOwner,
        project_id: r.projectId,
        line_id: r.lineId,
        measure_id: r.measureId,
        at: r.at,
        value: r.value,
        note: r.note ?? null,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        deleted_at: r.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id,
      lineId: r.line_id ?? "",
      measureId: r.measure_id ?? "",
      at: r.at ?? "",
      value: Number(r.value) || 0,
      note: r.note ?? void 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  programs: {
    clock: (l) => l.updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const p = l;
      return {
        id: p.id,
        owner_id: fallbackOwner,
        project_id: p.projectId || null,
        workspace_id: p.workspaceId ?? null,
        what: p.what,
        runs: p.runs ?? null,
        asset_id: p.assetId ?? null,
        line_id: p.lineId ?? null,
        state: p.state,
        test_on: p.testOn ?? null,
        proved_on: p.provedOn ?? null,
        test_id: p.testId ?? null,
        supplier: p.from ?? null,
        note: p.note ?? null,
        sort: p.sort,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
        deleted_at: p.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id ?? "",
      ...r.workspace_id ? { workspaceId: r.workspace_id } : {},
      what: r.what ?? "",
      runs: r.runs ?? void 0,
      assetId: r.asset_id ?? void 0,
      lineId: r.line_id ?? void 0,
      // A cloud row written by a build that knows a state this one does not
      // reads as needed rather than as undefined, which would crash a screen.
      state: ["needed", "onMachine", "proved"].includes(r.state) ? r.state : "needed",
      testOn: r.test_on ?? void 0,
      provedOn: r.proved_on ?? void 0,
      testId: r.test_id ?? void 0,
      from: r.supplier ?? void 0,
      note: r.note ?? void 0,
      sort: Number(r.sort) || 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  /* THE LINE STANDARD — one map per product. The marks ride as one jsonb
     list on the row: they are only ever read and written with their map, and
     a table of them would be a join for nothing. */
  standards: {
    clock: (l) => l.updatedAt,
    mediaKeys: (l) => k(l.photoKey, "image/jpeg"),
    toRow: (l, fallbackOwner) => {
      const s = l;
      return {
        id: s.id,
        owner_id: fallbackOwner,
        project_id: s.projectId || null,
        workspace_id: s.workspaceId ?? null,
        capacity: s.capacity ?? null,
        product: s.product,
        program_id: s.programId ?? null,
        photo_key: s.photoKey ?? null,
        board: s.board ?? null,
        marks: s.marks ?? [],
        note: s.note ?? null,
        sort: s.sort,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
        deleted_at: s.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id ?? "",
      ...r.workspace_id ? { workspaceId: r.workspace_id } : {},
      ...r.capacity ? { capacity: r.capacity } : {},
      product: r.product ?? "",
      programId: r.program_id ?? void 0,
      photoKey: r.photo_key ?? void 0,
      ...r.board ? { board: r.board } : {},
      marks: Array.isArray(r.marks) ? r.marks : [],
      note: r.note ?? void 0,
      sort: Number(r.sort) || 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  /* A STUDY — one use of a tool (lib/study.ts, supabase/STUDIES.sql). Its
     maker is kept, as a line's rows keep theirs: "not filed" means its
     maker's alone, so the push must not hand it to whoever saved it last.
     The facts and the uses are id-keyed lists (an entry with no id is
     dropped). A tool or a fact list this build does not know is kept as it
     came, so an older phone saving the row back never rewrites a newer one's. */
  studies: {
    clock: (l) => l.updatedAt,
    /* A video study's footage and its poster, while it has them
       (supabase/VIDEO_MEDIA.sql: the cloud takes a file a study names). */
    mediaKeys: (l) => {
      const s = l;
      return footageKeys(s.facts ?? {}).flatMap((f) => k(f.key, f.mime, s.ownerId));
    },
    nested: ["facts"],
    toRow: (l, fallbackOwner) => {
      const s = l;
      return {
        id: s.id,
        owner_id: s.ownerId ?? fallbackOwner,
        tool: s.tool,
        name: s.name ?? "",
        workspace_id: s.workspaceId ?? null,
        project_id: s.projectId || null,
        machine: s.machine ?? null,
        asset_id: s.assetId ?? null,
        product: s.product ?? null,
        program_id: s.programId ?? null,
        standard_id: s.standardId ?? null,
        agreed: s.agreed ?? null,
        facts: forTheCloud(s.facts ?? {}),
        uses: s.uses ?? [],
        started_at: s.startedAt,
        closed_at: s.closedAt ?? null,
        receipt: s.receipt ?? null,
        overrule: s.overrule ?? null,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
        deleted_at: s.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      ownerId: r.owner_id ?? void 0,
      tool: r.tool,
      name: r.name ?? "",
      workspaceId: r.workspace_id ?? void 0,
      projectId: r.project_id ?? void 0,
      machine: r.machine ?? void 0,
      assetId: r.asset_id ?? void 0,
      product: r.product ?? void 0,
      programId: r.program_id ?? void 0,
      standardId: r.standard_id ?? void 0,
      agreed: r.agreed && typeof r.agreed === "object" ? r.agreed : void 0,
      facts: factsOf(r.facts),
      uses: listById(r.uses),
      startedAt: Number(r.started_at),
      closedAt: n(r.closed_at),
      receipt: r.receipt && typeof r.receipt === "object" ? r.receipt : void 0,
      overrule: r.overrule && typeof r.overrule === "object" ? r.overrule : void 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  /* A METHOD'S VERSION (lib/flow/records Method; supabase/METHODS.sql). The
     definition goes whole: it is checked by lib/flow/validate whenever it is
     read for use, and an active version never changes. */
  methods: {
    clock: (l) => l.updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const m = l;
      return {
        id: m.id,
        owner_id: fallbackOwner,
        family_id: m.familyId,
        version: m.version,
        status: m.status,
        definition: m.definition,
        parent_id: m.parentId ?? null,
        origin: m.origin ?? null,
        change_note: m.changeNote ?? null,
        approved_by: m.approvedBy ?? null,
        approved_at: m.approvedAt ?? null,
        created_at: m.createdAt,
        updated_at: m.updatedAt,
        deleted_at: m.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      familyId: r.family_id ?? r.id,
      version: Number(r.version) || 1,
      status: r.status === "active" || r.status === "retired" ? r.status : "draft",
      definition: r.definition,
      parentId: r.parent_id ?? void 0,
      origin: r.origin ?? void 0,
      changeNote: r.change_note ?? void 0,
      approvedBy: r.approved_by ?? void 0,
      approvedAt: n(r.approved_at),
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  /* A STEP DONE, OR A GATE PASSED, on a project running a method. A log's
     entries ride in its `values` column under one key — no column of their
     own, so no migration: the column is jsonb already. */
  flow_records: {
    clock: (l) => l.updatedAt,
    /* the boxes key by key, a log's entries entry by entry: two devices
       filling different boxes, or logging at once, both keep theirs */
    nested: ["values"],
    mediaKeys: (l) => (l.media ?? []).flatMap((m) => [...k(m.blobKey, m.mime), ...k(m.thumbKey, "image/jpeg")]).concat((l.docs ?? []).flatMap((d) => k(d.blobKey, d.mime))),
    toRow: (l, fallbackOwner) => {
      const f = l;
      return {
        id: f.id,
        owner_id: fallbackOwner,
        project_id: f.projectId,
        kind: f.kind,
        stage: f.stageKey,
        step: f.stepKey ?? null,
        asset_id: f.assetId ?? null,
        version: f.version,
        outcome: f.outcome,
        planned_for: f.plannedFor ?? null,
        done_on: f.doneOn ?? null,
        who: f.who ?? null,
        values: f.values || f.entries ? { ...f.values ?? {}, ...f.entries ? { [ENTRIES]: f.entries } : {} } : null,
        note: f.note ?? null,
        signed_by: f.signedBy ?? null,
        open_at_sign: f.openAtSign ?? null,
        media: f.media ?? null,
        docs: f.docs ?? null,
        study_id: f.studyId ?? null,
        override: f.override ?? null,
        open_at_pass: f.openAtPass ?? null,
        checks: f.checks ?? null,
        sort: f.sort,
        created_at: f.createdAt,
        updated_at: f.updatedAt,
        deleted_at: f.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id,
      kind: r.kind === "gate" ? "gate" : "step",
      stageKey: r.stage ?? "",
      stepKey: r.step ?? void 0,
      assetId: r.asset_id ?? void 0,
      version: Number(r.version) || 1,
      outcome: ["planned", "done", "failed", "notRun"].includes(r.outcome) ? r.outcome : "planned",
      plannedFor: r.planned_for ?? void 0,
      doneOn: r.done_on ?? void 0,
      who: r.who ?? void 0,
      ...flowValues(r.values),
      note: r.note ?? void 0,
      signedBy: r.signed_by ?? void 0,
      openAtSign: Array.isArray(r.open_at_sign) ? r.open_at_sign : void 0,
      media: r.media ?? void 0,
      docs: r.docs ?? void 0,
      studyId: r.study_id ?? void 0,
      override: r.override ?? void 0,
      openAtPass: Array.isArray(r.open_at_pass) ? r.open_at_pass : void 0,
      checks: r.checks ?? void 0,
      sort: Number(r.sort) || 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  /* WHO DID WHAT — written once (supabase/METHODS.sql keeps it as written). */
  activity_log: {
    clock: (l) => l.updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const a = l;
      return {
        id: a.id,
        owner_id: fallbackOwner,
        project_id: a.projectId ?? null,
        method_id: a.methodId ?? null,
        who: a.who,
        at: a.at,
        op: a.op,
        summary: a.summary,
        source: a.source,
        target: a.target ?? null,
        detail: a.detail ?? null,
        created_at: a.createdAt,
        updated_at: a.updatedAt
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id ?? void 0,
      methodId: r.method_id ?? void 0,
      who: r.who ?? "",
      at: Number(r.at),
      op: r.op ?? "",
      summary: r.summary ?? "",
      source: r.source === "assistant" ? "assistant" : "person",
      target: r.target ?? void 0,
      detail: r.detail ?? void 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at)
    })
  },
  /* THE SERVER'S READING OF A GATE PASS (lib/flow/gateCheck) — the server
     writes it (supabase/functions/gatecheck); a device only ever pulls it
     (READ_ONLY_KINDS). toRow is the server's: it writes rows of this shape. */
  gate_checks: {
    clock: (l) => l.updatedAt,
    mediaKeys: () => [],
    toRow: (l) => {
      const c = l;
      return {
        id: c.id,
        project_id: c.projectId,
        stage: c.stageKey,
        verdict: c.verdict,
        says: c.says,
        unmet: c.unmet,
        later: c.later,
        override: c.override ?? null,
        read_at: c.readAt,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        deleted_at: c.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id,
      stageKey: r.stage ?? "",
      verdict: r.verdict === "agrees" || r.verdict === "override" ? r.verdict : "disagrees",
      says: r.says ?? "",
      unmet: Array.isArray(r.unmet) ? r.unmet : [],
      later: Array.isArray(r.later) ? r.later : [],
      override: r.override ?? void 0,
      readAt: Number(r.read_at) || 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  },
  materials: {
    clock: (l) => l.updatedAt,
    mediaKeys: () => [],
    toRow: (l, fallbackOwner) => {
      const m = l;
      return {
        id: m.id,
        owner_id: fallbackOwner,
        project_id: m.projectId,
        what: m.what,
        how_much: m.howMuch ?? null,
        line_id: m.lineId ?? null,
        supplier: m.from ?? null,
        due: m.due ?? null,
        here: !!m.here,
        in_on: m.inOn ?? null,
        note: m.note ?? null,
        sort: m.sort,
        created_at: m.createdAt,
        updated_at: m.updatedAt,
        deleted_at: m.deletedAt ?? null
      };
    },
    fromRow: (r) => ({
      id: r.id,
      projectId: r.project_id,
      what: r.what ?? "",
      howMuch: r.how_much ?? void 0,
      lineId: r.line_id ?? void 0,
      from: r.supplier ?? void 0,
      due: r.due ?? void 0,
      here: r.here === true || void 0,
      inOn: r.in_on ?? void 0,
      note: r.note ?? void 0,
      sort: Number(r.sort) || 0,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      deletedAt: n(r.deleted_at)
    })
  }
};
function pinOf(v) {
  const p = v;
  return p && typeof p.frameId === "string" && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)) ? { frameId: p.frameId, x: Number(p.x), y: Number(p.y) } : void 0;
}
function productRunsOf(v) {
  if (!Array.isArray(v)) return void 0;
  return v.filter((x) => !!x && typeof x === "object" && typeof x.id === "string").map((x) => ({ ...x, product: typeof x.product === "string" ? x.product : "" }));
}
function flowOf(v) {
  if (!v || typeof v !== "object") return void 0;
  const f = v;
  if (typeof f.methodId !== "string" || typeof f.familyId !== "string") return void 0;
  return {
    methodId: f.methodId,
    familyId: f.familyId,
    version: Number(f.version) || 1,
    ...typeof f.name === "string" && f.name ? { name: f.name } : {},
    startedOn: typeof f.startedOn === "string" ? f.startedOn : "",
    ...f.people && typeof f.people === "object" ? { people: f.people } : {}
  };
}

// src/lib/ie/sample.ts
var D2 = 1.128;
var DRIFT_GAP = 0.2;
var CPK_CAPABLE = 1.33;
var CPK_JUST = 1;
var CPK_FROM = 25;
var counted = (rs) => rs.map((r, i) => ({ ...r, no: i + 1 })).filter((r) => !r.struck);
var dpOf = (v) => {
  const s = String(v);
  const i = s.indexOf(".");
  return i < 0 ? 0 : Math.min(3, s.length - i - 1);
};
var meanOf = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
var sdOf = (xs, m = meanOf(xs)) => xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
var sdWithinOf = (xs) => {
  if (xs.length < 2) return 0;
  let t = 0;
  for (let i = 1; i < xs.length; i++) t += Math.abs(xs[i] - xs[i - 1]);
  return t / (xs.length - 1) / D2;
};
var indexOf = (m, s, lower, upper) => {
  const lo = lower !== void 0 ? (m - lower) / (3 * s) : Infinity;
  const hi = upper !== void 0 ? (upper - m) / (3 * s) : Infinity;
  return { k: Math.min(lo, hi), side: lo <= hi ? "low" : "high", ...lower !== void 0 && upper !== void 0 ? { c: (upper - lower) / (6 * s) } : {} };
};
function upperTail(z) {
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.5 * x);
  const erfc = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return z >= 0 ? erfc / 2 : 1 - erfc / 2;
}
function tneFor(nominal, unit) {
  const big = /^(kg|l|litre|litres)$/i.test(unit ?? "");
  const q = big ? nominal * 1e3 : nominal;
  let e;
  if (q < 5 || q > 1e4) return void 0;
  if (q <= 50) e = q * 0.09;
  else if (q <= 100) e = 4.5;
  else if (q <= 200) e = q * 0.045;
  else if (q <= 300) e = 9;
  else if (q <= 500) e = q * 0.03;
  else if (q <= 1e3) e = 15;
  else if (q <= 1e4) e = q * 0.015;
  if (e === void 0) return void 0;
  return big ? e / 1e3 : e;
}
function sample(agreed, readings) {
  const count = Math.max(0, agreed?.count ?? 0);
  const kept = counted(readings);
  if (agreed?.kind === "ticks") {
    const t = kept.filter((r) => typeof r.ok === "boolean");
    return {
      n: t.length,
      count,
      enough: count > 0 && t.length >= count,
      outside: [],
      flagged: [],
      dp: 0,
      ticks: { ok: t.filter((r) => r.ok).length, bad: t.filter((r) => !r.ok).map((r) => ({ id: r.id, no: r.no })) }
    };
  }
  const vs = kept.filter((r) => typeof r.value === "number" && Number.isFinite(r.value));
  const xs = vs.map((r) => r.value);
  const dp = xs.reduce((d, x) => Math.max(d, dpOf(x)), 0);
  const f = { n: xs.length, count, enough: count > 0 && xs.length >= count, outside: [], flagged: [], dp };
  if (!xs.length) return f;
  const m = meanOf(xs), s = sdOf(xs, m), sw = sdWithinOf(xs);
  Object.assign(f, { mean: m, sd: s, min: Math.min(...xs), max: Math.max(...xs), ...xs.length >= 2 ? { sdWithin: sw } : {} });
  let lower = agreed?.lower, upper = agreed?.upper;
  if (agreed?.kind === "packers" && agreed.nominal !== void 0) {
    const tne = tneFor(agreed.nominal, agreed.unit);
    if (tne !== void 0) {
      const nom = agreed.nominal;
      const shortTne = xs.filter((x) => x < nom - tne).length, short2Tne = xs.filter((x) => x < nom - 2 * tne).length;
      f.packers = { nominal: nom, tne, meanOk: m >= nom, shortTne, short2Tne, rule2Ok: shortTne * 40 < xs.length, rule3Ok: short2Tne === 0 };
      lower = nom - tne;
      upper = void 0;
    }
  }
  f.outside = vs.flatMap((r) => lower !== void 0 && r.value < lower ? [{ id: r.id, no: r.no, value: r.value, side: "low" }] : upper !== void 0 && r.value > upper ? [{ id: r.id, no: r.no, value: r.value, side: "high" }] : []);
  if (agreed?.kind === "packers") f.outside = f.outside.filter((o) => f.packers && o.value < f.packers.nominal - f.packers.tne);
  if (s > 0 && (lower !== void 0 || upper !== void 0)) {
    const p = indexOf(m, s, lower, upper);
    f.ppk = p.k;
    f.ppkSide = p.side;
    if (p.c !== void 0) f.pp = p.c;
    f.shareLow = lower !== void 0 ? upperTail((m - lower) / s) : 0;
    f.shareHigh = upper !== void 0 ? upperTail((upper - m) / s) : 0;
    f.shareOut = f.shareLow + f.shareHigh;
  }
  if (sw > 0 && (lower !== void 0 || upper !== void 0)) {
    const c = indexOf(m, sw, lower, upper);
    f.cpk = c.k;
    f.cpkSide = c.side;
    if (c.c !== void 0) f.cp = c.c;
  }
  if (xs.length >= 5) {
    f.flagged = vs.filter((r, i) => {
      const others = xs.filter((_, j) => j !== i), om = meanOf(others), os = sdOf(others, om);
      return os > 0 && Math.abs(r.value - om) > 3 * os;
    }).map((r) => r.id);
  }
  return f;
}
var fix = (v, dp) => v.toFixed(dp);
var isWeight = (unit) => /^(g|kg|mg|oz|lb)$/i.test(unit ?? "");
var sideWord = (side, unit) => isWeight(unit) ? side === "low" ? "light" : "heavy" : side;
var u = (unit) => unit ? ` ${unit}` : "";
function inWords(p) {
  if (p >= 0.995) return "nearly all";
  for (const d of [100, 1e3, 1e4]) {
    const k2 = Math.round(p * d);
    if (k2 >= 1) return `about ${k2} in ${d.toLocaleString("en-GB")}`;
  }
  return "fewer than 1 in 10,000";
}
function limitsWords(a, dp) {
  const unit = u(a.unit);
  if (a.lower !== void 0 && a.upper !== void 0) return `within ${fix(a.lower, dp)}–${fix(a.upper, dp)}${unit}`;
  if (a.lower !== void 0) return `at least ${fix(a.lower, dp)}${unit}`;
  if (a.upper !== void 0) return `at most ${fix(a.upper, dp)}${unit}`;
  return "with no limits agreed";
}
function sampleSays(f, a) {
  if (!a) return { text: "Agree the limits and how many readings, then take them.", tone: "n", verdict: "Not agreed" };
  if (!f.n) return { text: `Nothing measured yet — ${f.count} readings to take.`, tone: "n", verdict: "Not measured" };
  const of = `${f.n} of ${f.count} in`;
  if (a.kind === "ticks" && f.ticks) {
    const { ok, bad } = f.ticks;
    if (bad.length) {
      const which = bad.slice(0, 3).map((b) => `no. ${b.no}`).join(", ") + (bad.length > 3 ? ` and ${bad.length - 3} more` : "");
      return { text: `${ok} of ${f.n} ✓ — ${bad.length} ✗ (${which}) — Didn’t pass.`, tone: "r", verdict: "Didn’t pass" };
    }
    return f.enough ? { text: `${ok} of ${f.n} ✓ — Passed.`, tone: "g", verdict: "Passed" } : { text: `${of} — all ✓ so far.`, tone: "a", verdict: of };
  }
  const dp = f.dp, unit = u(a.unit), m = f.mean ?? 0, mean3 = `mean ${fix(m, dp)}${unit}`;
  const sayOutside = () => {
    const sides = [...new Set(f.outside.map((o) => o.side))];
    const both = f.outside.length === 2 ? "both" : "all";
    const how = sides.length === 1 ? f.outside.length === 1 ? `, ${sideWord(sides[0], a.unit)}` : `, ${both} ${sideWord(sides[0], a.unit)}` : "";
    const vals = f.outside.slice(0, 4).map((o) => fix(o.value, dp)).join(", ") + (f.outside.length > 4 ? ` and ${f.outside.length - 4} more` : "");
    return `${f.outside.length} outside${how} (${vals})`;
  };
  let main;
  if (a.kind === "packers" && f.packers) {
    const p = f.packers, tne = fix(p.tne, Math.max(dp, p.tne % 1 ? 1 : 0));
    const two = fix(2 * p.tne, Math.max(dp, 2 * p.tne % 1 ? 1 : 0));
    const rules = [
      `average ${fix(m, dp)}${unit}, ${p.meanOk ? "at or above" : "below"} ${fix(p.nominal, dp)} ${p.meanOk ? "✓" : "✗"}`,
      p.shortTne ? `${p.shortTne} more than ${tne}${unit} short ${p.rule2Ok ? "✓" : "✗"}` : `none more than ${tne}${unit} short ✓`,
      p.short2Tne ? `${p.short2Tne} more than ${two}${unit} short ✗` : `none more than ${two}${unit} short ✓`
    ];
    const ok = p.meanOk && p.rule2Ok && p.rule3Ok;
    const failNow = !p.rule3Ok || f.enough && !ok;
    main = failNow ? { text: `${rules.join(" · ")} — Didn’t pass.`, tone: "r", verdict: "Didn’t pass" } : f.enough ? { text: `${rules.join(" · ")} — Passed.`, tone: "g", verdict: "Passed" } : { text: `${of} — ${rules.join(" · ")} so far.`, tone: "a", verdict: of };
  } else if (f.outside.length) {
    main = { text: `${f.n} readings, ${mean3} — ${sayOutside()} — Didn’t pass.`, tone: "r", verdict: "Didn’t pass" };
  } else if (!f.enough) {
    main = { text: `${of} — all ${limitsWords(a, dp)} so far.`, tone: "a", verdict: of };
  } else {
    main = { text: `${f.n} readings, ${mean3}, ${fix(f.min ?? m, dp)}–${fix(f.max ?? m, dp)}, all ${limitsWords(a, dp)} — Passed.`, tone: "g", verdict: "Passed" };
  }
  return { ...main, capability: capabilityWords(f, a) };
}
var drifts = (f) => f.ppk !== void 0 && f.cpk !== void 0 && Number.isFinite(f.ppk) && Number.isFinite(f.cpk) && f.cpk - f.ppk >= DRIFT_GAP;
function capabilityWords(f, a) {
  if (a.kind === "ticks") return void 0;
  if (f.ppk === void 0 && f.sd === 0 && f.n >= CPK_FROM && (a.lower !== void 0 || a.upper !== void 0))
    return { text: `Every reading the same — spread 0 from ${f.n}; capability cannot be worked out (is the instrument reading finely enough?).`, tone: "n" };
  if (f.ppk === void 0 || !Number.isFinite(f.ppk)) return void 0;
  if (f.n < CPK_FROM) return { text: `Too few for capability — from ${f.n}.`, tone: "n" };
  const c = f.ppk.toFixed(2), from = `from ${f.n}`;
  const within = drifts(f) && f.cpk !== void 0 ? ` Pack to pack it is steadier — Cpk ${f.cpk.toFixed(2)}: it drifts across the run.` : "";
  if (f.ppk >= CPK_CAPABLE) return { text: `Capable: Ppk ${c} ${from}.${within}`, tone: "g" };
  if (f.ppk >= CPK_JUST) return { text: `Just capable: Ppk ${c} ${from} — watch it.${within}`, tone: "a" };
  const twoSided = f.shareOut !== void 0 && f.shareOut > 0 && Math.min(f.shareLow ?? 0, f.shareHigh ?? 0) >= 0.1 * f.shareOut;
  const side = twoSided ? `${sideWord("low", a.unit)} or ${sideWord("high", a.unit)}` : f.ppkSide ? sideWord(f.ppkSide, a.unit) : "outside";
  const share2 = f.shareOut !== void 0 ? ` — ${inWords(f.shareOut)} would be ${side}` : ` — would drift ${side}`;
  return { text: `Not capable: Ppk ${c} ${from}${share2}.${within}`, tone: "a" };
}

// src/lib/ie/balance.ts
var keptLaps = (laps) => (laps ?? []).filter((l) => !l.foreign && !l.struck && Number.isFinite(l.sec) && l.sec > 0);
var mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
var sd = (xs, m = mean(xs)) => xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
var T95 = [
  [1, 12.706],
  [2, 4.303],
  [3, 3.182],
  [4, 2.776],
  [5, 2.571],
  [6, 2.447],
  [7, 2.365],
  [8, 2.306],
  [9, 2.262],
  [10, 2.228],
  [11, 2.201],
  [12, 2.179],
  [13, 2.16],
  [14, 2.145],
  [15, 2.131],
  [16, 2.12],
  [17, 2.11],
  [18, 2.101],
  [19, 2.093],
  [20, 2.086],
  [21, 2.08],
  [22, 2.074],
  [23, 2.069],
  [24, 2.064],
  [25, 2.06],
  [26, 2.056],
  [27, 2.052],
  [28, 2.048],
  [29, 2.045],
  [30, 2.042],
  [40, 2.021],
  [60, 2],
  [120, 1.98]
];
var t95 = (df) => {
  if (!(df >= 1)) return T95[0][1];
  let t = 1.96;
  for (const [d, v] of T95) {
    if (d <= df) t = v;
    else break;
  }
  return df > 120 ? 1.96 : t;
};
var cyclesNeeded = (m, s, n2) => {
  if (!(m > 0)) return 0;
  const t = n2 !== void 0 && n2 >= 2 ? t95(n2 - 1) : 2;
  return Math.ceil((t * s / (0.05 * m)) ** 2 - 1e-9);
};
var MIN_CYCLES = 5;
function element(st, allowance = 0) {
  const laps = keptLaps(st.laps), xs = laps.map((l) => l.sec);
  const rating = st.rating && st.rating > 0 ? st.rating : 100;
  const base = { id: st.id, name: st.name, who: st.who, rating, n: xs.length, kind: st.kind ?? "work" };
  if (!xs.length) {
    const typed = st.typedSec && st.typedSec > 0 ? st.typedSec : void 0;
    return { ...base, source: typed ? "typed" : "none", ...typed ? { standard: typed } : {}, needed: 0, enough: false, far: [] };
  }
  const m = mean(xs), s = sd(xs, m);
  const basic = m * rating / 100;
  const needed = Math.max(MIN_CYCLES, cyclesNeeded(m, s, xs.length));
  const far = xs.length >= 5 ? laps.filter((l, i) => {
    const others = xs.filter((_, j) => j !== i), om = mean(others), os = sd(others, om);
    return os > 0 && Math.abs(l.sec - om) > 3 * os;
  }).map((l) => l.id) : [];
  return { ...base, source: "timed", observed: m, basic, standard: basic * (1 + allowance), needed, enough: xs.length >= needed, far };
}
function balance(steps, a, crew) {
  const list = [...steps ?? []].sort((x, y) => x.order - y.order);
  const els = list.map((st) => element(st, a?.allowance ?? 0));
  const order = [];
  for (const e of els) if (!order.includes(e.who)) order.push(e.who);
  const takt = a?.taktSec && a.taktSec > 0 ? a.taktSec : void 0;
  const people = order.map((who) => {
    const mine = els.filter((e) => e.who === who);
    const sum = (k2) => mine.filter((e) => !k2 || e.kind === k2).reduce((t2, e) => t2 + (e.standard ?? 0), 0);
    const work = sum();
    const source = mine.some((e) => e.source === "none") ? "none" : mine.some((e) => e.source === "typed") ? "typed" : "timed";
    const c = crew?.find((x) => x.who === who);
    const per = c?.per && c.per > 0 && (!a || a.from === "target") ? c.per : 1;
    const t = takt ? takt * per : void 0;
    return {
      who,
      work,
      walk: sum("walk"),
      wait: sum("wait"),
      elements: mine,
      source,
      per,
      ...c?.unit?.trim() && per !== 1 ? { unit: c.unit.trim() } : {},
      ...c?.station?.trim() ? { station: c.station.trim() } : {},
      ...t ? { takt: t } : {},
      overBy: t ? Math.max(0, work - t) : 0,
      spare: t ? Math.max(0, t - work) : 0
    };
  });
  const load = (p) => p.work / p.per;
  const total = people.reduce((t, p) => t + load(p), 0);
  const doing = people.reduce((t, p) => t + (p.work - p.wait) / p.per, 0);
  const longest = people.reduce((m, p) => !m || load(p) > load(m) ? p : m, void 0);
  const untimed = els.filter((e) => e.source === "none").length;
  return {
    ...takt ? { taktSec: takt } : {},
    elements: els,
    people,
    total,
    ...takt && doing > 0 && !untimed ? { fewest: Math.ceil(doing / takt - 1e-9) } : {},
    ...longest && longest.work > 0 && !untimed ? { efficiency: doing / (people.length * load(longest)), constraint: longest } : {},
    untimed,
    short: els.filter((e) => e.source === "timed" && !e.enough).length
  };
}
var aPiece = (p) => {
  const u2 = p.unit?.trim();
  if (!u2) return "";
  const one = /ies$/i.test(u2) ? u2.replace(/ies$/i, "y") : /(ches|shes|xes|sses)$/i.test(u2) ? u2.replace(/es$/i, "") : u2.replace(/s$/i, "");
  return ` a ${one}`;
};
var secs = (s) => s < 60 ? `${s.toFixed(1)} s` : `${(s / 60).toFixed(2)} min`;
function balanceSays(f, onMap) {
  if (!f.elements.length) return { text: "List the work — each element, and whose it is — then time it at the line.", tone: "n", lines: [] };
  const idle = [];
  const waits = f.people.filter((p) => p.wait > 0);
  if (waits.length) idle.push({ text: `Waiting: ${waits.map((p) => `${p.who} ${secs(p.wait)}`).join(", ")} a cycle — time they could take work in.`, tone: "a" });
  const walks = f.people.filter((p) => p.walk > 0);
  if (walks.length) idle.push({ text: `Walking: ${walks.map((p) => `${p.who} ${secs(p.walk)}`).join(", ")} a cycle — the layout’s to shorten.`, tone: "n" });
  if (!f.taktSec) {
    const timed = f.elements.length - f.untimed, n2 = f.people.length;
    return {
      text: `${n2} ${n2 === 1 ? "person" : "people"}, ${timed} of ${f.elements.length} element${f.elements.length === 1 ? "" : "s"} with a time — ${secs(f.total)} of work so far. No takt yet to read it against: give Line capacity a target, or agree one here.`,
      tone: "n",
      lines: idle
    };
  }
  const lines = [];
  const over = f.people.filter((p) => p.overBy > 0).sort((a, b) => b.overBy - a.overBy);
  for (const p of over) lines.push({ text: `${p.who} carries ${secs(p.work)}${aPiece(p)} — over takt${p.per !== 1 && p.takt ? ` (${secs(p.takt)}${aPiece(p)})` : ""} by ${secs(p.overBy)}.`, tone: "r" });
  lines.push(...idle);
  if (onMap !== void 0 && f.fewest !== void 0 && onMap !== f.fewest && f.total > 0) {
    lines.push({ text: `The map has ${onMap} ${onMap === 1 ? "person" : "people"}; the work needs ${f.fewest}.`, tone: "a" });
  }
  if (f.untimed) {
    const timed = f.elements.length - f.untimed;
    if (f.short) lines.push({ text: `${f.short} element${f.short === 1 ? " is" : "s are"} short of the cycles for ±5% — time more.`, tone: "a" });
    return {
      text: `${timed} of ${f.elements.length} elements have a time — ${secs(f.total)} of work so far at a ${secs(f.taktSec)} takt. Time the rest to read the balance.`,
      tone: over.length ? "r" : "n",
      lines
    };
  }
  if (f.short) lines.push({ text: `${f.short} element${f.short === 1 ? " is" : "s are"} short of the cycles for ±5% — time more.`, tone: "a" });
  const eff = f.efficiency !== void 0 ? `, ${Math.round(f.efficiency * 100)}% balanced` : "";
  const head = `${secs(f.total)} of work at a ${secs(f.taktSec)} takt — ${f.fewest ?? 0} ${f.fewest === 1 ? "person" : "people"} needed, ${f.people.length} working${eff}.`;
  const c = f.constraint, spare = [...f.people].sort((a, b) => b.spare - a.spare)[0];
  const who = c ? ` ${c.who} carries ${secs(c.work)} — the constraint.` : "";
  const room = spare && spare.spare > 0 && spare !== c ? ` ${spare.who} has ${secs(spare.spare)} to spare.` : "";
  return { text: `${head}${who}${room}`, tone: over.length ? "r" : f.untimed || f.short ? "a" : "g", lines };
}
function balanceLine(f, onMap) {
  const s = balanceSays(f, onMap);
  const over = s.lines.filter((l) => l.tone === "r").map((l) => l.text);
  const verdict = !f.elements.length || !f.taktSec ? "Not agreed" : over.length ? "Over takt" : f.untimed ? "Not timed" : f.short ? "Short of cycles" : "Within takt";
  const rest = over.length && !f.untimed && f.taktSec ? `${secs(f.total)} of work at a ${secs(f.taktSec)} takt — ${f.fewest ?? 0} ${f.fewest === 1 ? "person" : "people"} needed, ${f.people.length} working.` : s.text;
  return { text: [...over, rest].join(" "), tone: s.tone, verdict };
}

// src/lib/ie/steps.ts
var DAY = 86400;
function waitOf(st, a) {
  if (st.waitSec !== void 0 && st.waitSec >= 0) return { sec: st.waitSec };
  if (st.queue && st.queue > 0 && a?.demandPerDay && a.demandPerDay > 0) return { sec: st.queue / a.demandPerDay * DAY, from: "queue" };
  return {};
}
var valueOf = (st) => st.kind === "wait" || st.kind === "store" ? "waste" : st.value === "adds" && st.kind !== "operation" ? "needed" : st.value;
function whoOf(st, a) {
  const w = (Array.isArray(st.who) ? st.who : []).map((x) => String(x).trim()).filter(Boolean);
  if (w.length) return w;
  return a?.scope === "line" && st.lane?.trim() ? [st.lane.trim()] : [];
}
function whereOf(st, a) {
  if (typeof st.where === "string" && st.where.trim()) return st.where.trim();
  return a?.scope !== "line" && st.lane?.trim() ? st.lane.trim() : void 0;
}
function lanesOfStep(st, by, a) {
  const l = by === "who" ? whoOf(st, a) : [whereOf(st, a)].filter((x) => !!x);
  return l.length ? l : ["Not said"];
}
function lanesOf(flow, by = "who", a) {
  const out = [];
  for (const st of [...flow].sort((x, y) => x.order - y.order)) for (const l of lanesOfStep(st, by, a)) if (!out.includes(l)) out.push(l);
  return out;
}
var laneByDefault = (a) => a?.scope === "line" ? "who" : "where";
function flowFigures(flow, a) {
  const list = [...flow ?? []].sort((x, y) => x.order - y.order);
  const takt = a?.demandPerDay && a.demandPerDay > 0 && a.availableSecPerDay && a.availableSecPerDay > 0 ? a.availableSecPerDay / a.demandPerDay : void 0;
  let lead = 0, adds = 0, needed = 0, waste = 0, untimed = 0, unmarked = 0, carried = 0;
  let biggestWait, longestCycle;
  for (const st of list) {
    const c = st.cycleSec && st.cycleSec > 0 ? st.cycleSec : 0;
    const w = waitOf(st, a);
    const wSec = w.sec ?? 0;
    if (!c && w.sec === void 0) untimed++;
    if (st.source === "carried") carried++;
    lead += c + wSec;
    const v = valueOf(st);
    if (!v && st.kind !== "wait" && st.kind !== "store") unmarked++;
    if (v === "adds") adds += c;
    else if (v === "needed") needed += c;
    else if (v === "waste") waste += c;
    waste += wSec;
    if (wSec > 0 && (!biggestWait || wSec > biggestWait.sec)) biggestWait = { step: st, sec: wSec, ...w.from ? { from: w.from } : {} };
    const each = c / (st.batch && st.batch > 1 ? st.batch : 1);
    if (each > 0 && (st.kind === "operation" || st.kind === "check") && (!longestCycle || each > longestCycle.sec)) longestCycle = { step: st, sec: each, overTakt: !!takt && each > takt };
  }
  return {
    lanes: lanesOf(list, laneByDefault(a), a),
    steps: list.length,
    leadSec: lead,
    addsSec: adds,
    neededSec: needed,
    wasteSec: waste,
    ...lead > 0 ? { pce: adds / lead } : {},
    ...takt ? { taktSec: takt } : {},
    ...biggestWait ? { biggestWait } : {},
    ...longestCycle ? { longestCycle } : {},
    untimed,
    unmarked,
    carried
  };
}
function dur(sec) {
  if (sec > 0 && sec < 0.1) return `${Number(sec.toPrecision(2))} s`;
  if (sec < 60) return `${sec.toFixed(1)} s`;
  if (sec < 600) return `${Number((sec / 60).toFixed(1))} min`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  if (sec < DAY) return `${(sec / 3600).toFixed(1)} h`;
  return `${(sec / DAY).toFixed(1)} d`;
}
var share = (x) => x <= 0 ? "0%" : x >= 0.1 ? `${Math.round(x * 100)}%` : x >= 1e-3 ? `${(x * 100).toFixed(1)}%` : `${Number((x * 100).toPrecision(1))}%`;
function flowSays(f, a) {
  if (!f.steps) return { text: "List the steps on the line end to end — from the work starting to the pallet leaving, whoever does them — and how long each takes and waits.", lines: [] };
  const atLeast = f.untimed ? "at least " : "";
  const ends = a?.customer || a?.supplier ? ` from ${a?.supplier || "the order"} to ${a?.customer || "the customer"}` : "";
  const parts = [`Lead time ${atLeast}${dur(f.leadSec)}${ends}.`];
  if (f.leadSec > 0) parts.push(`${dur(f.addsSec)} of it adds value — ${share(f.pce ?? 0)}.`);
  if (f.biggestWait) {
    const at = whereOf(f.biggestWait.step, a) ?? whoOf(f.biggestWait.step, a)[0];
    parts.push(`The biggest wait: ${f.biggestWait.step.name.trim() || "a step"}${at ? ` (${at})` : ""}, ${dur(f.biggestWait.sec)}.`);
  }
  if (f.longestCycle) {
    const c = f.longestCycle;
    const per = c.step.batch && c.step.batch > 1 ? ` a piece (${dur(c.step.cycleSec ?? 0)} for ${c.step.batch})` : "";
    parts.push(`The longest cycle: ${c.step.name.trim() || "a step"}, ${dur(c.sec)}${per}${f.taktSec ? c.overTakt ? `, over takt (${dur(f.taktSec)}) — where the stream is limited` : `, within takt (${dur(f.taktSec)})` : ""}.`);
  }
  const lines = [];
  if (f.untimed) lines.push(`${f.untimed} step${f.untimed === 1 ? " has" : "s have"} no time yet — the lead time is at least this.`);
  if (f.carried) lines.push(`${f.carried} step${f.carried === 1 ? " is" : "s are"} carried from the map before — not walked or typed again yet.`);
  if (f.unmarked) lines.push(`${f.unmarked} step${f.unmarked === 1 ? "" : "s"} not marked adds value, needed or waste yet.`);
  if (f.biggestWait?.from === "queue" && a?.demandPerDay) lines.push(`${f.biggestWait.step.name.trim()}: worked out from ${f.biggestWait.step.queue} waiting, at ${a.demandPerDay} a day.`);
  return { text: parts.join(" "), lines };
}

// src/lib/capacity.ts
var PER_MIN = { sec: 60, min: 1, hour: 1 / 60 };
function perMinute(s) {
  const typed = typedPerMinute(s);
  if (typed == null) return void 0;
  if (s.speedIn !== "before") return typed;
  return s.contains > 0 ? typed / s.contains : void 0;
}
var REST_ALLOWANCE_PCT = 9;
function allowanceOf(s) {
  if (s.kind !== "people" || s.source === "standard") return 0;
  const a = s.allowancePct ?? REST_ALLOWANCE_PCT;
  return Number.isFinite(a) && a > 0 ? a / 100 : 0;
}
function planPerMinute(s) {
  const v = perMinute(s);
  return v == null ? void 0 : v / (1 + allowanceOf(s));
}
function typedPerMinute(s) {
  if (s.rate != null && s.rate > 0) return s.rate * PER_MIN[s.ratePer ?? "min"];
  if (s.cycleSec != null && s.cycleSec > 0 && s.perCycle != null && s.perCycle > 0) return s.perCycle * 60 / s.cycleSec;
  return void 0;
}
var pct = (v, dflt) => {
  if (v == null || !Number.isFinite(v)) return dflt;
  return Math.min(100, Math.max(0, v)) / 100;
};
function stationProblem(s, i, prevUnit) {
  if (!s.unit.trim()) return "it does not say what it counts in";
  if (i > 0 && !(s.contains > 0)) return `it does not say how many ${prevUnit?.trim() || "of the one before"} make one ${oneOf(s.unit)}`;
  if (perMinute(s) == null) return "it has no speed yet";
  if (s.crew != null && !(s.crew > 0)) return "its crew has to be more than none";
  if (pct(s.runningPct, 1) === 0) return "it is never running — check the running percentage";
  if (pct(s.goodPct, 1) === 0) return "it passes nothing on — check the good percentage";
  return void 0;
}
function fmtN(n2) {
  const a = Math.abs(n2);
  const d = a >= 100 ? 0 : a >= 1 ? 1 : 2;
  return String(Number(n2.toFixed(d)));
}
var norm = (s) => s.trim().toLowerCase();
function analyse(cap2) {
  return cap2.lanes && cap2.lanes.length > 0 ? analyseLanes(cap2) : analyseChain(cap2);
}
function analyseChain(cap2) {
  const stations = cap2.stations;
  const unit = stations[0]?.unit.trim() || "units";
  const notes = [];
  const skipped = [];
  const ok = [];
  let factor = 1;
  let chainBroken;
  let goodSoFar = 1;
  const upGood = /* @__PURE__ */ new Map();
  const whole2 = /* @__PURE__ */ new Map();
  stations.forEach((s, i) => {
    if (i > 0) {
      if (chainBroken) {
        skipped.push({ station: s, index: i, why: `the chain of units breaks at ${chainBroken}` });
        return;
      }
      if (s.contains > 0) factor *= s.contains;
      else {
        chainBroken = s.name || `station ${i + 1}`;
      }
    }
    if (!chainBroken) whole2.set(s.id, { factor, up: goodSoFar });
    const problem = stationProblem(s, i, stations[i - 1]?.unit);
    const upstream = goodSoFar;
    goodSoFar *= pct(s.goodPct, 1) || 1;
    if (problem || chainBroken) {
      skipped.push({ station: s, index: i, why: problem ?? `the chain of units breaks at ${chainBroken}` });
      return;
    }
    const speed = planPerMinute(s);
    const crew = s.crew != null && s.crew > 0 ? s.crew : 1;
    const running = speed * crew * factor / upstream;
    const effective = running * pct(s.runningPct, 1);
    const chain = i === 0 ? "" : `${s.unit.trim()} · ${fmtN(factor)} ${unit} each`;
    ok.push({ station: s, index: i, factor, chain, running, effective, loadAtLine: 0, headroom: 0, does: 0, feed: "" });
    upGood.set(s.id, upstream);
  });
  let slowestBefore = Infinity;
  const slowestOfAll = Math.min(...ok.map((x) => x.effective));
  for (const x of ok) {
    const up = upGood.get(x.station.id) ?? 1;
    const own = x.station.unit.trim() || unit;
    x.does = x.effective * up / x.factor;
    if (Number.isFinite(slowestBefore)) {
      x.arrives = slowestBefore * up / x.factor;
      const gap = x.does - x.arrives;
      x.feed = gap < -1e-9 ? `${fmtN(x.arrives)} ${own} a minute arrive · it does ${fmtN(x.does)} — ${x.effective <= slowestOfAll + 1e-9 ? "holds the line back" : "the one before waits"}` : `${fmtN(x.arrives)} ${own} a minute arrive · it does ${fmtN(x.does)} — keeps up${gap > 1e-9 ? `, ${fmtN(gap)} to spare` : ""}`;
    } else {
      x.feed = `the front of the line · it does ${fmtN(x.does)} ${own} a minute`;
    }
    slowestBefore = Math.min(slowestBefore, x.effective);
  }
  const arrivals = {};
  let pace;
  stations.forEach((s, i) => {
    const w = whole2.get(s.id);
    if (i > 0 && w && pace) {
      const pf = pace.factor, pu = upGood.get(pace.station.id) ?? 1;
      const perMin = pace.effective * w.up / w.factor;
      if (perMin > 0) {
        arrivals[s.id] = {
          perMin,
          everySec: 60 / perMin,
          ratio: w.factor / pf,
          from: { name: pace.station.name.trim() || `Station ${pace.index + 1}`, unit: pace.station.unit.trim() || unit, perMin: pace.effective * pu / pf }
        };
      }
    }
    const x = ok.find((o) => o.station.id === s.id);
    if (x && (!pace || x.effective < pace.effective)) pace = x;
  });
  stations.forEach((s, i) => {
    if (i === 0 || !(s.contains > 0)) return;
    const prev = stations[i - 1];
    if (norm(prev.unit) && norm(s.unit) && norm(prev.unit) !== norm(s.unit) && s.contains === 1) {
      notes.push(`${s.name || `Station ${i + 1}`}: its ${s.unit.trim()} are counted one-for-one with the ${prev.unit.trim()} before — is that right?`);
    }
    if (norm(prev.unit) === norm(s.unit) && s.contains !== 1) {
      notes.push(`${s.name || `Station ${i + 1}`} counts in ${s.unit.trim()} like the one before, but says ${fmtN(s.contains)} of those make one — is that right?`);
    }
  });
  const target = cap2.targetPerMin != null && cap2.targetPerMin > 0 ? cap2.targetPerMin : void 0;
  const out = { unit, ok, skipped, target, sentence: "", notes, arrivals };
  if (ok.length === 0) {
    out.sentence = stations.length === 0 ? "Add the stations in the order the product goes through them, with how fast each one runs." : "None of the stations can be counted yet — see what each one is missing.";
    return out;
  }
  const byEff = [...ok].sort((a, b) => a.effective - b.effective);
  const byRun = [...ok].sort((a, b) => a.running - b.running);
  const limit = byEff[0];
  const next = byEff[1];
  const line = limit.effective;
  for (const r of ok) {
    r.loadAtLine = r.effective > 0 ? line / r.effective : 0;
    r.headroom = r.effective - line;
  }
  out.limit = limit;
  out.next = next;
  out.limitAtRunning = byRun[0];
  out.line = line;
  out.goodOut = line * goodSoFar;
  if (target != null) out.gap = target - line;
  if (next) {
    out.liftAtMost = next.effective - line;
    out.liftNoStops = Math.max(0, Math.min(limit.running, next.effective) - line);
  }
  out.sentence = sentenceOf(out, cap2);
  return out;
}
function sentenceOf(r, cap2) {
  const limit = r.limit;
  const name = (s) => s.station.name.trim() || `Station ${s.index + 1}`;
  const line = r.line;
  const per = `${r.unit}/min`;
  const parts = [];
  if (!r.next) {
    parts.push(`Only ${name(limit)} is counted so far, at ${fmtN(line)} ${per} — add the other stations to see which one limits the line.`);
  } else {
    const level = r.next.effective - line <= line * 0.01;
    const tgt = r.target == null ? "" : r.gap > 0 ? `, ${fmtN(r.gap)} short of the ${fmtN(r.target)} target` : `, above the ${fmtN(r.target)} target`;
    parts.push(level ? `${name(limit)} and ${name(r.next)} are level at ${fmtN(line)} ${per}${tgt}.` : `${name(limit)} limits the line at ${fmtN(line)} ${per}${tgt}.`);
    if (r.target != null && r.gap <= 0) {
      parts.push("Capacity is not what holds this line back at that target — look at stops and quality.");
    } else if (!level) {
      parts.push(`${name(r.next)} is next at ${fmtN(r.next.effective)}, so fixing ${name(limit)} lifts the line by ${fmtN(r.liftAtMost)} at most.`);
    }
    if (r.limitAtRunning && r.limitAtRunning.index !== limit.index) {
      parts.push(`On speed alone ${name(r.limitAtRunning)} is the slowest — it is ${name(limit)}’s stops that pull the line down.`);
    } else if (limit.effective < limit.running - 1e-9 && r.liftNoStops && r.liftNoStops > line * 0.01) {
      parts.push(`Its stops cost ${fmtN(limit.running - limit.effective)} ${per}.`);
    }
  }
  if (r.skipped.length) parts.push(`${r.skipped.length} station${r.skipped.length === 1 ? "" : "s"} not counted yet.`);
  return parts.join(" ");
}
var MERGE_ID = "__merge__";
function analyseLanes(cap2) {
  const lanes = cap2.lanes ?? [];
  const laneIds = new Set(lanes.map((l) => l.id));
  const at = new Map(cap2.stations.map((st, i) => [st.id, i]));
  const own = (id) => cap2.stations.filter((st) => st.lane === id);
  const shared = cap2.stations.filter((st) => !st.lane || !laneIds.has(st.lane));
  const nameOf = (l, i) => l.name.trim() || `Line ${String.fromCharCode(65 + i % 26)}`;
  const global = (x) => ({ ...x, index: at.get(x.station.id) ?? -1 });
  const globalise = (r) => ({
    ...r,
    ok: r.ok.map(global),
    skipped: r.skipped.map((k2) => ({ ...k2, index: at.get(k2.station.id) ?? k2.index })),
    ...r.limit ? { limit: global(r.limit) } : {},
    ...r.next ? { next: global(r.next) } : {},
    ...r.limitAtRunning ? { limitAtRunning: global(r.limitAtRunning) } : {}
  });
  const sections = lanes.map((l, i) => ({ id: l.id, name: nameOf(l, i), result: globalise(analyseChain({ stations: own(l.id) })) }));
  const live3 = sections.filter((x) => x.result.ok.length > 0 && x.result.line != null);
  const notes = [];
  const target = cap2.targetPerMin != null && cap2.targetPerMin > 0 ? cap2.targetPerMin : void 0;
  const unit = (live3[0] ?? sections[0])?.result.unit ?? "units";
  const base = { unit, ok: [], skipped: [], target, sentence: "", notes, arrivals: {} };
  for (const x of sections) {
    x.result.skipped.forEach((k2) => base.skipped.push(k2));
    x.result.notes.forEach((n2) => notes.push(`${x.name}: ${n2}`));
    Object.assign(base.arrivals, x.result.arrivals);
  }
  if (live3.length === 0) {
    return {
      ...base,
      lanes: { sections, sends: 0, heldBy: "lanes" },
      sentence: sections.some((x) => x.result.skipped.length) ? "None of the stations can be counted yet — see what each one is missing." : "Add the stations each line goes through, in order, with how fast each one runs."
    };
  }
  const sameUnit = live3.every((x) => x.result.unit.trim().toLowerCase() === unit.trim().toLowerCase());
  if (!sameUnit) notes.push(`The lines do not count in the same unit (${live3.map((x) => `${x.name}: ${x.result.unit}`).join(", ")}) — they are added as if they did.`);
  const asked = live3.reduce((n2, x) => n2 + x.result.line, 0);
  const sends = live3.reduce((n2, x) => n2 + (x.result.goodOut ?? x.result.line ?? 0), 0);
  const goodFrac = asked > 0 ? sends / asked : 1;
  const per = `${unit}/min`;
  const names = (xs) => xs.length <= 2 ? xs.map((x) => x.name).join(" and ") : `${xs.slice(0, -1).map((x) => x.name).join(", ")} and ${xs[xs.length - 1].name}`;
  let merged;
  if (shared.length > 0) {
    const lastOf = (l) => own(l.id)[own(l.id).length - 1];
    const lastFactor = live3[0].result.ok[live3[0].result.ok.length - 1].factor;
    const lastIsLast = live3[0].result.ok[live3[0].result.ok.length - 1].station.id === lastOf(live3[0])?.id;
    if (!lastIsLast) notes.push(`${live3[0].name}: its last station is not counted, so what it sends on cannot be worked out.`);
    const first = shared[0];
    const feeder = { id: MERGE_ID, name: `${names(live3)} together`, kind: "machine", unit, contains: 1, rate: sends, ratePer: "min", crew: 1, source: "plate", runningPct: 100, goodPct: 100 };
    const before = first.speedIn === "before";
    const chain = [feeder, {
      ...first,
      contains: first.contains > 0 ? first.contains * lastFactor : first.contains,
      ...before && first.rate != null ? { rate: first.rate * lastFactor } : {},
      ...before && first.perCycle != null ? { perCycle: first.perCycle * lastFactor } : {}
    }, ...shared.slice(1)];
    merged = globalise(analyseChain({ stations: chain }));
    merged.ok = merged.ok.map((x) => x.station.id === MERGE_ID ? { ...x, index: -1 } : x);
    if (merged.limit?.station.id === MERGE_ID) merged = { ...merged, limit: { ...merged.limit, index: -1 } };
    merged.skipped.forEach((k2) => base.skipped.push(k2));
    merged.notes.forEach((n2) => notes.push(n2));
    Object.assign(base.arrivals, merged.arrivals);
  }
  const heldBy = merged?.limit && merged.limit.station.id !== MERGE_ID ? "shared" : "lanes";
  const total = heldBy === "shared" && merged && merged.line != null && goodFrac > 0 ? merged.line / goodFrac : asked;
  const sharedOk = merged ? merged.ok.filter((x) => x.station.id !== MERGE_ID) : [];
  const lanesLimit = live3.map((x) => x.result.limit).sort((p, q) => p.effective - q.effective)[0];
  const lanesRun = live3.map((x) => x.result.limitAtRunning).filter((x) => !!x).sort((p, q) => p.running - q.running)[0];
  const limit = heldBy === "shared" ? merged?.limit : lanesLimit;
  base.ok = [...live3.flatMap((x) => x.result.ok), ...sharedOk];
  base.limit = limit;
  base.limitAtRunning = heldBy === "shared" ? merged?.limitAtRunning && merged.limitAtRunning.station.id !== MERGE_ID ? merged.limitAtRunning : limit : lanesRun ?? limit;
  base.line = total;
  base.goodOut = merged && merged.line != null ? merged.goodOut ?? merged.line : sends;
  if (target != null) base.gap = target - total;
  const tgt = target == null ? "" : base.gap > 0 ? ` — ${fmtN(base.gap)} short of the ${fmtN(target)} target` : ` — above the ${fmtN(target)} target`;
  const nm = (x) => x.station.name.trim() || `Station ${x.index + 1}`;
  if (heldBy === "shared" && limit) {
    const takes = merged?.line ?? total;
    const alike = Math.abs(takes - total) >= 0.05 ? ` (${fmtN(total)} ${per} like for like at the lines’ start)` : "";
    base.sentence = `${nm(limit)} holds ${live3.length === 1 ? live3[0].name : names(live3)} to ${fmtN(takes)} ${per}${live3.length > 1 ? " together" : ""} — ${fmtN(sends)} ${per} arrive at it${alike}${tgt}.`;
  } else {
    const each = live3.map((x) => `${x.name} is held by ${nm(x.result.limit)} at ${fmtN(x.result.line)}`).join("; ");
    const out = `${names(live3)} make${live3.length === 1 ? "s" : ""} ${fmtN(sends)} ${per}${live3.length > 1 ? " together" : ""}${tgt}. ${each}.`;
    const room = merged?.limit && merged.limit.station.id === MERGE_ID && merged.next ? ` ${nm(merged.next)} can take ${fmtN(merged.next.effective)}, so it is not what limits them.` : "";
    base.sentence = out + room;
  }
  if (base.skipped.length) base.sentence += ` ${base.skipped.length} station${base.skipped.length === 1 ? "" : "s"} not counted yet.`;
  base.lanes = { sections, ...merged ? { merged } : {}, sends, heldBy };
  return base;
}
var oneOf = (unit) => {
  const u2 = unit.trim();
  if (!u2) return "one";
  if (/ies$/i.test(u2)) return u2.replace(/ies$/i, "y");
  if (/(ss|sh|ch|x)es$/i.test(u2)) return u2.replace(/es$/i, "");
  return u2.replace(/s$/i, "");
};
function labourCost(r, people, ratePerHour) {
  const out = r.goodOut ?? r.line;
  if (!(out != null && out > 0) || !(people != null && people > 0) || !(ratePerHour != null && ratePerHour > 0)) return void 0;
  const perHour = people * ratePerHour, packsPerHour = out * 60;
  return { people, ratePerHour, perHour, packsPerHour, perPack: perHour / packsPerHour };
}
function labourInputs(cap2, mapPeople, line) {
  const tp = cap2?.labour?.people, tr = cap2?.labour?.ratePerHour;
  const out = {};
  if (tp != null && tp > 0) {
    out.people = tp;
    out.peopleFrom = "typed";
  } else if (mapPeople != null && mapPeople > 0) {
    out.people = mapPeople;
    out.peopleFrom = "map";
  } else if (line?.crew != null && line.crew > 0) {
    out.people = line.crew;
    out.peopleFrom = "line";
  }
  if (tr != null && tr > 0) {
    out.rate = tr;
    out.rateFrom = "typed";
  } else if (line?.labourRatePerHour != null && line.labourRatePerHour > 0) {
    out.rate = line.labourRatePerHour * (line.labourBurden != null && line.labourBurden > 0 ? line.labourBurden : 1);
    out.rateFrom = "line";
  }
  return out;
}

// src/lib/cost.ts
var labourPerHour = (w) => w.crew && w.crew > 0 && w.labourRatePerHour && w.labourRatePerHour > 0 ? w.crew * w.labourRatePerHour * burdenOf(w) : 0;
var burdenOf = (w) => w.labourBurden && w.labourBurden > 0 ? w.labourBurden : 1;

// src/lib/ie/changeover.ts
var sorted = (seq) => [...seq ?? []].sort((a, b) => a.order - b.order);
var secOf = (st) => st.sec !== void 0 && Number.isFinite(st.sec) && st.sec > 0 ? st.sec : 0;
var hasTime = (st) => secOf(st) > 0;
var crewOf = (xs) => (Array.isArray(xs) ? xs : []).map((x) => String(x).trim()).filter(Boolean);
var SMED_TARGET_SEC = 10 * 60;
var onTarget = (sec) => sec < SMED_TARGET_SEC;
function mins(sec) {
  if (sec < 60) return dur(sec);
  const m = sec / 60;
  return m >= 10 ? `${Math.round(m)} min` : `${+m.toFixed(1)} min`;
}
var span = (sec) => sec < 7200 ? mins(sec) : `${(sec / 3600).toLocaleString("en-GB", { maximumFractionDigits: 1 })} h`;
var COUNT = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
var countWord = (n2) => n2 >= 0 && n2 <= 10 && Number.isInteger(n2) ? COUNT[n2] : String(n2);
var cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
var num = (n2) => Number.isInteger(n2) ? String(n2) : String(+n2.toFixed(1));
var RUNG_WORD = { now: "now", separated: "separated", converted: "converted", streamlined: "streamlined" };
function arrange(seq, rung, o = {}) {
  const list = sorted(seq);
  const inStop = [];
  for (const st of list) {
    if (!hasTime(st) && !o.untimed) continue;
    if (rung !== "now" && st.side === "external") continue;
    const p = st.plan;
    let sec = secOf(st);
    if ((rung === "converted" || rung === "streamlined") && p?.kind === "convert") {
      if (!(p.targetSec && p.targetSec > 0)) continue;
      sec = Math.min(sec, p.targetSec);
    }
    if (rung === "streamlined" && p?.kind === "eliminate") continue;
    if (rung === "streamlined" && p?.kind === "streamline" && p.targetSec !== void 0 && p.targetSec >= 0) sec = Math.min(sec, p.targetSec);
    const planned = rung === "streamlined" && p?.kind === "streamline";
    inStop.push({ st, sec, crew: planned && crewOf(p?.crew).length ? crewOf(p?.crew) : crewOf(st.crew), alongside: planned && p?.alongside ? p.alongside : st.alongside });
  }
  const byId = new Map(inStop.map((x) => [x.st.id, x]));
  const rootOf = (id) => {
    let cur = id;
    for (let i = 0; i < inStop.length; i++) {
      const nxt = byId.get(cur)?.alongside;
      if (!nxt || nxt === cur || !byId.has(nxt)) return cur;
      cur = nxt;
    }
    return cur;
  };
  const colOfRoot = /* @__PURE__ */ new Map();
  for (const x of inStop) {
    const r = rootOf(x.st.id);
    if (!colOfRoot.has(r)) colOfRoot.set(r, colOfRoot.size);
  }
  const placed = inStop.map((x) => ({ st: x.st, sec: x.sec, crew: x.crew, col: colOfRoot.get(rootOf(x.st.id)) ?? 0 }));
  const cols = [...new Set(placed.map((p) => p.col))].sort((a, b) => a - b).map((col2) => {
    const here = placed.filter((p) => p.col === col2);
    return { col: col2, sec: Math.max(0, ...here.map((p) => p.sec)), ids: here.map((p) => p.st.id) };
  });
  return { placed, cols, elapsedSec: cols.reduce((t, c) => t + c.sec, 0), labourSec: placed.reduce((t, p) => t + p.sec * Math.max(1, p.crew.length), 0) };
}
function ladderOf(seq) {
  const r = (x) => {
    const a = arrange(seq, x);
    return { elapsedSec: a.elapsedSec, labourSec: a.labourSec };
  };
  const list = sorted(seq).filter((st) => st.side === "internal" && hasTime(st));
  const converts = list.filter((st) => st.plan?.kind === "convert").length;
  const streamlines = list.filter((st) => st.plan?.kind === "streamline" || st.plan?.kind === "eliminate").length;
  return {
    now: r("now"),
    separated: r("separated"),
    converted: r("converted"),
    streamlined: r("streamlined"),
    converts,
    streamlines,
    planned: converts + streamlines > 0,
    last: streamlines ? "streamlined" : converts ? "converted" : "separated"
  };
}
function ladderSays(l) {
  if (l.now.elapsedSec <= 0) return { text: "", tone: "n" };
  const rungs = ["now", "separated", ...l.converts ? ["converted"] : [], ...l.streamlines ? ["streamlined"] : []];
  const parallel = l.streamlines && l.streamlined.labourSec > l.streamlined.elapsedSec + 1 ? ` (${mins(l.streamlined.labourSec)} of work, some in parallel)` : "";
  const steps = rungs.map((x) => `${mins(l[x].elapsedSec)} ${RUNG_WORD[x]}${x === "streamlined" ? parallel : ""}`).join(" → ");
  const end = l[l.last].elapsedSec;
  const planned = l.planned ? ", planned — proved when it is timed again" : "";
  const target = onTarget(end) ? " Single-digit minutes — SMED's target." : ` SMED's target is single-digit minutes: ${mins(Math.max(1, end - SMED_TARGET_SEC))} still to find.`;
  return { text: `${steps}${planned}.${target}`, tone: onTarget(end) && l.planned ? "g" : "n" };
}
function changeoverFigures(seq, perWeek) {
  const list = sorted(seq);
  const withTime = list.filter(hasTime);
  const internalSec = withTime.filter((s) => s.side === "internal").reduce((t, s) => t + secOf(s), 0);
  const externalSec = withTime.filter((s) => s.side === "external").reduce((t, s) => t + secOf(s), 0);
  const carried = list.filter((s) => s.source === "carried").length;
  const source = !withTime.length ? "none" : withTime.some((s) => s.source === "carried") ? "carried" : withTime.some((s) => s.source === "typed") ? "typed" : "timed";
  const pw = perWeek && perWeek > 0 ? perWeek : void 0;
  const byLongest = (a, b) => secOf(b) - secOf(a) || a.order - b.order;
  const now = arrange(list, "now"), sep = arrange(list, "separated");
  return {
    steps: list.length,
    known: withTime.length,
    untimed: list.length - withTime.length,
    carried,
    source,
    nowSec: now.elapsedSec,
    labourSec: now.labourSec,
    internalSec,
    externalSec,
    afterSec: sep.elapsedSec,
    ...pw ? { perWeek: pw, weekSec: externalSec * pw } : {},
    external: list.filter((s) => s.side === "external" && hasTime(s)).sort(byLongest),
    internal: list.filter((s) => s.side === "internal" && hasTime(s)).sort(byLongest),
    enough: withTime.length > 0
  };
}
function runningOf(r) {
  const shifts = r?.shiftsPerDay && r.shiftsPerDay > 0 ? Math.round(r.shiftsPerDay) : 0;
  const each = Array.isArray(r?.shiftHours) && r.shiftHours.length && r.shiftHours.every((h) => h > 0) ? r.shiftHours.map((h) => h * 60) : r?.hoursPerShift && r.hoursPerShift > 0 && shifts ? Array.from({ length: shifts }, () => r.hoursPerShift * 60) : [];
  const told = Array.isArray(r?.shiftBreaks) && r.shiftBreaks.length === each.length && r.shiftBreaks.every((b) => b >= 0) ? r.shiftBreaks : void 0;
  const breaks = told ?? (r?.breakMin !== void 0 && r.breakMin >= 0 ? each.map(() => r.breakMin) : void 0);
  const days2 = r?.daysPerWeek && r.daysPerWeek > 0 && r.daysPerWeek <= 7 ? r.daysPerWeek : 0;
  const missing = [
    ...!shifts && !each.length ? ["the shifts a day"] : [],
    ...!each.length ? ["the hours a shift"] : [],
    ...each.length && !breaks ? ["the planned breaks a shift the line stops for"] : [],
    ...!days2 ? ["the days a week"] : []
  ];
  if (missing.length || !breaks) return { missing };
  if (each.some((m, i) => breaks[i] >= m)) return { missing: ["breaks shorter than the shift"] };
  const net = each.map((m, i) => m - breaks[i]);
  const perDay = net.reduce((t, x) => t + x, 0);
  return { run: {
    shifts: each.length,
    minutesPerShift: net,
    shiftMinutes: each,
    breakMinutes: breaks,
    minutesPerDay: perDay,
    daysPerWeek: days2,
    minutesPerWeek: perDay * days2,
    ...r?.weeksPerYear && r.weeksPerYear > 0 ? { weeksPerYear: r.weeksPerYear } : {}
  }, missing: [] };
}
function changeoversPer(c, run) {
  if (!c || !(c.count > 0) || !run) return void 0;
  const day = c.per === "shift" ? c.count * run.shifts : c.per === "day" ? c.count : c.count / run.daysPerWeek;
  return { shift: day / run.shifts, day, week: day * run.daysPerWeek };
}
function changeoversOf(f) {
  const per = changeoversPer(f.changeovers, runningOf(f.running).run);
  if (per) return per;
  if (f.changeovers?.per === "week" && f.changeovers.count > 0) return { week: f.changeovers.count };
  return f.perWeek && f.perWeek > 0 ? { week: f.perWeek } : {};
}
var figuresOf = (f) => changeoverFigures(f.sequence, changeoversOf(f).week);
function availableOf(f) {
  const run = runningOf(f.running).run;
  if (run) return { min: run.minutesPerDay, from: "running" };
  return f.availableMinPerDay && f.availableMinPerDay > 0 ? { min: f.availableMinPerDay, from: "typed" } : void 0;
}
function runMinOf(p) {
  if (p.demandPerDay && p.demandPerDay > 0 && p.ratePerMin && p.ratePerMin > 0) return { min: p.demandPerDay / p.ratePerMin, how: "rate" };
  if (p.runMinPerDay && p.runMinPerDay > 0) return { min: p.runMinPerDay, how: "typed" };
  return void 0;
}
function intervalOf(f, products, availableMinPerDay) {
  const list = (products ?? []).filter((p) => p.product.trim());
  const runs = list.map((p) => ({ p, r: runMinOf(p) }));
  const known = runs.filter((x) => x.r).length;
  const missing = runs.filter((x) => !x.r).map((x) => x.p.product.trim());
  const available = availableMinPerDay && availableMinPerDay > 0 ? availableMinPerDay : void 0;
  const base = { products: list.length, known, missing, ...available ? { availableMinPerDay: available } : {}, ready: false };
  if (list.length < 2 || missing.length || !available || !f.enough) return base;
  const run = runs.reduce((t, x) => t + (x.r?.min ?? 0), 0);
  const free = available - run;
  if (free <= 0) return { ...base, runMinPerDay: run, freeMinPerDay: free };
  const n2 = list.length;
  return { ...base, runMinPerDay: run, freeMinPerDay: free, daysNow: n2 * f.nowSec / 60 / free, daysAfter: n2 * f.afterSec / 60 / free, dailyMin: free / n2, ready: true };
}
var days = (d) => `${d.toFixed(1)}`;
function intervalSays(iv, f) {
  if (!f.enough) return { text: "Time or type the changeover first — the interval is read from its minutes.", tone: "n" };
  if (iv.products < 2) return { text: "List the products run on this line, each with what the customer takes a day, to read how often each can run.", tone: "n" };
  if (iv.missing.length) return { text: `${iv.known} of ${iv.products} products have a run time; the interval needs all — ${iv.missing.join(", ")} still to say.`, tone: "n" };
  if (!iv.availableMinPerDay) return { text: "How the line runs — its shifts and their hours — the interval needs it.", tone: "n" };
  if (!iv.ready || iv.freeMinPerDay === void 0 || iv.daysNow === void 0 || iv.daysAfter === void 0 || iv.dailyMin === void 0) {
    return { text: `No time free for changeovers: ${mins((iv.runMinPerDay ?? 0) * 60)} of run in the ${mins(iv.availableMinPerDay * 60)} the line has a day.`, tone: "r" };
  }
  const n2 = cap(countWord(iv.products));
  const daily = iv.daysAfter <= 1 ? " — daily" : ` — a daily interval needs a changeover of ${mins(iv.dailyMin * 60)} or less`;
  if (f.externalSec > 0 && f.afterSec < f.nowSec) return { text: `${n2} products at ${mins(f.nowSec)} run every ${days(iv.daysNow)} days; at ${mins(f.afterSec)}, every ${days(iv.daysAfter)}${daily}.`, tone: "n" };
  return { text: `${n2} products at ${mins(f.nowSec)} run every ${days(iv.daysNow)} days${iv.daysNow <= 1 ? " — daily" : ` — a daily interval needs a changeover of ${mins(iv.dailyMin * 60)} or less`}.`, tone: "n" };
}
function changeoverSays(f, agreed) {
  if (!f.steps) return { text: "Record the changeover element by element — from the last good piece of the old product to the first good piece of the new at full rate — Lap as each ends, or type them.", tone: "n", verdict: "Not timed", lines: [] };
  if (!f.enough) return { text: `${f.steps} element${f.steps === 1 ? "" : "s"}, none timed yet — Lap as each ends, or type the minutes.`, tone: "n", verdict: "Not timed", lines: [] };
  const lines = [];
  if (f.untimed) lines.push({ text: `${f.untimed} element${f.untimed === 1 ? " has" : "s have"} no time yet — the minutes are at least this.`, tone: "n" });
  if (f.carried) lines.push({ text: `${f.carried} element${f.carried === 1 ? " is" : "s are"} carried from the changeover before — not timed again yet.`, tone: "n" });
  const agreedMin = agreed && agreed.minutes > 0 ? agreed.minutes : void 0;
  const over = agreedMin !== void 0 ? f.nowSec / 60 - agreedMin : void 0;
  if (agreedMin !== void 0 && over !== void 0) {
    if (over > 0.5) lines.push({ text: `Over the ${mins(agreedMin * 60)} standard by ${mins(over * 60)}.`, tone: "r" });
    else lines.push({ text: `Within the ${mins(agreedMin * 60)} standard.`, tone: "g" });
  }
  const atLeast = f.untimed ? "at least " : "";
  const week = f.weekSec && f.perWeek ? ` — ${span(f.weekSec)} a week back, ${num(f.perWeek)} changeover${f.perWeek === 1 ? "" : "s"}` : "";
  const text = f.externalSec > 0 ? `${cap(atLeast)}${mins(f.nowSec)} now. With the ${mins(f.externalSec)} of external work done while the line runs: ${mins(f.afterSec)}${week}.` : `${cap(atLeast)}${mins(f.nowSec)} now, all of it with the line stopped — no external work found yet.`;
  const tone = over !== void 0 && over > 0.5 ? "r" : f.externalSec > 0 ? "a" : over !== void 0 ? "g" : "n";
  const verdict = over !== void 0 && over > 0.5 ? "Over the standard" : f.externalSec > 0 ? `${mins(f.externalSec)} external inside` : over !== void 0 ? "Within the standard" : `${mins(f.nowSec)} now`;
  return { text, tone, verdict, lines };
}

// src/lib/ie/sampling.ts
var Z95 = 1.96;
var DEFAULT_ACTIVITIES = ["working", "walking", "waiting", "searching", "away"];
var TOO_FEW_TAPS = 30;
var marginOf = (p, n2, z = Z95) => {
  if (!(n2 > 0)) return 0;
  const z2 = z * z / n2;
  return z * Math.sqrt(p * (1 - p) / n2 + z2 / (4 * n2)) / (1 + z2);
};
var tapsNeeded = (p, marginFrac, z = Z95) => Math.ceil(z * z * p * (1 - p) / (marginFrac * marginFrac));
var tapsOf = (taps, who) => taps.filter((t) => !t.struck && (!who || t.who === who));
function shares(taps, activities = DEFAULT_ACTIVITIES, who) {
  const mine = tapsOf(taps, who);
  const n2 = mine.length;
  const names = [...activities, ...mine.map((t) => t.activity).filter((a) => !activities.includes(a))];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const a of names) {
    if (seen.has(a)) continue;
    seen.add(a);
    const k2 = mine.filter((t) => t.activity === a).length;
    const p = n2 ? k2 / n2 : 0;
    out.push({ activity: a, taps: k2, share: p, margin: marginOf(p, n2) });
  }
  return out;
}
function tapsFor(p, marginFrac, z = Z95) {
  let n2 = Math.max(1, tapsNeeded(p, marginFrac, z));
  while (marginOf(p, n2, z) > marginFrac + 1e-12 && n2 < 1e6) n2++;
  return n2;
}
function moreNeeded(list, n2, marginPts = 5) {
  const big = list.reduce((m, s) => m && m.share >= s.share ? m : s, void 0);
  if (!big || !n2) return 0;
  return Math.max(0, tapsFor(big.share, marginPts / 100) - n2);
}
var samplingEnough = (n2) => n2 === 0 ? "none" : n2 < TOO_FEW_TAPS ? "early" : "enough";
var pct2 = (f) => `${Math.round(f * 100)}%`;
var pts = (f) => `±${Math.round(f * 100)}`;
function samplingReading(facts, who) {
  const taps = tapsOf(facts.taps ?? [], who);
  const n2 = taps.length;
  if (samplingEnough(n2) !== "enough") return n2 ? `${who}: too early — ${n2} tap${n2 === 1 ? "" : "s"} so far, ${TOO_FEW_TAPS} needed before the shares are said` : `${who}: no taps yet`;
  const list = shares(taps, facts.activities ?? DEFAULT_ACTIVITIES).filter((s) => s.taps > 0).sort((a, b) => b.share - a.share);
  const want = facts.marginPts ?? 5;
  const more = moreNeeded(list, n2, want);
  const parts = list.map((s, i) => `${s.activity} ${pct2(s.share)}${i === 0 ? ` (${pts(s.margin)})` : ""}`);
  return `${who}: ${parts.join(", ")} — from ${n2} taps${more ? `; ${more} more for ±${want} points` : `; within ±${want} points`}`;
}
function samplingSays(a, taps) {
  if (!a) return { text: "Say who is watched and the shift, then answer each moment as it comes.", tone: "n", verdict: "Not set up" };
  const n2 = tapsOf(taps).length;
  if (!n2) return { text: `${a.who.length} ${a.who.length === 1 ? "person" : "people"} watched, ${a.prompts.length} moments in the shift — no taps yet.`, tone: "n", verdict: "No taps yet" };
  const facts = { activities: a.activities, marginPts: a.marginPts, taps };
  const text = a.who.map((w) => samplingReading(facts, w)).join(". ") + ".";
  const early = a.who.some((w) => samplingEnough(tapsOf(taps, w).length) !== "enough");
  return { text, tone: "n", verdict: early ? `Too early — ${n2} tap${n2 === 1 ? "" : "s"}` : `From ${n2} taps` };
}

// src/lib/weeks.ts
function todayISO(d = /* @__PURE__ */ new Date()) {
  const p = (n2) => String(n2).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function niceDay(iso, opts = {}) {
  if (!iso) return "";
  const t = Date.parse(`${iso}T12:00:00`);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString("en-GB", {
    ...opts.weekday ? { weekday: opts.weekday } : {},
    day: "numeric",
    month: "short",
    ...opts.year ? { year: "numeric" } : {}
  });
}
var addDays = (iso, n2) => {
  const d = /* @__PURE__ */ new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n2);
  return todayISO(d);
};

// src/lib/sixm.ts
var ROOM = /humid|condensation|dust|draught|lighting|ambient|room temp|hot day|cold day|weather|damp/;
function boneOfStop(category, subcategory, note) {
  if (ROOM.test((note ?? "").toLowerCase())) return "environment";
  const usual = boneOfSub(subcategory);
  if (usual) return usual;
  const t = `${subcategory ?? ""} ${note ?? ""}`.toLowerCase();
  if (/film|splice|reel|label|carton|tray|bag|pack(ag)?ing|product|ingredient|spec|supplier|material/.test(t)) return "material";
  if (/checkweigh|metal detect|vision|reject|calibrat|scale|gauge|counter|sensor read|not logged/.test(t)) return "measurement";
  if (ROOM.test(t)) return "environment";
  if (/operator|crew|staff|labour|training|absence|short|agency|break|shift/.test(t)) return "people";
  if (/changeover|set.?up|clean|sop|standard|procedure|method|schedule/.test(t)) return "method";
  switch (category) {
    case "Changeover":
      return "method";
    case "Waiting":
      return "people";
    case "Hygiene & cleaning":
      return "method";
    case "Quality":
      return "material";
    default:
      return "machine";
  }
}
var DEFAULT_BONE = {
  /* Machine — the equipment that DOES the work. A seal is made by the jaws;
     a utility (air, steam, chill) is plant engineering owns. */
  "Mechanical": "machine",
  "Electrical": "machine",
  "Utilities (air / steam / chill)": "machine",
  "Sensor trip": "machine",
  "Sensor / photo-eye fault": "machine",
  "Tooling": "machine",
  "Seal fault": "machine",
  "Running below rated": "machine",
  /* Measurement — what CHECKS or COUNTS the work, or holds it to be checked. */
  "Checkweigher false reject": "measurement",
  "Waiting QA release": "measurement",
  "Swab / QA hold": "measurement",
  /* Material — the product, and what it is made and packed with. */
  "Film / packaging snag": "material",
  "No packaging / consumables": "material",
  "No ingredients": "material",
  "Product out of spec (size / shape)": "material",
  /* Method — the way it is done: changeovers, standards, cleaning, the plan. */
  "Setup": "method",
  "No standard": "method",
  "Product change": "method",
  "Size / format change": "method",
  "Allergen changeover": "method",
  "Hygiene cleandown": "method",
  "Label / date change": "method",
  "Scheduled clean": "method",
  "Unscheduled clean": "method",
  "Short runs": "method",
  "Waiting forklift / logistics": "method",
  /* People — who runs it, and whether they can. */
  "No labour": "people",
  "Untrained cover": "people",
  "Uneven crewing": "people",
  /* Environment — the conditions around the line. */
  "Condensation / ambient temperature": "environment"
  /* Left out on purpose — no usual bone, so the words decide: Jam /
     blockage, Misfeed, Manual clear (any of the six), Starved upstream and
     Blocked downstream (the cause is at the other machine), Reject, Rework,
     Scrap / waste, Giveaway / overfill, Underweight reject, Label / date
     fault, Foreign body / detector reject (each a symptom any bone can
     cause). */
};
function boneOfSub(subcategory) {
  const k2 = (subcategory ?? "").trim().toLowerCase();
  if (!k2) return void 0;
  const hit = Object.keys(DEFAULT_BONE).find((s) => s.toLowerCase() === k2);
  return hit ? DEFAULT_BONE[hit] : void 0;
}

// src/lib/ie/losses.ts
var isChangeover = (o) => /change\s*-?\s*over/i.test(o.category ?? "");
function inWindow(obs, from, to, workspaceId) {
  return obs.filter((o) => o.deletedAt == null && (!workspaceId || o.workspaceId === workspaceId) && o.startedAt >= from && o.startedAt < to);
}
var stopsOf = (o) => Math.max(1, o.count || 1);
var minsOf = (o) => o.durationMs > 0 ? o.durationMs / 6e4 : 0;
var whole = (n2) => Math.round(n2);
function paceWords(c, product) {
  if (c?.rateFrom === "plate") return `plate speed of the ${c.rateMachine ?? "machine that sets the pace"}`;
  if (c?.rateFrom === "standard-time") return c.rateTimed ? `${c.ratePerson ?? "the pace-setter"}’s timed pace` : `standard time of ${c.ratePerson ?? "the pace-setter"} (the line balance)`;
  if (c?.rateFrom === "standard") return `the line standard’s target${product ? ` for ${product}` : ""} — not a plate speed`;
  return "typed";
}
function rateKnown(c, product) {
  const w = paceWords(c, product);
  return c?.rateFrom === "plate" || c?.rateFrom === "standard-time" && !c.rateTimed ? `the rate is the ${w}` : `the rate is ${w}`;
}
var idealWord = (c) => c?.rateFrom === "plate" ? "plate speed" : c?.rateFrom === "standard-time" ? "standard-time pace" : "rate";
function plannedOf(c) {
  const windowMin = whole((c.to - c.from) / 6e4);
  const breakMin = c.relief ? 0 : Math.max(0, c.breakMin ?? 0);
  const workedOut = Math.max(0, windowMin - breakMin);
  const planned = c.plannedMin !== void 0 && c.plannedMin > 0 ? c.plannedMin : void 0;
  const changed = planned !== void 0 && whole(planned) !== workedOut;
  const span2 = c.shift ? "shift" : "window";
  const head = c.relief ? `${windowMin} min ${span2}, relief covers the breaks` : breakMin > 0 ? `${windowMin} min ${span2} − ${breakMin} min of breaks` : c.breakMin === 0 ? `${windowMin} min ${span2}, no planned breaks` : `${windowMin} min ${span2}, no breaks set`;
  const words = changed ? `${head} = ${workedOut}; ${whole(planned)} planned for the day — ${c.plannedWhy?.trim() || "no reason given"}` : `${head} = ${workedOut} planned`;
  return { windowMin, breakMin, workedOut, ...planned !== void 0 ? { planned } : {}, changed, words };
}
function runningOf2(timings) {
  const live3 = (timings ?? []).filter((x) => !x.struck && x.sec > 0 && x.packs >= 0);
  if (!live3.length) return void 0;
  const min = live3.reduce((n2, x) => n2 + x.sec, 0) / 60;
  const packsN = live3.reduce((n2, x) => n2 + x.packs, 0);
  return { perMin: packsN / min, n: live3.length, min };
}
function contributionOf(c) {
  if (!c) return void 0;
  if (c.pricePerPack !== void 0 && c.materialsPerPack !== void 0 && c.pricePerPack > c.materialsPerPack && c.materialsPerPack >= 0) return { perPack: c.pricePerPack - c.materialsPerPack, from: "price" };
  if (c.marginPerPack !== void 0 && c.marginPerPack > 0) return { perPack: c.marginPerPack, from: "margin" };
  return void 0;
}
function boneOf(rows) {
  const weigh = (of) => {
    const w = /* @__PURE__ */ new Map();
    for (const o of rows) {
      const m = of(o);
      if (m) w.set(m, (w.get(m) ?? 0) + Math.max(1, minsOf(o)));
    }
    return [...w.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };
  return weigh((o) => o.causeM) ?? weigh((o) => boneOfStop(o.category, o.subcategory, o.note)) ?? "machine";
}
function assetOf(rows) {
  const w = /* @__PURE__ */ new Map();
  for (const o of rows) {
    const a = (o.asset ?? "").trim();
    if (a) w.set(a, (w.get(a) ?? 0) + Math.max(1, minsOf(o)));
  }
  return [...w.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}
var gradeOf = (rows) => rows.every((o) => o.timing === "stopwatch") ? "measured" : "typed";
var REST_TENTH = 0.1;
function lossFigures(count, obs, cost, timings) {
  const planned = count?.plannedMin !== void 0 && count.plannedMin > 0 ? count.plannedMin : void 0;
  const rate = count?.ratePerMin !== void 0 && count.ratePerMin > 0 ? count.ratePerMin : void 0;
  const made = count?.made !== void 0 && count.made >= 0 ? count.made : void 0;
  const rejects = count?.rejects !== void 0 && count.rejects > 0 ? count.rejects : 0;
  const missing = [...planned === void 0 ? ["the planned minutes"] : [], ...made === void 0 ? ["the packs made"] : [], ...rate === void 0 ? ["the rate a minute"] : []];
  const perHour = cost ? labourPerHour(cost) : 0;
  const contrib = contributionOf(cost);
  const money = (min) => ({
    ...perHour > 0 ? { labour: min / 60 * perHour } : {},
    ...contrib && rate !== void 0 ? { contribution: min * rate * contrib.perPack } : {}
  });
  const rows = obs && count ? inWindow(obs, count.from, count.to) : [];
  const groups = /* @__PURE__ */ new Map();
  const co = [];
  for (const o of rows) {
    if (isChangeover(o)) {
      co.push(o);
      continue;
    }
    const k2 = (o.category || "Uncategorised").trim();
    groups.set(k2, [...groups.get(k2) ?? [], o]);
  }
  const sum = (xs, f) => xs.reduce((n2, o) => n2 + f(o), 0);
  const byCause = [...groups.entries()].map(([label, g]) => {
    const min = sum(g, minsOf), asset = assetOf(g);
    return { key: `cause:${label}`, kind: "cause", label, min, stops: sum(g, stopsOf), ...asset ? { asset } : {}, bone: boneOf(g), grade: gradeOf(g), ...money(min) };
  }).sort((a, b) => b.min - a.min || (b.stops ?? 0) - (a.stops ?? 0) || a.label.localeCompare(b.label));
  const stopsMin = byCause.reduce((n2, b) => n2 + b.min, 0);
  const changeoverMin = sum(co, minsOf), changeoverN = sum(co, stopsOf);
  const running = runningOf2(timings);
  const base = {
    enough: !missing.length,
    missing,
    ...planned !== void 0 ? { plannedMin: planned } : {},
    ...rate !== void 0 ? { rate } : {},
    ...made !== void 0 ? { made } : {},
    rejects,
    split: !!obs,
    logged: rows.length,
    stopsN: sum(rows.filter((o) => !isChangeover(o)), stopsOf),
    stopsMin,
    byCause,
    changeoverMin,
    changeoverN,
    explainedMin: 0,
    ...running ? { running } : {},
    ideal: idealWord(count),
    ...perHour > 0 ? { labourPerHour: perHour } : {},
    ...contrib ? { contributionPerPack: contrib.perPack, contributionFrom: contrib.from } : {},
    bars: []
  };
  if (planned === void 0 || rate === void 0 || made === void 0) return base;
  const expected = planned * rate;
  const shortPacks = Math.max(0, expected - made);
  const overPacks = Math.max(0, made - expected);
  const lostMin = shortPacks / rate;
  const rejectsMin = rejects / rate;
  const explained = stopsMin + changeoverMin + rejectsMin;
  const rest = Math.max(0, lostMin - explained);
  const excess = Math.max(0, explained - lostMin);
  const runMin = Math.max(0, planned - stopsMin - changeoverMin);
  const slowBone = count?.rateFrom === "standard-time" ? "people" : "machine";
  const through = made + rejects;
  const timedRun = running && running.perMin > 0 ? running : void 0;
  const netMin = timedRun ? through / timedRun.perMin : void 0;
  const slowRaw = timedRun && netMin !== void 0 ? timedRun.perMin < rate ? netMin - through / rate : 0 : void 0;
  const slow = obs && slowRaw !== void 0 ? Math.min(slowRaw, rest) : void 0;
  const short = slow !== void 0 ? rest - slow : void 0;
  const tenth = (min) => lostMin > 0 && min / lostMin > REST_TENTH && min > 0.5;
  const restBars = !obs ? [] : slow !== void 0 && short !== void 0 ? [
    ...slow > 0.5 ? [{ key: "slow", kind: "slow", label: "Slow running", min: slow, bone: slowBone, grade: "measured", ...tenth(slow) ? { abnormal: true } : {}, ...money(slow) }] : [],
    ...short > 0.5 ? [{ key: "short", kind: "short", label: "Short stops", min: short, bone: "machine", grade: "none", ...tenth(short) ? { abnormal: true } : {}, ...money(short) }] : []
  ] : rest > 0.5 ? [{ key: "performance", kind: "performance", label: "Slow running and short stops", min: rest, bone: "machine", grade: "none", ...tenth(rest) ? { abnormal: true } : {}, ...money(rest) }] : [];
  const bars = [
    ...byCause.filter((b) => b.min > 0 || (b.stops ?? 0) > 0),
    ...changeoverN > 0 ? [{ key: "changeover", kind: "changeover", label: "Changeovers", min: changeoverMin, stops: changeoverN, ...assetOf(co) ? { asset: assetOf(co) } : {}, bone: boneOf(co), grade: gradeOf(co), ...money(changeoverMin) }] : [],
    ...rejects > 0 ? [{ key: "rejects", kind: "rejects", label: "Rejects", min: rejectsMin, packs: rejects, bone: boneOfStop("Quality"), grade: "counted", ...money(rejectsMin) }] : [],
    ...restBars
  ];
  const total = money(lostMin);
  return {
    ...base,
    expected,
    shortPacks,
    ...overPacks > 0 ? { overPacks } : {},
    lostMin,
    rejectsMin,
    explainedMin: explained,
    ...obs ? { runMin, performanceMin: rest, ...excess > 0 ? { excessMin: excess } : {}, ...lostMin > 0 ? { performanceShare: rest / lostMin } : {} } : {},
    ...obs && netMin !== void 0 ? { netMin } : {},
    ...slow !== void 0 && short !== void 0 ? { slowMin: slow, shortMin: short, slowRawMin: slowRaw } : {},
    ...timedRun && timedRun.perMin > rate ? { abovePlate: true } : {},
    ...total.labour !== void 0 ? { labour: total.labour } : {},
    ...total.contribution !== void 0 ? { contribution: total.contribution } : {},
    bars
  };
}
var rateWords = (r) => `${Number.isInteger(r) ? r : r.toFixed(1)} a minute`;
var packs = (n2) => whole(n2).toLocaleString("en-GB");
var gbp = (n2) => `£${whole(n2).toLocaleString("en-GB")}`;
var gbp2 = (n2) => `£${n2.toFixed(2)}`;
var minWords = (m) => `${whole(m)} min`;
var num2 = (n2) => String(Number(n2.toFixed(1)));
function moneyWords(labour, contribution) {
  return [...labour !== void 0 ? [`${gbp(labour)} idle labour`] : [], ...contribution !== void 0 ? [`${gbp(contribution)} lost contribution if it cannot be made up`] : []].join(" · ");
}
var shiftWords = (c) => c?.shift?.trim() || (c?.from !== void 0 && c.to !== void 0 ? `The ${windowWords({ from: c.from, to: c.to })} shift` : "The shift");
var windowWords = (c) => {
  const hm = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${hm(c.from)}–${hm(c.to)}`;
};
function splitWords(f) {
  const r = f.running, rate = f.rate;
  if (!r || rate === void 0 || f.slowMin === void 0 || f.shortMin === void 0) return void 0;
  const timed = `Running speed timed at ${rateWords(r.perMin)} over ${r.n} timing${r.n === 1 ? "" : "s"} (${num2(r.min)} min)`;
  if (f.abovePlate) return `${timed}, above the ${f.ideal} of ${rateWords(rate)} — no slow running; check the ${f.ideal} or the timing.`;
  const raw = f.slowRawMin ?? 0;
  const through = packs((f.made ?? 0) + f.rejects);
  const sum = `slow running = ${through} packs run ÷ ${num2(r.perMin)} − ${through} ÷ ${num2(rate)} = ${minWords(raw)}`;
  if (raw > (f.performanceMin ?? 0) + 0.5) return `${timed}: ${sum} — more than the ${minWords(f.performanceMin ?? 0)} the count leaves; time it again, or check the counts.`;
  return `${timed}: ${sum}; short stops = ${minWords(f.runMin ?? 0)} run − ${through} ÷ ${num2(r.perMin)} = ${minWords(f.shortMin)}.`;
}
function lossSays(f, c, o = {}) {
  const who = shiftWords(c);
  if (!f.enough) {
    return { text: `Count the shift: ${f.missing.join(", ")} still to put in — then the waterfall draws itself from the stops already timed.`, tone: "n", verdict: "Not yet counted", lines: [] };
  }
  const lost = f.lostMin ?? 0, rate = f.rate ?? 0;
  const head = `${who} should have made ${packs(f.expected ?? 0)} at ${rateWords(rate)}; made ${packs(f.made ?? 0)}`;
  const pounds = moneyWords(f.labour, f.contribution);
  const lines = [];
  const known = [];
  if (c) known.push(plannedOf(c).words);
  known.push("the packs made and the rejects counted");
  known.push(rateKnown(c, o.product));
  if (f.split) known.push(f.logged ? `${f.logged} stop${f.logged === 1 ? "" : "s"} timed in Capture in the window` : "no stops logged in the window");
  if (f.labourPerHour !== void 0) known.push(`idle labour ${gbp2(f.labourPerHour)} an hour (crew × wage × on-costs)`);
  if (f.contributionPerPack !== void 0) known.push(`contribution ${gbp2(f.contributionPerPack)} a pack (${f.contributionFrom === "price" ? "price less materials" : "the line’s margin"})`);
  const howKnown = { text: `How known: ${known.join(" · ")}.`, tone: "n" };
  if (f.overPacks && f.overPacks > 0) {
    lines.push({ text: `Made ${packs(f.overPacks)} more than expected at ${rateWords(rate)} — check the rate or the count.`, tone: "a" });
    lines.push(howKnown);
    return { text: `${head} — nothing lost against the rate.`, tone: "a", verdict: "Nothing lost", lines };
  }
  if (!f.split) {
    lines.push(howKnown);
    return { text: `${head} — ${minWords(lost)} lost.${pounds ? ` ${pounds}.` : ""} Where it went is read from the line's stops in the window.`, tone: "n", verdict: `${minWords(lost)} lost`, lines };
  }
  const rest = f.performanceMin ?? 0;
  const none = "no slow running or short stops left over";
  const restParts = f.excessMin && f.excessMin > 0 ? [] : f.slowMin !== void 0 && f.shortMin !== void 0 ? f.slowMin > 0.5 || f.shortMin > 0.5 ? [...f.slowMin > 0.5 ? [`${minWords(f.slowMin)} of slow running`] : [], ...f.shortMin > 0.5 ? [`${minWords(f.shortMin)} of short stops`] : []] : [none] : [rest > 0.5 ? `${minWords(rest)} of slow running and short stops` : none];
  const parts = [
    `${minWords(f.stopsMin)} of stops`,
    ...f.changeoverN > 0 ? [`${minWords(f.changeoverMin)} of changeovers`] : [],
    f.rejects > 0 ? `${minWords(f.rejectsMin ?? 0)} of rejects (${packs(f.rejects)} packs)` : "no rejects",
    ...restParts
  ];
  const text = `${head} — ${minWords(lost)} lost: ${parts.join(" · ")}.${pounds ? ` ${pounds}.` : ""}`;
  if (f.excessMin && f.excessMin > 0.5) lines.push({ text: `Stops logged exceed the loss by ${minWords(f.excessMin)} — check the counts.`, tone: "a" });
  if (lost > 0 && !f.logged) lines.push({ text: "No stops logged in the window — the Pareto is empty for this shift.", tone: "n" });
  const split = splitWords(f);
  if (split) lines.push({ text: split, tone: f.abovePlate || (f.slowRawMin ?? 0) > rest + 0.5 ? "a" : "n" });
  else if (rest > 0.5) lines.push({ text: `Slow running and short stops is the rest: running below the ${f.ideal}, and stops too short to log — not yet told apart. Time the running speed while it runs to split them.`, tone: "n" });
  lines.push(howKnown);
  const flagged = f.bars.filter((b) => b.abnormal).sort((a, b) => b.min - a.min)[0];
  const tone = flagged || (f.excessMin ?? 0) > 0.5 ? "a" : "n";
  const verdict = lost <= 0 ? "Nothing lost" : flagged ? `${minWords(flagged.min)} ${flagged.label.toLowerCase()}` : `${minWords(lost)} lost`;
  return { text, tone, verdict, lines };
}

// src/lib/video/study.ts
function stats(xs) {
  if (!xs.length) return void 0;
  const s = [...xs].sort((a, b) => a - b);
  const n2 = s.length, mean3 = s.reduce((t, x) => t + x, 0) / n2;
  const median2 = n2 % 2 ? s[(n2 - 1) / 2] : (s[n2 / 2 - 1] + s[n2 / 2]) / 2;
  const sd3 = n2 >= 3 ? Math.sqrt(s.reduce((t, x) => t + (x - mean3) ** 2, 0) / (n2 - 1)) : void 0;
  return { n: n2, mean: mean3, median: median2, min: s[0], max: s[n2 - 1], range: s[n2 - 1] - s[0], ...sd3 !== void 0 ? { sd: sd3, cv: mean3 > 0 ? sd3 / mean3 : void 0, ci95: t95(n2 - 1) * sd3 / Math.sqrt(n2) } : {} };
}
function counted2(events, basis) {
  return events.filter((e) => e.review === "accepted" || basis === "provisional" && e.review === "candidate");
}
var EDGE = 0.25;
function stationFigures(zone, events, basis, durationSec, sampleSec = 0.2) {
  const mine = events.filter((e) => e.zone === zone.id);
  const work = counted2(mine, basis).filter((e) => e.category === "work" || e.category === "cycle").sort((a, b) => a.start - b.start);
  const edge = Math.max(EDGE, sampleSec * 1.5);
  const isPartial = (e) => e.start <= edge || e.end >= durationSec - edge;
  const partial = work.filter(isPartial);
  const whole2 = work.filter((e) => !isPartial(e));
  const workTime = stats(whole2.map((e) => e.end - e.start));
  const waits = [];
  for (let i = 1; i < work.length; i++) {
    const a = work[i - 1], b = work[i];
    if (b.start > a.end) waits.push({ zone: zone.id, start: a.end, end: b.start, sec: b.start - a.end });
  }
  const cyc = work.slice(1).map((b, i) => ({ a: work[i], b })).filter(({ a }) => a.start > edge).map(({ a, b }) => ({ after: a, sec: b.start - a.start }));
  const cycleTime = stats(cyc.map((c) => c.sec));
  const long = cycleTime && cycleTime.n >= 3 ? cyc.filter((c) => c.sec > 1.5 * cycleTime.median) : [];
  const waitTime = stats(waits.map((w) => w.sec));
  const ends = Math.max(sampleSec / 2, ...work.map((e) => e.pm ?? sampleSec / 2));
  const needed = workTime ? Math.max(MIN_CYCLES, workTime.sd !== void 0 ? cyclesNeeded(workTime.mean, workTime.sd, workTime.n) : MIN_CYCLES) : void 0;
  return {
    zone,
    work,
    partial,
    ...workTime ? { workTime } : {},
    ...cycleTime ? { cycleTime } : {},
    waits,
    ...waitTime ? { waitTime } : {},
    long,
    ...workTime && cycleTime && cycleTime.mean > 0 ? { utilisation: Math.min(1, workTime.mean / cycleTime.mean) } : {},
    candidates: mine.filter((e) => e.review === "candidate").length,
    pm: Math.round(Math.SQRT2 * ends * 100) / 100,
    ...needed !== void 0 ? { needed } : {},
    enough: !!workTime && needed !== void 0 && workTime.n >= needed,
    flagged: work.filter((e) => e.flags?.length).length
  };
}
function taktOf(d) {
  if (!d || !(d.units > 0) || !(d.availableMin > 0)) return void 0;
  return d.availableMin * 60 / d.units;
}
function stepsFromEvents(zones, events, basis, durationSec, sampleSec = 0.2) {
  const out = [];
  zones.forEach((z, i) => {
    const f = stationFigures(z, events, basis, durationSec, sampleSec);
    const who = z.track.trim() || z.label;
    const whole2 = f.work.filter((e) => !f.partial.includes(e));
    out.push({
      id: `v-${z.id}-work`,
      order: i * 2,
      name: `Work at ${z.label}`,
      who,
      kind: "work",
      laps: whole2.map((e) => ({ id: e.id, sec: round(e.end - e.start), at: Math.round(e.start * 1e3) }))
    });
    const usual = f.waits.filter((w) => !f.long.some((l) => Math.abs(l.after.end - w.start) < 1e-6));
    if (usual.length) out.push({
      id: `v-${z.id}-wait`,
      order: i * 2 + 1,
      name: `No movement at ${z.label}`,
      who,
      kind: "wait",
      laps: usual.map((w, k2) => ({ id: `${z.id}-w${k2 + 1}`, sec: round(w.sec), at: Math.round(w.start * 1e3) }))
    });
  });
  return out;
}
var round = (n2) => Math.round(n2 * 1e3) / 1e3;

// src/lib/ie/balanceLink.ts
var studyBalance = (s) => {
  const v = s.facts.video;
  if (v) {
    const takt = s.agreed?.balance ?? (taktOf(v.demand) ? { taktSec: taktOf(v.demand) } : void 0);
    return balance(stepsFromEvents(v.job.config.zones, s.facts.vevents ?? [], "verified", v.facts.durationSec, v.job.config.sampleSec), takt, s.facts.crew);
  }
  return balance(s.facts.steps, s.agreed?.balance, s.facts.crew);
};

// src/lib/studyLinks.ts
function lossFiguresOf(s, ctx) {
  const c = s.facts.losses;
  const obs = ctx?.observations && c ? inWindow(ctx.observations, c.from, c.to, s.workspaceId) : void 0;
  return lossFigures(c, obs, ctx?.workspaces?.find((w) => w.id === s.workspaceId), s.facts.timings);
}
function studySays(s, ctx) {
  if (s.tool === "balance") return balanceLine(studyBalance(s));
  if (s.tool === "map") {
    const f = flowFigures(s.facts.flow, s.agreed?.map);
    return { text: flowSays(f, s.agreed?.map).text, tone: "n", verdict: f.steps ? `Lead time ${f.untimed ? "at least " : ""}${dur(f.leadSec)}` : "No steps yet" };
  }
  if (s.tool === "changeover") {
    const f = figuresOf(s.facts);
    const said = changeoverSays(f);
    const l = ladderOf(s.facts.sequence);
    const iv = intervalOf(f, s.facts.products, availableOf(s.facts)?.min);
    return { text: [said.text, l.planned ? ladderSays(l).text : "", iv.ready ? intervalSays(iv, f).text : ""].filter(Boolean).join(" "), tone: said.tone, verdict: said.verdict };
  }
  if (s.tool === "sampling") return samplingSays(s.agreed?.sampling, s.facts.taps ?? []);
  if (s.tool === "losses") {
    const said = lossSays(lossFiguresOf(s, ctx), s.facts.losses, { ...s.product ? { product: s.product } : {} });
    return { text: said.text, tone: said.tone, verdict: said.verdict };
  }
  const a = s.agreed?.readings;
  return sampleSays(sample(a, s.facts.readings ?? []), a);
}
var TOOL_NAME = { capability: "Capability study", balance: "Line balance", map: "Value stream map", changeover: "SMED", sampling: "Work sampling", losses: "Loss count" };
var studyTitle = (s) => `${TOOL_NAME[s.tool] ?? "Study"} — ${s.name}${s.machine ? ` · ${s.machine}` : ""}`;
function studyHref(s) {
  if (s.facts?.video) return `/video/${s.id}`;
  if (s.tool === "balance" && s.standardId) {
    const at = `?at=work&study=${encodeURIComponent(s.id)}`;
    if (s.projectId) return `/project/${s.projectId}/standard/${s.standardId}${at}`;
    if (s.workspaceId) return `/w/${s.workspaceId}/standards/${s.standardId}${at}`;
  }
  if (s.tool === "map") return `/value-stream/${s.id}`;
  if (s.tool === "changeover") return `/smed/${s.id}`;
  return `/${s.tool}/${s.id}`;
}

// src/lib/standard.ts
function peopleOf(s) {
  return s.marks.filter((m) => m.kind === "person");
}
function headcount(s) {
  return peopleOf(s).length;
}

// src/lib/flow/toolRead.ts
var round2 = (n2, dp = 2) => Math.round(n2 * 10 ** dp) / 10 ** dp;
var put = (out, k2, v, dp = 2) => {
  if (typeof v === "number" && Number.isFinite(v)) out[k2] = round2(v, dp);
};
function toolFigures(s, ctx) {
  const figures = {};
  switch (s.tool) {
    case "capability": {
      const f = sample(s.agreed?.readings, s.facts.readings ?? []);
      put(figures, "cpk", f.cpk);
      put(figures, "ppk", f.ppk);
      put(figures, "mean", f.mean, 3);
      return { enough: f.enough, figures };
    }
    case "losses": {
      const f = lossFiguresOf(s, ctx);
      put(figures, "lost_minutes", f.lostMin, 1);
      put(figures, "packs_made", f.made, 0);
      put(figures, "packs_short", f.shortPacks, 0);
      put(figures, "rejects", f.rejects, 0);
      return { enough: f.enough, figures };
    }
    case "changeover": {
      const f = figuresOf(s.facts);
      if (f.enough) {
        put(figures, "changeover_minutes", f.nowSec / 60, 1);
        put(figures, "internal_minutes", f.internalSec / 60, 1);
        put(figures, "external_minutes", f.externalSec / 60, 1);
      }
      return { enough: f.enough, figures };
    }
    case "balance": {
      const f = studyBalance(s);
      put(figures, "balance_efficiency", f.efficiency !== void 0 ? f.efficiency * 100 : void 0, 1);
      put(figures, "people_needed", f.fewest, 0);
      put(figures, "longest_stack", f.constraint?.work, 1);
      return { enough: f.elements.length > 0 && !f.untimed, figures };
    }
    case "sampling": {
      const a = s.agreed?.sampling;
      const taps = tapsOf(s.facts.taps ?? []);
      const work = (a?.activities ?? DEFAULT_ACTIVITIES)[0];
      const share2 = shares(taps, a?.activities ?? DEFAULT_ACTIVITIES).find((x) => x.activity === work)?.share;
      put(figures, "taps", taps.length, 0);
      if (taps.length) put(figures, "share_working", share2 !== void 0 ? share2 * 100 : void 0, 1);
      return { enough: samplingEnough(taps.length) === "enough", figures };
    }
    case "map": {
      const f = flowFigures(s.facts.flow, s.agreed?.map);
      if (f.steps) {
        put(figures, "lead_time_minutes", f.leadSec / 60, 1);
        put(figures, "value_added_share", f.pce !== void 0 ? f.pce * 100 : void 0, 1);
      }
      return { enough: f.steps > 0 && !f.untimed, figures };
    }
    default:
      return { enough: false, figures };
  }
}
function readTool(s, ctx) {
  const { enough, figures } = toolFigures(s, ctx);
  const said = studySays(s, ctx);
  return { tool: s.tool, name: studyTitle(s), says: said.text, ...said.verdict ? { verdict: said.verdict } : {}, enough, figures, href: studyHref(s) };
}
function capacityFigures(std, line) {
  const figures = {};
  const cap2 = std.capacity;
  if (!cap2?.stations.length) return { enough: false, figures, says: "No stations yet — the line’s stations for this product are still to write", short: false };
  const r = analyse(cap2);
  put(figures, "line_rate", r.line, 1);
  put(figures, "good_rate", r.goodOut, 1);
  if (r.target != null && r.gap != null) put(figures, "short_of_target", Math.max(0, r.gap), 1);
  const li = labourInputs(cap2, headcount(std), line);
  const lc = labourCost(r, li.people, li.rate);
  if (lc) put(figures, "labour_per_pack", lc.perPack * 100, 2);
  return { enough: r.line != null && r.line > 0, figures, says: r.sentence, short: (r.gap ?? 0) > 1e-9 };
}
function readCapacity(std, line) {
  const f = capacityFigures(std, line);
  const href = `${std.workspaceId ? `/w/${std.workspaceId}/standards/${std.id}` : `/project/${std.projectId}/standard/${std.id}`}?at=balance`;
  const verdict = !f.enough ? "Speeds still to fill in" : f.short ? "Short of its target" : std.capacity?.targetPerMin != null ? "Meets its target" : void 0;
  return { tool: "capacity", name: `Line capacity — ${std.product}${line ? ` on ${line.name}` : ""}`, says: f.says, ...verdict ? { verdict } : {}, enough: f.enough, figures: f.figures, href };
}
function readToolsFrom(ids, rows) {
  const want = new Set(ids.filter(Boolean));
  const out = {};
  const workspaces = [...rows.workspaces ?? []];
  const observations = [...rows.observations ?? []];
  for (const st of rows.studies) if (want.has(st.id) && !st.deletedAt) out[st.id] = readTool(st, { observations, workspaces });
  for (const sd3 of rows.standards ?? []) {
    if (!want.has(sd3.id) || out[sd3.id] || sd3.deletedAt) continue;
    out[sd3.id] = readCapacity(sd3, workspaces.find((w) => w.id === sd3.workspaceId));
  }
  return out;
}

// src/lib/flow/components.ts
var COMPONENTS = [
  {
    id: "capability",
    name: "Capability study",
    gives: "Readings against limits, with Cp and Cpk and a verdict",
    studyTool: "capability",
    listPath: "/capability",
    figures: [{ key: "cpk", label: "Cpk", better: "higher" }, { key: "ppk", label: "Ppk", better: "higher" }, { key: "mean", label: "Mean", better: "higher" }]
  },
  {
    id: "losses",
    name: "A shift’s losses",
    gives: "Where a shift’s time went at the bottleneck’s speed, in packs and pounds",
    studyTool: "losses",
    listPath: "/losses",
    figures: [
      { key: "lost_minutes", label: "Lost minutes", unit: "min", better: "lower" },
      { key: "packs_made", label: "Packs made", unit: "packs", better: "higher" },
      { key: "packs_short", label: "Packs short", unit: "packs", better: "lower" },
      { key: "rejects", label: "Rejects", unit: "packs", better: "lower" }
    ]
  },
  {
    id: "changeover",
    name: "SMED",
    gives: "A changeover timed element by element, internal and external",
    studyTool: "changeover",
    listPath: "/smed",
    figures: [
      { key: "changeover_minutes", label: "Changeover minutes", unit: "min", better: "lower" },
      { key: "internal_minutes", label: "Internal minutes", unit: "min", better: "lower" },
      { key: "external_minutes", label: "External minutes", unit: "min", better: "lower" }
    ]
  },
  {
    id: "balance",
    name: "Line balance",
    gives: "People’s work timed against takt",
    studyTool: "balance",
    listPath: "/linebalance",
    alsoFrom: { label: "Read it from a video of the line", path: "/video" },
    figures: [
      { key: "balance_efficiency", label: "Balance efficiency", unit: "%", better: "higher" },
      { key: "people_needed", label: "People needed", unit: "people", better: "lower" },
      { key: "longest_stack", label: "Longest stack", unit: "s", better: "lower" }
    ]
  },
  {
    id: "sampling",
    name: "Work sampling",
    gives: "What people are doing at random moments, with margins",
    studyTool: "sampling",
    listPath: "/sampling",
    figures: [{ key: "share_working", label: "Share working", unit: "%", better: "higher" }, { key: "taps", label: "Moments sampled", better: "higher" }]
  },
  {
    id: "map",
    name: "Value stream map",
    gives: "The line’s steps, waits and value, walked",
    studyTool: "map",
    listPath: "/value-stream",
    figures: [{ key: "lead_time_minutes", label: "Lead time", unit: "min", better: "lower" }, { key: "value_added_share", label: "Value-added share", unit: "%", better: "higher" }]
  },
  /* Line capacity lives on a product's line standard, not as a study: a step
     using it is answered by that product's capacity, read by lib/capacity —
     the line's rate once stops count, the good out of the end, how far short
     of its target, and labour a pack from the one cost model (CLAUDE.md,
     Everything derives a cost). */
  {
    id: "capacity",
    name: "Line capacity",
    gives: "What each station can make, which one limits the line, and what a pack costs in labour",
    onStandard: true,
    listPath: "/balances",
    figures: [
      { key: "line_rate", label: "Line rate", unit: "a minute", better: "higher" },
      { key: "good_rate", label: "Good out", unit: "a minute", better: "higher" },
      { key: "short_of_target", label: "Short of target", unit: "a minute", better: "lower" },
      { key: "labour_per_pack", label: "Labour a pack", unit: "pence", better: "lower" }
    ]
  }
];
var answeredByRecord = (c) => !!c && (!!c.studyTool || !!c.onStandard);
var componentOf = (id) => COMPONENTS.find((c) => c.id === id);

// src/lib/flow/formula.ts
var FormulaError = class extends Error {
};
var MAX_LEN = 300;
function tokens(src) {
  if (src.length > MAX_LEN) throw new FormulaError("The formula is too long.");
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+(\.\d*)?|\.\d+)/.exec(src.slice(i));
      if (!m) throw new FormulaError(`"${c}" is not a number.`);
      out.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-z_]/i.test(c)) {
      const word = /^[a-z_][a-z0-9_]*/i.exec(src.slice(i))?.[0] ?? c;
      out.push({ t: "id", v: word.toLowerCase() });
      i += word.length;
      continue;
    }
    if ("+-*/()×÷".includes(c)) {
      out.push({ t: "op", v: c === "×" ? "*" : c === "÷" ? "/" : c });
      i++;
      continue;
    }
    throw new FormulaError(`"${c}" cannot be used in a formula — only numbers, field names, + − × ÷ and brackets.`);
  }
  return out;
}
function parseFormula(src) {
  const ts = tokens(src.trim());
  if (!ts.length) throw new FormulaError("The formula is empty.");
  let p = 0;
  const peek = () => ts[p];
  const isOp = (v) => {
    const t = peek();
    return t?.t === "op" && t.v === v;
  };
  const sum = () => {
    let e2 = product();
    while (isOp("+") || isOp("-")) {
      const op = ts[p++].v;
      e2 = { k: "bin", op, a: e2, b: product() };
    }
    return e2;
  };
  const product = () => {
    let e2 = unary();
    while (isOp("*") || isOp("/")) {
      const op = ts[p++].v;
      e2 = { k: "bin", op, a: e2, b: unary() };
    }
    return e2;
  };
  const unary = () => {
    if (isOp("-")) {
      p++;
      return { k: "neg", e: unary() };
    }
    if (isOp("+")) {
      p++;
      return unary();
    }
    return atom();
  };
  const atom = () => {
    const t = ts[p++];
    if (!t) throw new FormulaError("The formula stops too soon.");
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "id") return { k: "ref", name: t.v };
    if (t.v === "(") {
      const e2 = sum();
      if (!isOp(")")) throw new FormulaError("A bracket is not closed.");
      p++;
      return e2;
    }
    throw new FormulaError(`"${t.v}" is in the wrong place.`);
  };
  const e = sum();
  if (p < ts.length) throw new FormulaError(`"${ts[p].v}" is in the wrong place.`);
  return e;
}
function formulaRefs(e) {
  const out = /* @__PURE__ */ new Set();
  const walk = (x) => {
    if (x.k === "ref") out.add(x.name);
    else if (x.k === "neg") walk(x.e);
    else if (x.k === "bin") {
      walk(x.a);
      walk(x.b);
    }
  };
  walk(e);
  return [...out];
}
function evalFormula(e, values) {
  switch (e.k) {
    case "num":
      return e.v;
    case "ref": {
      const v = values[e.name];
      return typeof v === "number" && Number.isFinite(v) ? v : void 0;
    }
    case "neg": {
      const v = evalFormula(e.e, values);
      return v === void 0 ? void 0 : -v;
    }
    case "bin": {
      const a = evalFormula(e.a, values), b = evalFormula(e.b, values);
      if (a === void 0 || b === void 0) return void 0;
      if (e.op === "/" && b === 0) return void 0;
      const r = e.op === "+" ? a + b : e.op === "-" ? a - b : e.op === "*" ? a * b : a / b;
      return Number.isFinite(r) ? r : void 0;
    }
  }
}
function calc(src, values) {
  try {
    return evalFormula(parseFormula(src), values);
  } catch {
    return void 0;
  }
}

// src/lib/flow/analysis.ts
var ANALYSIS_BLOCKS = ["count", "sum", "mean", "median", "min", "max", "sd", "share", "perDay", "pareto", "trend", "histogram", "cpk", "control", "relation", "forecast", "calc", "reliability", "compare", "groups", "overdue", "drivers", "emark", "giveaway", "fill"];
var NUMERIC = /* @__PURE__ */ new Set(["number", "reading", "timer", "tally", "calc"]);
var filled = (v) => v !== void 0 && v !== null && !(typeof v === "string" && !v.trim());
function entryValues(columns, typed = {}) {
  const out = {};
  for (const f of columns) {
    if (f.type === "calc") continue;
    const v = typed[f.key];
    if (!filled(v)) continue;
    if (NUMERIC.has(f.type)) {
      const n2 = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n2)) out[f.key] = n2;
    } else out[f.key] = v;
  }
  for (let pass = 0; pass < 3; pass++) {
    for (const f of columns) {
      if (f.type !== "calc" || !f.formula || out[f.key] !== void 0) continue;
      const nums = {};
      for (const [k2, v] of Object.entries(out)) if (typeof v === "number") nums[k2] = v;
      const r = calc(f.formula, nums);
      if (r !== void 0) out[f.key] = r;
    }
  }
  return out;
}
var live = (entries) => entries.filter((e) => !e.struck);
var yesNo = (v) => typeof v === "boolean" ? v : typeof v === "string" ? /^(y|yes|true)$/i.test(v.trim()) ? true : /^(n|no|false)$/i.test(v.trim()) ? false : void 0 : void 0;
function meets(v, w) {
  if (v === void 0) return w.op === "!=";
  if (w.op === "=" || w.op === "!=") {
    const asBool = typeof v === "boolean" || typeof w.value === "boolean" ? [yesNo(v), yesNo(w.value)] : void 0;
    const same = asBool && asBool[0] !== void 0 && asBool[1] !== void 0 ? asBool[0] === asBool[1] : typeof w.value === "number" ? Number(v) === w.value : String(v).trim().toLowerCase() === String(w.value).trim().toLowerCase();
    return w.op === "=" ? same : !same;
  }
  const n2 = typeof v === "number" ? v : Number(v), t = Number(w.value);
  if (!Number.isFinite(n2) || !Number.isFinite(t)) return false;
  return w.op === ">=" ? n2 >= t : w.op === "<=" ? n2 <= t : w.op === ">" ? n2 > t : n2 < t;
}
function rowsOf(entries, a, columns, filter = true) {
  const rows = live(entries).map((e) => ({ e, v: entryValues(columns, e.values) }));
  const w = a.when;
  return filter && w ? rows.filter((r) => meets(r.v[w.column], w)) : rows;
}
var numbers = (rows, key) => key ? rows.map((r) => r.v[key]).filter((x) => typeof x === "number" && Number.isFinite(x)) : [];
var fmtNumber = (n2) => Math.abs(n2) >= 100 || Number.isInteger(n2) ? String(Math.round(n2 * 10) / 10) : String(Math.round(n2 * 100) / 100);
var col = (columns, key) => columns.find((c) => c.key === key);
var unitOf = (a, columns) => a.unit ?? col(columns, a.of)?.unit;
var numberSaid = (n2, unit) => unit === "£" ? `${n2 < 0 ? "−" : ""}£${Math.abs(n2).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${fmtNumber(n2)}${unit ? unit === "%" ? "%" : ` ${unit}` : ""}`;
var withUnit = numberSaid;
var many = (n2, one, more = `${one}s`) => `${n2} ${n2 === 1 ? one : more}`;
var whenSaid = (a, columns) => {
  const w = a.when;
  if (!w) return "";
  const c = col(columns, w.column), label = c?.label ?? w.column;
  const yn = (c?.type === "yesno" || typeof w.value === "boolean") && (w.op === "=" || w.op === "!=") ? yesNo(w.value) : void 0;
  if (yn !== void 0) return ` where ${label} is ${w.op === "!=" ? "not " : ""}${yn ? "yes" : "no"}`;
  return ` where ${label} ${w.op} ${String(w.value)}`;
};
var mean2 = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
var median = (xs) => {
  const s = [...xs].sort((p, q) => p - q), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
var sd2 = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean2(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};
function cpkOf(xs, lower, upper) {
  if (xs.length < 2 || lower === void 0 && upper === void 0) return void 0;
  let t = 0;
  for (let i = 1; i < xs.length; i++) t += Math.abs(xs[i] - xs[i - 1]);
  const s = t / (xs.length - 1) / 1.128;
  if (!(s > 0)) return void 0;
  const m = mean2(xs);
  return Math.min(lower !== void 0 ? (m - lower) / (3 * s) : Infinity, upper !== void 0 ? (upper - m) / (3 * s) : Infinity);
}
function dayTotals(rows, of) {
  const byDay = /* @__PURE__ */ new Map();
  for (const r of rows) byDay.set(r.e.on, (byDay.get(r.e.on) ?? 0) + (of ? typeof r.v[of] === "number" ? r.v[of] : 0 : 1));
  return [...byDay.entries()].sort((p, q) => p[0].localeCompare(q[0])).map(([label, value]) => ({ label, value }));
}
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var DAY2 = 864e5;
var daySaid = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : iso;
};
var dayNo = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY2);
};
var isoOf = (n2) => new Date(n2 * DAY2).toISOString().slice(0, 10);
function lineFit(xs, ys) {
  const n2 = Math.min(xs.length, ys.length);
  if (n2 < 2) return void 0;
  const mx = mean2(xs.slice(0, n2)), my = mean2(ys.slice(0, n2));
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n2; i++) {
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  if (!(sxx > 0)) return void 0;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, ...syy > 0 ? { r: sxy / Math.sqrt(sxx * syy) } : {} };
}
function controlOf(xs) {
  if (xs.length < 2) return void 0;
  let t = 0;
  for (let i = 1; i < xs.length; i++) t += Math.abs(xs[i] - xs[i - 1]);
  const mr = t / (xs.length - 1);
  if (!(mr > 0)) return void 0;
  const centre = mean2([...xs]), upper = centre + 2.66 * mr, lower = centre - 2.66 * mr;
  const flags = xs.map((x) => x > upper || x < lower ? "outside" : void 0);
  const outside = xs.map((x, i) => x > upper || x < lower ? i : -1).filter((i) => i >= 0);
  const runs = [];
  let from = 0;
  for (let i = 1; i <= xs.length; i++) {
    const side = (k2) => xs[k2] > centre ? 1 : xs[k2] < centre ? -1 : 0;
    if (i < xs.length && side(i) !== 0 && side(i) === side(from)) continue;
    const length = i - from;
    if (side(from) !== 0 && length >= 8) {
      runs.push({ from, length, above: side(from) > 0 });
      for (let k2 = from; k2 < i; k2++) flags[k2] = flags[k2] ?? "run";
    }
    from = i;
  }
  return { centre, upper, lower, flags, outside, runs };
}
var lowerFirst = (w) => /^[A-Z][a-z]/.test(w) ? w[0].toLowerCase() + w.slice(1) : w;
var perOne = (unit) => unit ? unit === "%" ? "1%" : `1 ${unit}` : "one";
var strength = (r) => {
  const a = Math.abs(r);
  return a >= 0.7 ? "a strong" : a >= 0.4 ? "a moderate" : a >= 0.2 ? "a weak" : "";
};
function gammaFn(z) {
  const c = [0.9999999999998099, 676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9984369578019572e-21, 15056327351493116e-23];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  const x = z - 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return Math.sqrt(2 * Math.PI) * t ** (x + 0.5) * Math.exp(-t) * a;
}
function lnGamma(z) {
  const c = [0.9999999999998099, 676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9984369578019572e-21, 15056327351493116e-23];
  if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lnGamma(1 - z);
  const x = z - 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function betaFraction(x, a, b) {
  const TINY = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const step = d * c;
    h *= step;
    if (Math.abs(step - 1) < 1e-15) break;
  }
  return h;
}
function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? front * betaFraction(x, a, b) / a : 1 - front * betaFraction(1 - x, b, a) / b;
}
var tTwoSided = (t, df) => Number.isFinite(t) ? incompleteBeta(df / (df + t * t), df / 2, 0.5) : 0;
function welch(before, after) {
  const nb = before.length, na = after.length;
  if (nb < 2 || na < 2) return void 0;
  const vb = sd2([...before]) ** 2 / nb, va = sd2([...after]) ** 2 / na;
  const diff = mean2([...after]) - mean2([...before]);
  const se = Math.sqrt(vb + va);
  if (!(se > 0)) return { diff, t: diff === 0 ? 0 : Math.sign(diff) * Infinity, df: nb + na - 2, p: diff === 0 ? 1 : 0 };
  const df = (vb + va) ** 2 / (vb ** 2 / (nb - 1) + va ** 2 / (na - 1));
  const t = diff / se;
  return { diff, t, df, p: tTwoSided(t, df) };
}
var fUpper = (f, d1, d2) => f <= 0 ? 1 : Number.isFinite(f) ? incompleteBeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2) : 0;
function oneWay(groups) {
  const gs = groups.filter((g) => g.length >= 2);
  const N = gs.reduce((t, g) => t + g.length, 0), k2 = gs.length;
  if (k2 < 2) return void 0;
  const grand = gs.reduce((t, g) => t + g.reduce((u2, x) => u2 + x, 0), 0) / N;
  let between = 0, within = 0;
  for (const g of gs) {
    const m = mean2([...g]);
    between += g.length * (m - grand) ** 2;
    for (const x of g) within += (x - m) ** 2;
  }
  const d1 = k2 - 1, d2 = N - k2;
  if (!(within > 0)) return { f: between > 0 ? Infinity : 0, d1, d2, p: between > 0 ? 0 : 1 };
  const f = between / d1 / (within / d2);
  return { f, d1, d2, p: fUpper(f, d1, d2) };
}
function leastSquares(xs, y) {
  const n2 = y.length, k2 = xs[0]?.length ?? 0, m = k2 + 1;
  if (n2 < k2 + 3 || xs.length !== n2) return void 0;
  const ybar = mean2([...y]);
  const sst = y.reduce((t2, v) => t2 + (v - ybar) ** 2, 0);
  if (!(sst > 0)) return void 0;
  const row = (i) => [1, ...xs[i]];
  const a = Array.from({ length: m }, () => new Array(m).fill(0));
  const b = new Array(m).fill(0);
  for (let i = 0; i < n2; i++) {
    const r = row(i);
    for (let p2 = 0; p2 < m; p2++) {
      b[p2] += r[p2] * y[i];
      for (let q = 0; q < m; q++) a[p2][q] += r[p2] * r[q];
    }
  }
  const inv = a.map((r, i) => [...r, ...Array.from({ length: m }, (_, j) => i === j ? 1 : 0)]);
  const scale = Math.max(...a.map((r, i) => Math.abs(r[i])), 1);
  for (let c = 0; c < m; c++) {
    let piv = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(inv[r][c]) > Math.abs(inv[piv][c])) piv = r;
    if (Math.abs(inv[piv][c]) < 1e-10 * scale) return "collinear";
    [inv[c], inv[piv]] = [inv[piv], inv[c]];
    const d = inv[c][c];
    for (let j = 0; j < 2 * m; j++) inv[c][j] /= d;
    for (let r = 0; r < m; r++) if (r !== c) {
      const f2 = inv[r][c];
      if (f2) for (let j = 0; j < 2 * m; j++) inv[r][j] -= f2 * inv[c][j];
    }
  }
  const ai = inv.map((r) => r.slice(m));
  const beta = ai.map((r) => r.reduce((t2, v, j) => t2 + v * b[j], 0));
  let sse = 0;
  for (let i = 0; i < n2; i++) {
    const r = row(i);
    sse += (y[i] - r.reduce((t2, v, j) => t2 + v * beta[j], 0)) ** 2;
  }
  if (sse < 1e-12 * sst) sse = 0;
  const df = n2 - m, s2 = sse / df;
  const se = ai.map((r, j) => Math.sqrt(Math.max(0, s2 * r[j])));
  const t = beta.map((v, j) => se[j] > 0 ? v / se[j] : v === 0 ? 0 : Math.sign(v) * Infinity);
  const p = t.map((v) => tTwoSided(v, df));
  const r2 = 1 - sse / sst;
  const f = sse > 0 ? (sst - sse) / k2 / (sse / df) : Infinity;
  return { beta, se, t, p, r2, f, fp: fUpper(f, k2, df), df };
}
function weibullFit(xs) {
  const v = xs.filter((x) => Number.isFinite(x) && x > 0);
  if (v.length < 3 || Math.max(...v) === Math.min(...v)) return void 0;
  const lx = v.map(Math.log), mlx = mean2(lx);
  const g = (b) => {
    let s0 = 0, s1 = 0;
    for (let i = 0; i < v.length; i++) {
      const p = v[i] ** b;
      s0 += p;
      s1 += p * lx[i];
    }
    return s1 / s0 - 1 / b - mlx;
  };
  let lo = 0.01, hi = 1;
  while (g(hi) < 0 && hi < 200) hi *= 2;
  if (g(hi) < 0 || g(lo) > 0) return void 0;
  for (let k2 = 0; k2 < 200 && hi - lo > 1e-10; k2++) {
    const m = (lo + hi) / 2;
    if (g(m) < 0) lo = m;
    else hi = m;
  }
  const shape = (lo + hi) / 2;
  const scale = (v.reduce((t, x) => t + x ** shape, 0) / v.length) ** (1 / shape);
  return { shape, scale };
}
var targetOf = (a, ctx) => typeof a.target === "number" ? a.target : a.targetFrom && typeof ctx?.boxes[a.targetFrom] === "number" ? ctx.boxes[a.targetFrom] : void 0;
var targetWhere = (a, ctx) => a.targetFrom ? ` — type it in “${ctx.labels[a.targetFrom] ?? a.targetFrom.replace(/_/g, " ")}”` : "";
function tneOf(nominal) {
  if (!(nominal >= 5 && nominal <= 5e4)) return void 0;
  const up = (x) => Math.ceil(x * 10 - 1e-9) / 10;
  if (nominal <= 50) return up(nominal * 0.09);
  if (nominal <= 100) return 4.5;
  if (nominal <= 200) return up(nominal * 0.045);
  if (nominal <= 300) return 9;
  if (nominal <= 500) return up(nominal * 0.03);
  if (nominal <= 1e3) return 15;
  if (nominal <= 1e4) return up(nominal * 0.015);
  if (nominal <= 15e3) return 150;
  return up(nominal * 0.01);
}
function normalBelow(z) {
  const x = -z / Math.SQRT2, a = Math.abs(x), t = 1 / (1 + 0.5 * a);
  const r = t * Math.exp(-a * a - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return 0.5 * (x >= 0 ? r : 2 - r);
}
var PACK_Z = { t1: 1.959964, t2: 3.719016, t1Share: 0.025, t2Share: 1e-4 };
function packRules(xs, nominal) {
  const tne = tneOf(nominal);
  if (tne === void 0 || xs.length < 2) return void 0;
  const t1 = Math.round((nominal - tne) * 10) / 10, t2 = Math.round((nominal - 2 * tne) * 10) / 10;
  const m = mean2([...xs]), s = sd2([...xs]);
  const under1 = xs.filter((x) => x < t1).length, under2 = xs.filter((x) => x < t2).length;
  const est1 = s > 0 ? normalBelow((t1 - m) / s) : m < t1 ? 1 : 0, est2 = s > 0 ? normalBelow((t2 - m) / s) : m < t2 ? 1 : 0;
  const rule1 = m >= nominal;
  const rule2 = est1 <= PACK_Z.t1Share && (xs.length < 40 || under1 / xs.length <= PACK_Z.t1Share);
  const rule3 = under2 === 0 && est2 <= PACK_Z.t2Share;
  const lowest = Math.max(nominal, t1 + PACK_Z.t1 * s, t2 + PACK_Z.t2 * s);
  const sets = lowest === nominal ? 1 : t1 + PACK_Z.t1 * s >= t2 + PACK_Z.t2 * s ? 2 : 3;
  return { tne, t1, t2, mean: m, sd: s, n: xs.length, under1, under2, est1, est2, rule1, rule2, rule3, broken: [rule1, rule2, rule3].filter((r) => !r).length, lowest, sets };
}
function stat(id, name, says, f, min = 1) {
  return {
    id,
    name,
    says,
    needs: { of: "required", by: "none", when: "optional", against: "none", target: "none" },
    numeric: true,
    output: "number",
    picture: "none",
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns), xs = numbers(rows, a.of), unit = unitOf(a, columns);
      const what = `${a.label}${whenSaid(a, columns)}`;
      if (xs.length < min) return { n: xs.length, ...unit ? { unit } : {}, says: `${what}: ${xs.length ? `needs ${min} entries — ${xs.length} so far` : "no entries yet"}.` };
      const value = f(xs);
      return { value, n: xs.length, ...unit ? { unit } : {}, says: `${what}: ${withUnit(value, unit)}, from ${many(xs.length, "entry", "entries")}.` };
    }
  };
}
var BLOCKS = {
  count: {
    id: "count",
    name: "Count",
    says: "How many entries — all, or those that meet a rule",
    needs: { of: "none", by: "none", when: "optional", against: "none", target: "none" },
    numeric: false,
    output: "number",
    picture: "none",
    compute: (entries, a, columns) => {
      const n2 = rowsOf(entries, a, columns).length;
      return { value: n2, n: n2, unit: a.unit ?? "entries", says: `${a.label}${whenSaid(a, columns)}: ${n2}.` };
    }
  },
  sum: stat("sum", "Total", "The total of a number column", (xs) => xs.reduce((s, x) => s + x, 0)),
  mean: stat("mean", "Average", "The average of a number column", mean2),
  median: stat("median", "Median", "The middle value of a number column — not pulled by one odd entry", median),
  min: stat("min", "Lowest", "The lowest value of a number column", (xs) => Math.min(...xs)),
  max: stat("max", "Highest", "The highest value of a number column", (xs) => Math.max(...xs)),
  sd: stat("sd", "Spread", "The standard deviation of a number column — how much it varies", sd2, 2),
  share: {
    id: "share",
    name: "Share",
    says: "The share of entries that meet a rule, as a percentage",
    needs: { of: "none", by: "none", when: "required", against: "none", target: "none" },
    numeric: false,
    output: "number",
    picture: "none",
    compute: (entries, a, columns) => {
      const all = rowsOf(entries, a, columns, false), hit = rowsOf(entries, a, columns);
      if (!all.length) return { n: 0, unit: "%", says: `${a.label}: no entries yet.` };
      const value = hit.length / all.length * 100;
      return { value, n: all.length, unit: "%", says: `${a.label}: ${withUnit(value, "%")} — ${hit.length} of ${many(all.length, "entry", "entries")}${whenSaid(a, columns)}.` };
    }
  },
  perDay: {
    id: "perDay",
    name: "A day",
    says: "The total of a number column (or the count) a day, averaged over the days logged",
    needs: { of: "optional", by: "none", when: "optional", against: "none", target: "none" },
    numeric: true,
    output: "number",
    picture: "none",
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns);
      const days2 = new Set(rows.map((r) => r.e.on));
      const unit = a.unit ?? (a.of ? `${col(columns, a.of)?.unit ?? ""} a day`.trim() : "a day");
      if (!days2.size) return { n: 0, unit, says: `${a.label}: no entries yet.` };
      const total = a.of ? numbers(rows, a.of).reduce((s, x) => s + x, 0) : rows.length;
      const value = total / days2.size;
      return { value, n: rows.length, unit, says: `${a.label}: ${withUnit(value, unit)}, over ${many(days2.size, "day")} logged.` };
    }
  },
  pareto: {
    id: "pareto",
    name: "Pareto",
    says: "Entries grouped by a column, biggest first, with the running share — the few that make most",
    needs: { of: "optional", by: "required", when: "optional", against: "none", target: "none" },
    numeric: true,
    output: "both",
    picture: "pareto",
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns);
      const groups = /* @__PURE__ */ new Map();
      for (const r of rows) {
        const g = a.by ? r.v[a.by] : void 0;
        if (!filled(g)) continue;
        const name = typeof g === "boolean" ? g ? "Yes" : "No" : String(g).trim();
        const add = a.of ? typeof r.v[a.of] === "number" ? r.v[a.of] : 0 : 1;
        groups.set(name, (groups.get(name) ?? 0) + add);
      }
      const total = [...groups.values()].reduce((s, x) => s + x, 0);
      const by = col(columns, a.by)?.label ?? a.by;
      const what = a.of ? (col(columns, a.of)?.label ?? a.of).toLowerCase() : "entries";
      if (!groups.size || total <= 0) return { n: rows.length, unit: "%", says: `${a.label}: nothing to rank yet.` };
      let run = 0;
      const series = [...groups.entries()].sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0])).map(([label, value2]) => {
        run += value2;
        return { label, value: value2, cum: run / total * 100 };
      });
      const top = series[0], few = series.findIndex((s) => (s.cum ?? 0) >= 80) + 1;
      const value = top.value / total * 100;
      return {
        value,
        n: rows.length,
        unit: "%",
        series,
        says: `${a.label}: ${top.label} is ${withUnit(value, "%")} of ${what}${series.length > 1 ? ` — ${few} of ${many(series.length, (by ?? "").toLowerCase() === "reason" ? "reason" : "group")} make 80%` : ""}.`
      };
    }
  },
  trend: {
    id: "trend",
    name: "Trend",
    says: "A number column totalled (or entries counted) day by day — is it moving?",
    needs: { of: "optional", by: "none", when: "optional", against: "none", target: "none" },
    numeric: true,
    output: "both",
    picture: "bars",
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns);
      const series = dayTotals(rows, a.of);
      const unit = unitOf(a, columns) ?? (a.of ? void 0 : "entries");
      if (!series.length) return { n: 0, ...unit ? { unit } : {}, says: `${a.label}: no entries yet.` };
      const last = series[series.length - 1], first = series[0];
      const moved = series.length < 2 ? "" : last.value === first.value ? " — no change from the first day" : ` — ${withUnit(Math.abs(last.value - first.value), unit)} ${last.value > first.value ? "up" : "down"} on the first day`;
      return { value: last.value, n: rows.length, ...unit ? { unit } : {}, series, says: `${a.label}: ${withUnit(last.value, unit)} on the latest day of ${many(series.length, "day")}${moved}.` };
    }
  },
  histogram: {
    id: "histogram",
    name: "Histogram",
    says: "How a number column is spread — the shape of the readings",
    needs: { of: "required", by: "none", when: "optional", against: "none", target: "none" },
    numeric: true,
    output: "series",
    picture: "bars",
    compute: (entries, a, columns) => {
      const xs = numbers(rowsOf(entries, a, columns), a.of), unit = unitOf(a, columns);
      if (xs.length < 2) return { n: xs.length, ...unit ? { unit } : {}, says: `${a.label}: needs 2 entries — ${xs.length} so far.` };
      const lo = Math.min(...xs), hi = Math.max(...xs);
      const k2 = Math.max(1, Math.min(12, Math.ceil(Math.log2(xs.length) + 1)));
      const w = hi > lo ? (hi - lo) / k2 : 1;
      const counts = Array.from({ length: k2 }, () => 0);
      for (const x of xs) counts[Math.min(k2 - 1, Math.floor((x - lo) / w))]++;
      const series = counts.map((value, i) => ({ label: `${fmtNumber(lo + i * w)}–${fmtNumber(lo + (i + 1) * w)}`, value }));
      return { n: xs.length, ...unit ? { unit } : {}, series, says: `${a.label}: ${many(xs.length, "reading")} from ${withUnit(lo, unit)} to ${withUnit(hi, unit)}.` };
    }
  },
  cpk: {
    id: "cpk",
    name: "Cpk",
    says: "How capable a number column is against its own limits (its column’s at least / at most)",
    needs: { of: "required", by: "none", when: "optional", against: "none", target: "none" },
    numeric: true,
    output: "number",
    picture: "none",
    compute: (entries, a, columns) => {
      const c = col(columns, a.of);
      const xs = numbers(rowsOf(entries, a, columns), a.of);
      if (!c || c.min === void 0 && c.max === void 0) return { n: xs.length, says: `${a.label}: its column has no limits to be judged against.` };
      const k2 = cpkOf(xs, c.min, c.max);
      if (k2 === void 0) return { n: xs.length, says: `${a.label}: needs readings that vary — ${many(xs.length, "reading")} so far.` };
      const word = k2 >= 1.33 ? "capable" : k2 >= 1 ? "just capable" : "not capable";
      return { value: k2, n: xs.length, says: `${a.label}: Cpk ${fmtNumber(k2)} — ${word}, from ${many(xs.length, "reading")}${xs.length < 25 ? " (fewer than 25: read it with care)" : ""}.` };
    }
  },
  control: {
    id: "control",
    name: "Control chart",
    says: "Each reading in the order taken, against limits set by its own variation — what is ordinary, and the signals worth finding the cause of (a reading outside the limits, 8 in a row on one side)",
    needs: { of: "required", by: "none", when: "optional", against: "none", target: "none" },
    numeric: true,
    output: "both",
    picture: "control",
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns).filter((r) => a.of !== void 0 && typeof r.v[a.of] === "number").sort((p, q) => p.e.on.localeCompare(q.e.on) || p.e.at - q.e.at);
      const xs = rows.map((r) => r.v[a.of]), unit = unitOf(a, columns);
      if (xs.length < 5) return { n: xs.length, unit: "signals", says: `${a.label}: needs 5 readings to set its limits — ${xs.length} so far.` };
      const c = controlOf(xs);
      if (!c) return { n: xs.length, unit: "signals", says: `${a.label}: every reading is the same — no variation to set limits from.` };
      const series = rows.map((r, i) => ({ label: r.e.on, value: xs[i], ...c.flags[i] ? { flag: c.flags[i] } : {} }));
      const signals = c.outside.length + c.runs.length;
      const limits = { centre: c.centre, upper: c.upper, lower: c.lower };
      const within = `${withUnit(c.lower, unit)} to ${withUnit(c.upper, unit)}, centre ${withUnit(c.centre, unit)}`;
      const few = xs.length < 20 ? " (fewer than 20 readings: the limits are provisional)" : "";
      if (!signals) return { value: 0, unit: "signals", n: xs.length, series, limits, says: `${a.label}: in control — ${many(xs.length, "reading")} within the limits ${within}${few}.` };
      const parts = [];
      for (const i of c.outside.slice(0, 2)) parts.push(`${withUnit(xs[i], unit)} on ${daySaid(rows[i].e.on)} ${xs[i] > c.upper ? "above the upper" : "below the lower"} limit`);
      if (c.outside.length > 2) parts.push(`${c.outside.length - 2} more outside the limits`);
      for (const r of c.runs.slice(0, 2)) parts.push(`${r.length} in a row ${r.above ? "above" : "below"} the centre from ${daySaid(rows[r.from].e.on)}`);
      if (c.runs.length > 2) parts.push(`${c.runs.length - 2} more runs`);
      return {
        value: signals,
        unit: signals === 1 ? "signal" : "signals",
        n: xs.length,
        series,
        limits,
        says: `${a.label}: ${many(signals, "signal")} — ${parts.join("; ")}; find what changed then. Limits ${within}${few}.`
      };
    }
  },
  relation: {
    id: "relation",
    name: "Relationship",
    says: "Whether one number column moves with another — how closely (r, from −1 to 1) and the line through the points; a link, not proof of a cause",
    needs: { of: "required", by: "none", when: "optional", against: "required", target: "none" },
    numeric: true,
    output: "both",
    picture: "scatter",
    compute: (entries, a, columns) => {
      const yk = a.of, xk = a.against;
      const rows = rowsOf(entries, a, columns).filter((r2) => yk !== void 0 && xk !== void 0 && typeof r2.v[yk] === "number" && typeof r2.v[xk] === "number");
      const ys = rows.map((r2) => r2.v[yk]), xs = rows.map((r2) => r2.v[xk]);
      const yc = col(columns, yk), xc = col(columns, xk);
      const yl = yc?.label ?? yk ?? "", xl = xc?.label ?? xk ?? "";
      if (rows.length < 3) return { n: rows.length, says: `${a.label}: needs 3 entries with both ${yl} and ${xl} — ${rows.length} so far.` };
      const fit = lineFit(xs, ys);
      const series = xs.map((x, i) => ({ label: fmtNumber(x), x, value: ys[i] }));
      if (!fit || fit.r === void 0) return { n: rows.length, series, says: `${a.label}: ${fit ? yl : xl} does not vary in these entries — nothing to relate.` };
      const r = fit.r, word = strength(r), few = rows.length < 10 ? " (fewer than 10: read it with care)" : "";
      if (!word) return { value: r, n: rows.length, series, fit: { slope: fit.slope, intercept: fit.intercept }, says: `${a.label}: no clear link between ${yl} and ${xl} — r = ${fmtNumber(r)}, from ${many(rows.length, "entry", "entries")}${few}.` };
      return {
        value: r,
        n: rows.length,
        series,
        fit: { slope: fit.slope, intercept: fit.intercept },
        says: `${a.label}: ${word} link — r = ${fmtNumber(r)}; ${yl} about ${withUnit(Math.abs(fit.slope), yc?.unit)} ${fit.slope > 0 ? "higher" : "lower"} for every ${perOne(xc?.unit)} more ${lowerFirst(xl)}, from ${many(rows.length, "entry", "entries")}${few}. A link is not proof of a cause — test it.`
      };
    }
  },
  forecast: {
    id: "forecast",
    name: "Forecast",
    says: "The figure a day (a column totalled, or the entries counted) with the straight line through it carried a week on — where it is heading, and the day it reaches a target",
    needs: { of: "optional", by: "none", when: "optional", against: "none", target: "optional" },
    numeric: true,
    output: "both",
    picture: "forecast",
    compute: (entries, a, columns, ctx) => {
      const series = dayTotals(rowsOf(entries, a, columns), a.of);
      const unit = unitOf(a, columns) ?? (a.of ? void 0 : "entries");
      const u2 = unit ? { unit } : {};
      const T0 = targetOf(a, ctx);
      const tgt = typeof T0 === "number" ? { target: T0 } : {};
      if (series.length < 3) return { n: series.length, ...u2, ...tgt, series, says: `${a.label}: needs 3 days logged to see where it is heading — ${many(series.length, "day")} so far.` };
      const d0 = dayNo(series[0].label), xs = series.map((p) => dayNo(p.label) - d0), ys = series.map((p) => p.value);
      const fit = lineFit(xs, ys);
      if (!fit) return { n: series.length, ...u2, ...tgt, series, says: `${a.label}: needs days apart to see where it is heading.` };
      const ahead = 7, last = xs[xs.length - 1];
      const floor = ys.every((y) => y >= 0) ? 0 : -Infinity;
      const at = (x) => Math.max(floor, fit.intercept + fit.slope * x);
      const now = at(last), then = at(last + ahead);
      const move = Math.abs(fit.slope) < 1e-9 ? "flat" : `${fit.slope > 0 ? "rising" : "falling"} ${withUnit(Math.abs(fit.slope), unit)} a day`;
      let toward = "";
      if (typeof T0 === "number") {
        const T = T0;
        if (Math.abs(fit.slope) < 1e-9) toward = now === T ? `; at the target of ${withUnit(T, unit)}` : `; it does not move towards ${withUnit(T, unit)}`;
        else {
          const xT = (T - fit.intercept) / fit.slope;
          toward = xT > last ? `; it reaches ${withUnit(T, unit)} on ${daySaid(isoOf(d0 + Math.ceil(xT - 1e-9)))} at this rate` : `; already past ${withUnit(T, unit)} on the line, and moving on`;
        }
      }
      const few = series.length < 7 ? " (fewer than 7 days: a rough guide)" : "";
      return {
        value: then,
        n: series.length,
        ...u2,
        ...tgt,
        series,
        ahead,
        fit: { slope: fit.slope, intercept: fit.intercept },
        says: `${a.label}: ${move} — ${withUnit(now, unit)} now on the line through ${many(series.length, "day")}, ${withUnit(then, unit)} a week on${toward}${few}.`
      };
    }
  },
  reliability: {
    id: "reliability",
    name: "Reliability",
    says: "How long it runs between failures, fitted as a Weibull curve — the mean time between, whether failures come early, at random or from wear, and the chance of one within a time (its target)",
    needs: { of: "required", by: "none", when: "optional", against: "none", target: "optional" },
    numeric: true,
    output: "both",
    picture: "curve",
    compute: (entries, a, columns) => {
      const xs = numbers(rowsOf(entries, a, columns), a.of).filter((x) => x > 0), unit = unitOf(a, columns);
      const u2 = unit ? { unit } : {};
      const what = `${a.label}${whenSaid(a, columns)}`;
      if (xs.length < 3) return { n: xs.length, ...u2, says: `${what}: needs 3 times between failures to fit — ${xs.length} so far.` };
      const w = weibullFit(xs);
      if (!w) return { n: xs.length, ...u2, says: `${what}: every time between is the same — nothing to fit.` };
      const mtbf = w.scale * gammaFn(1 + 1 / w.shape);
      const F = (t) => 1 - Math.exp(-((t / w.scale) ** w.shape));
      const top = Math.max(...xs, typeof a.target === "number" ? a.target : 0) * 1.15;
      const series = Array.from({ length: 25 }, (_, i) => {
        const t = top * i / 24;
        return { label: fmtNumber(t), x: t, value: F(t) * 100 };
      });
      const sorted2 = [...xs].sort((p, q) => p - q), n2 = sorted2.length;
      const points = sorted2.map((x, i) => ({ x, y: (i + 1 - 0.3) / (n2 + 0.4) * 100 }));
      const kind = w.shape < 0.9 ? "failures come early — in the run-up after a stop or a change: look at how it is started, not at wear" : w.shape <= 1.2 ? "failures come at random — a planned replacement would not prevent them: find their cause" : "failures come from wear — the longer it runs the likelier it fails: a planned service before then pays";
      const within = typeof a.target === "number" ? `; a ${fmtNumber(F(a.target) * 100)}% chance of one within ${withUnit(a.target, unit)} of the last` : "";
      const few = n2 < 10 ? " (fewer than 10: read it with care)" : "";
      return {
        value: mtbf,
        n: n2,
        ...u2,
        series,
        points,
        weibull: w,
        ...typeof a.target === "number" ? { target: a.target } : {},
        says: `${what}: ${withUnit(mtbf, unit)} between failures on average; shape ${fmtNumber(w.shape)} — ${kind}${within}; from ${many(n2, "time between", "times between")}${few}.`
      };
    }
  },
  compare: {
    id: "compare",
    name: "Before and after",
    says: "This log against an earlier one on the method — how far it moved, and how sure it is not chance (Welch’s t on the entries, or on the entries a day); told which way is better, its figure is how sure it got better",
    needs: { of: "optional", by: "none", when: "optional", against: "none", target: "none", from: "required" },
    numeric: true,
    output: "both",
    picture: "bars",
    compute: (entries, a, columns, ctx) => {
      const was = a.from ? ctx.logs[a.from] : void 0;
      const unit = a.of ? unitOf(a, columns) : "a day";
      const what = `${a.label}${whenSaid(a, columns)}`;
      if (!was) return { n: 0, unit: "%", says: `${what}: needs the earlier log it is compared with — it is not on the method.` };
      const pick = (es, cs) => {
        const rows = rowsOf(es, a, cs);
        return a.of ? numbers(rows, a.of) : dayTotals(rows).map((p) => p.value);
      };
      const xs = pick(was.entries, was.columns), ys = pick(entries, columns);
      const thing = a.of ? `${lowerFirst(col(columns, a.of)?.label ?? a.of)} an entry` : "entries a day";
      const sides = a.of ? `${many(xs.length, "entry", "entries")} before and ${ys.length} now` : `${many(xs.length, "day")} before and ${ys.length} now`;
      const w = welch(xs, ys);
      if (!w) return { n: ys.length, unit: "%", says: `${what}: needs at least 2 ${a.of ? "entries" : "days logged"} on each side to compare — ${sides} (“${was.title}” before).` };
      const mb = mean2(xs), mn = mean2(ys);
      const series = [{ label: "Before", value: mb }, { label: "Now", value: mn }];
      const pct3 = mb !== 0 ? ` (${w.diff < 0 ? "−" : "+"}${fmtNumber(Math.abs(w.diff / mb * 100))}%)` : "";
      const moved = w.diff === 0 ? `${thing} the same before and now, ${withUnit(mb, unit)}` : `${thing} ${w.diff < 0 ? "fell" : "rose"} from ${withUnit(mb, unit)} to ${withUnit(mn, unit)}${pct3}`;
      const said = (x) => x > 99.9 ? "more than 99.9%" : `${fmtNumber(x)}%`;
      const few = Math.min(xs.length, ys.length) < 5 ? "; fewer than 5 on a side: read it with care" : "";
      const tail = ` (on ${sides}, against “${was.title}”${few}).`;
      if (w.diff === 0) return { value: 0, n: ys.length, unit: "%", series, says: `${what}: ${moved} — no change${tail}` };
      if (!a.better) {
        const sure2 = (1 - w.p) * 100;
        const verdict2 = w.p <= 0.05 ? `a real change: ${said(sure2)} sure it is not chance` : w.p <= 0.2 ? `probably real: ${said(sure2)} sure — more entries would settle it` : `not shown yet: it could be chance (${said(sure2)} sure) — keep logging`;
        return { value: Math.min(sure2, 99.9), n: ys.length, unit: "%", series, says: `${what}: ${moved} — ${verdict2}${tail}` };
      }
      const right = a.better === "lower" ? w.diff < 0 : w.diff > 0;
      const pBetter = right ? w.p / 2 : 1 - w.p / 2;
      const sure = (1 - pBetter) * 100;
      const verdict = right ? pBetter <= 0.05 ? `better, and ${said(sure)} sure it is not chance` : pBetter <= 0.2 ? `better, probably: ${said(sure)} sure — more entries would settle it` : `better on these entries, but not shown yet: it could be chance (${said(sure)} sure) — keep logging` : w.p / 2 <= 0.05 ? `worse — and ${said((1 - w.p / 2) * 100)} sure it is not chance: what changed with the countermeasure?` : `worse on these entries, though it could be chance — not better`;
      return { value: Math.min(sure, 99.9), n: ys.length, unit: "%", series, says: `${what}: ${moved} — ${verdict}${tail}` };
    }
  },
  groups: {
    id: "groups",
    name: "Differs by group",
    says: "Whether a number differs from one group to another — the shift, the crew, the product, the cause — more than it varies within each, and how sure it is not chance (one-way analysis of variance)",
    needs: { of: "required", by: "required", when: "optional", against: "none", target: "none" },
    numeric: true,
    output: "both",
    picture: "bars",
    compute: (entries, a, columns) => {
      const rows = rowsOf(entries, a, columns), unit = unitOf(a, columns);
      const what = `${a.label}${whenSaid(a, columns)}`;
      const byWord = lowerFirst(col(columns, a.by)?.label ?? a.by ?? "group");
      const ofWord = lowerFirst(col(columns, a.of)?.label ?? a.of ?? "");
      const by = /* @__PURE__ */ new Map();
      for (const r2 of rows) {
        const g = a.by ? r2.v[a.by] : void 0, x = a.of ? r2.v[a.of] : void 0;
        if (!filled(g) || typeof x !== "number" || !Number.isFinite(x)) continue;
        const name = typeof g === "boolean" ? g ? "Yes" : "No" : String(g).trim();
        by.set(name, [...by.get(name) ?? [], x]);
      }
      const kept = [...by.entries()].filter(([, xs]) => xs.length >= 2);
      const left = [...by.entries()].filter(([, xs]) => xs.length < 2).map(([g]) => g);
      const leftSaid = left.length ? `; ${left.join(", ")} left out — fewer than 2 entries` : "";
      const n2 = kept.reduce((t, [, xs]) => t + xs.length, 0);
      const r = oneWay(kept.map(([, xs]) => xs));
      if (!r) return { n: n2, unit: "%", says: `${what}: needs at least 2 ${byWord} groups with 2 entries each to compare — ${many(kept.length, "group")} so far${leftSaid}.` };
      const series = kept.map(([label, xs]) => ({ label, value: mean2(xs) })).sort((p, q) => q.value - p.value || p.label.localeCompare(q.label));
      const hi = series[0], lo = series[series.length - 1];
      const sure = (1 - r.p) * 100, said = sure > 99.9 ? "more than 99.9%" : `${fmtNumber(sure)}%`;
      const spread = hi.value === lo.value ? `${ofWord} the same in every ${byWord}, ${withUnit(hi.value, unit)} an entry` : `${ofWord} highest for ${hi.label} at ${withUnit(hi.value, unit)} an entry, lowest for ${lo.label} at ${withUnit(lo.value, unit)}`;
      const verdict = r.p <= 0.05 ? `it differs by ${byWord}: ${said} sure it is not chance — look at what ${hi.label} does differently` : r.p <= 0.2 ? `it may differ by ${byWord}: ${said} sure — more entries would settle it` : `no real difference by ${byWord} shown: it could be chance (${said} sure)`;
      const few = kept.some(([, xs]) => xs.length < 5) ? "; fewer than 5 in a group: read it with care" : "";
      return { value: Math.min(sure, 99.9), n: n2, unit: "%", series, says: `${what}: ${spread} — ${verdict} (on ${n2} entries in ${kept.length} groups${leftSaid}${few}).` };
    }
  },
  overdue: {
    id: "overdue",
    name: "Past due",
    says: "Entries whose day (a date column — the day it is due) has gone and that are still open — counted, by owner, the oldest named: who owes what by when",
    needs: { of: "required", by: "optional", when: "optional", against: "none", target: "none" },
    numeric: false,
    output: "both",
    picture: "bars",
    compute: (entries, a, columns, ctx) => {
      const what = `${a.label}${whenSaid(a, columns)}`;
      if (!ctx.today) return { n: 0, says: `${what}: needs today's date to judge the days against.` };
      const today = ctx.today;
      const isDay = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
      const rows = rowsOf(entries, a, columns).filter((r) => isDay(a.of ? r.v[a.of] : void 0));
      const nameCol = columns.find((c) => c.type === "text" && c.key !== a.by);
      const nameOf = (r) => {
        const t = nameCol ? r.v[nameCol.key] : void 0;
        return typeof t === "string" && t.trim() ? `“${t.trim()}”` : `the one due ${daySaid(String(a.of ? r.v[a.of] : ""))}`;
      };
      const late = rows.filter((r) => String(a.of ? r.v[a.of] : "") < today).sort((p, q) => String(p.v[a.of ?? ""]).localeCompare(String(q.v[a.of ?? ""])));
      const ahead = rows.filter((r) => String(a.of ? r.v[a.of] : "") >= today).sort((p, q) => String(p.v[a.of ?? ""]).localeCompare(String(q.v[a.of ?? ""])));
      const owner = (r) => {
        const g = a.by ? r.v[a.by] : void 0;
        return g === void 0 || g === "" ? "no one named" : typeof g === "boolean" ? g ? "Yes" : "No" : String(g).trim();
      };
      const counts = /* @__PURE__ */ new Map();
      for (const r of late) counts.set(owner(r), (counts.get(owner(r)) ?? 0) + 1);
      const series = a.by ? [...counts.entries()].map(([label, value]) => ({ label, value })).sort((p, q) => q.value - p.value || p.label.localeCompare(q.label)) : void 0;
      const next = ahead[0] ? `; the next due ${daySaid(String(ahead[0].v[a.of ?? ""]))} — ${nameOf(ahead[0])}${a.by ? `, ${owner(ahead[0])}` : ""}` : "";
      if (!rows.length) return { value: 0, n: 0, says: `${what}: nothing with a day yet.` };
      if (!late.length) return { value: 0, n: rows.length, ...series ? { series } : {}, says: `${what}: none — ${many(rows.length, "open entry", "open entries")} with a day, none gone by${next}.` };
      const first = late[0], days2 = dayNo(today) - dayNo(String(first.v[a.of ?? ""]));
      const who = a.by ? ` — ${[...counts.entries()].sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0])).map(([o, c]) => `${o} ${c}`).join(", ")}` : "";
      return {
        value: late.length,
        n: rows.length,
        ...series ? { series } : {},
        says: `${what}: ${late.length} past due${who}; the oldest ${nameOf(first)}${a.by ? ` (${owner(first)})` : ""}, due ${daySaid(String(first.v[a.of ?? ""]))} — ${many(days2, "day")} late${next}.`
      };
    }
  },
  drivers: {
    id: "drivers",
    name: "What drives it",
    says: "Which of several number columns drive a figure, read together — how much each moves it with the others held still, how sure each is not chance, and how much of it they explain (multiple linear regression); a link, not proof of a cause",
    needs: { of: "required", by: "none", when: "optional", against: "required", target: "none", also: "optional" },
    numeric: true,
    output: "both",
    picture: "bars",
    compute: (entries, a, columns) => {
      const yk = a.of ?? "", keys = [a.against, ...a.also ?? []].filter((k2) => !!k2);
      const yc = col(columns, yk), yl = lowerFirst(yc?.label ?? yk);
      const names = keys.map((k2) => lowerFirst(col(columns, k2)?.label ?? k2));
      const listed2 = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] ?? "";
      const rows = rowsOf(entries, a, columns).filter((r) => typeof r.v[yk] === "number" && keys.every((k2) => typeof r.v[k2] === "number"));
      const what = `${a.label}${whenSaid(a, columns)}`;
      const need = keys.length + 3;
      if (rows.length < need) return { n: rows.length, unit: "%", says: `${what}: needs ${need} entries with ${yl} and ${listed2} all filled — ${rows.length} so far.` };
      const fit = leastSquares(rows.map((r) => keys.map((k2) => r.v[k2])), rows.map((r) => r.v[yk]));
      if (fit === "collinear") return { n: rows.length, unit: "%", says: `${what}: ${listed2} move together in these entries — their effects cannot be told apart; drop one, or log them where they vary apart.` };
      if (!fit) return { n: rows.length, unit: "%", says: `${what}: ${yl} does not vary in these entries — nothing to explain.` };
      const said = (x) => x > 99.9 ? "more than 99.9%" : `${fmtNumber(x)}%`;
      const each = keys.map((k2, j) => {
        const c = col(columns, k2), b = fit.beta[j + 1], sure = (1 - fit.p[j + 1]) * 100;
        const how = `${withUnit(Math.abs(b), yc?.unit)} ${b >= 0 ? "higher" : "lower"} for every ${perOne(c?.unit)} more`;
        return { name: names[j], sure, shown: fit.p[j + 1] <= 0.05, says: `${names[j]}: ${how}${keys.length > 1 ? ", the others held still" : ""} — ${fit.p[j + 1] <= 0.05 ? `${said(sure)} sure` : `not shown (${said(sure)} sure)`}` };
      });
      const series = each.map((e) => ({ label: e.name, value: Math.min(e.sure, 99.9) })).sort((p, q) => q.value - p.value || p.label.localeCompare(q.label));
      const first = [...each].filter((e) => e.shown).sort((p, q) => q.sure - p.sure)[0];
      const whole2 = `${listed2} ${keys.length > 1 ? "together " : ""}explain ${fmtNumber(fit.r2 * 100)}% of the ${yl} — ${fit.fp <= 0.05 ? `${said((1 - fit.fp) * 100)} sure it is not chance` : `not shown (${said((1 - fit.fp) * 100)} sure)`}`;
      const next = first ? `Look at ${first.name} first.` : "None is shown yet — more entries, or another cause.";
      const few = rows.length < 10 * keys.length ? ` (fewer than ${10 * keys.length}: read it with care)` : "";
      const eachSaid = each.map((e) => e.says).join("; ");
      return { value: fit.r2 * 100, n: rows.length, unit: "%", series, says: `${what}: ${whole2}. ${eachSaid.charAt(0).toUpperCase()}${eachSaid.slice(1)}. ${next} On ${many(rows.length, "entry", "entries")}${few}. A link is not proof of a cause — test it.` };
    }
  },
  /* PACK WEIGHTS AND THE LAW (packRules): each pack's weight against the nominal printed on it */
  emark: {
    id: "emark",
    name: "Pack weights — the three rules",
    says: "Each pack weighed against the law’s three rules for packers (the average system, the ℮ mark): the average at least the nominal, no more than 2.5% under T1 (the nominal less its tolerable negative error), none under T2 (twice it) — judged from the packs weighed and their spread; its figure is how many rules are broken (0 is legal)",
    needs: { of: "required", by: "none", when: "optional", against: "none", target: "required" },
    targetSays: "the nominal quantity printed on the pack (g or ml)",
    numeric: true,
    output: "both",
    picture: "bars",
    compute: (entries, a, columns, ctx) => {
      const xs = numbers(rowsOf(entries, a, columns), a.of), unit = unitOf(a, columns), what = `${a.label}${whenSaid(a, columns)}`;
      const qn = targetOf(a, ctx);
      if (typeof qn !== "number" || tneOf(qn) === void 0) return { n: xs.length, unit: "rules broken", says: `${what}: needs the nominal quantity on the pack, from 5 to 50,000 (g or ml)${targetWhere(a, ctx)} — the law’s table says nothing outside it.` };
      const r = packRules(xs, qn);
      if (!r) return { n: xs.length, unit: "rules broken", says: `${what}: needs at least 2 packs weighed — ${xs.length} so far.` };
      const u2 = (x) => withUnit(x, unit);
      const series = [
        { label: "under T2", value: r.under2 },
        { label: "T2–T1", value: xs.filter((x) => x >= r.t2 && x < r.t1).length },
        { label: "T1–nominal", value: xs.filter((x) => x >= r.t1 && x < qn).length },
        { label: `to +${u2(r.tne)}`, value: xs.filter((x) => x >= qn && x < qn + r.tne).length },
        { label: `over +${u2(r.tne)}`, value: xs.filter((x) => x >= qn + r.tne).length }
      ];
      const pct3 = (p) => p < 1e-4 ? "under 1 in 10,000" : p < 1e-3 ? `about 1 in ${Math.round(1 / p).toLocaleString("en-GB")}` : `about ${fmtNumber(p * 100)}%`;
      const broke = [
        !r.rule1 && `rule 1 (the average ${u2(r.mean)} is under the nominal ${u2(qn)})`,
        !r.rule2 && `rule 2 (${r.n >= 40 && r.under1 / r.n > PACK_Z.t1Share ? `${r.under1} of ${r.n} under T1` : `${pct3(r.est1)} would be under T1 at this average and spread`} — 2.5% at most)`,
        !r.rule3 && `rule 3 (${r.under2 ? `${many(r.under2, "pack")} under T2` : `${pct3(r.est2)} would be under T2 at this spread`} — none may be)`
      ].filter(Boolean);
      const verdict = r.broken ? `breaks ${broke.join("; ")}` : "legal on all three rules";
      const few = r.n < 30 ? `; from fewer than 30 packs the spread is an estimate — weigh more to be surer` : "";
      return {
        value: r.broken,
        unit: r.broken === 1 ? "rule broken" : "rules broken",
        n: r.n,
        series,
        says: `${what}: ${verdict} — average ${u2(r.mean)} against the nominal ${u2(qn)}, ${r.under1} of ${r.n} under T1 (${u2(r.t1)}; ${pct3(r.est1)} at this spread), ${r.under2} under T2 (${u2(r.t2)}); the tolerable negative error for ${u2(qn)} is ${u2(r.tne)}${few}.`
      };
    }
  },
  giveaway: {
    id: "giveaway",
    name: "Giveaway",
    says: "The product given away a pack: how far the packs weighed average over the nominal printed on them (under it is said as short, not as giveaway)",
    needs: { of: "required", by: "none", when: "optional", against: "none", target: "required" },
    targetSays: "the nominal quantity printed on the pack (g or ml)",
    numeric: true,
    output: "number",
    picture: "none",
    compute: (entries, a, columns, ctx) => {
      const xs = numbers(rowsOf(entries, a, columns), a.of), unit = unitOf(a, columns), what = `${a.label}${whenSaid(a, columns)}`;
      const qn = targetOf(a, ctx);
      if (typeof qn !== "number" || !(qn > 0)) return { n: xs.length, ...unit ? { unit } : {}, says: `${what}: needs the nominal quantity on the pack${targetWhere(a, ctx)}.` };
      if (!xs.length) return { n: 0, ...unit ? { unit } : {}, says: `${what}: no packs weighed yet.` };
      const over = mean2(xs) - qn;
      return { value: over, n: xs.length, ...unit ? { unit } : {}, says: over >= 0 ? `${what}: ${withUnit(over, unit)} a pack over the nominal ${withUnit(qn, unit)} (${fmtNumber(over / qn * 100)}%), from ${many(xs.length, "pack")} averaging ${withUnit(mean2(xs), unit)}.` : `${what}: none — the packs average ${withUnit(-over, unit)} SHORT of the nominal ${withUnit(qn, unit)}, from ${many(xs.length, "pack")}: rule 1 is broken.` };
    }
  },
  fill: {
    id: "fill",
    name: "Lowest legal fill",
    says: "The lowest average a filler can be set to at the spread the packs show and still keep all three rules: the nominal, T1 + 1.96 spreads (2.5% under T1) or T2 + 3.72 spreads (1 in 10,000 under T2), whichever is highest — and which rule sets it",
    needs: { of: "required", by: "none", when: "optional", against: "none", target: "required" },
    targetSays: "the nominal quantity printed on the pack (g or ml)",
    numeric: true,
    output: "number",
    picture: "none",
    compute: (entries, a, columns, ctx) => {
      const xs = numbers(rowsOf(entries, a, columns), a.of), unit = unitOf(a, columns), what = `${a.label}${whenSaid(a, columns)}`;
      const qn = targetOf(a, ctx);
      if (typeof qn !== "number" || tneOf(qn) === void 0) return { n: xs.length, ...unit ? { unit } : {}, says: `${what}: needs the nominal quantity on the pack, from 5 to 50,000 (g or ml)${targetWhere(a, ctx)}.` };
      const r = packRules(xs, qn);
      if (!r || xs.length < 5) return { n: xs.length, ...unit ? { unit } : {}, says: `${what}: needs at least 5 packs weighed to read their spread — ${xs.length} so far.` };
      const u2 = (x) => withUnit(x, unit);
      const why = r.sets === 1 ? "the nominal itself (rule 1) — the spread is narrow enough that the average sets it" : r.sets === 2 ? `T1 ${u2(r.t1)} + 1.96 × the spread ${u2(r.sd)} (rule 2: 2.5% at most under T1)` : `T2 ${u2(r.t2)} + 3.72 × the spread ${u2(r.sd)} (rule 3: 1 in 10,000 at most under T2)`;
      const now = r.mean - r.lowest;
      const few = r.n < 30 ? "; from fewer than 30 packs the spread is an estimate — weigh more before setting the filler to it" : "";
      return { value: r.lowest, n: r.n, ...unit ? { unit } : {}, says: `${what}: ${u2(r.lowest)} — set by ${why}. The packs average ${u2(r.mean)}: ${now >= 0 ? `${u2(now)} a pack above it` : `${u2(-now)} a pack BELOW it — raise the fill`}${few}.` };
    }
  },
  calc: {
    id: "calc",
    name: "Worked out",
    says: "A figure worked out from the figures before it and the step’s own boxes — any arithmetic (+ − × ÷ and brackets), money included: a cost, a yield, a rate",
    needs: { of: "none", by: "none", when: "none", against: "none", target: "none", formula: "required" },
    numeric: false,
    output: "number",
    picture: "none",
    compute: (entries, a, _columns, ctx) => {
      const unit = a.unit;
      let refs = [];
      try {
        refs = formulaRefs(parseFormula(a.formula ?? ""));
      } catch {
        return { n: 0, ...unit ? { unit } : {}, says: `${a.label}: its arithmetic cannot be read.` };
      }
      const nums = { ...ctx.boxes };
      for (const [k2, r] of Object.entries(ctx.prior)) if (typeof r.value === "number" && Number.isFinite(r.value)) nums[k2] = r.value;
      const name = (k2) => (ctx.labels[k2] ?? k2.replace(/_/g, " ")).toLowerCase();
      const missing = refs.filter((k2) => typeof nums[k2] !== "number");
      const n2 = live(entries).length;
      if (missing.length) return { n: n2, ...unit ? { unit } : {}, says: `${a.label}: needs ${missing.map(name).join(" and ")} — not worked out yet.` };
      const value = calc(a.formula ?? "", nums);
      const how = (a.formula ?? "").replace(/[a-z_][a-z0-9_]*/gi, (w) => name(w.toLowerCase())).replace(/\*/g, "×").replace(/\//g, "÷").replace(/\s+/g, " ").trim();
      if (value === void 0 || !Number.isFinite(value)) return { n: n2, ...unit ? { unit } : {}, says: `${a.label}: cannot be worked out — ${how} has no answer (a division by nought).` };
      return { value, n: n2, ...unit ? { unit } : {}, says: `${a.label}: ${withUnit(value, unit)} — ${how}.` };
    }
  }
};
var blockOf = (id) => id && ANALYSIS_BLOCKS.includes(id) ? BLOCKS[id] : void 0;
function analyse2(analyses, columns, entries, boxes = {}, logs = {}, today) {
  const out = {};
  const nums = {};
  for (const [k2, v] of Object.entries(boxes.values ?? {})) if (typeof v === "number" && Number.isFinite(v)) nums[k2] = v;
  const labels = { ...boxes.labels ?? {} };
  for (const a of analyses ?? []) labels[a.key] = a.label;
  for (const a of analyses ?? []) {
    const b = blockOf(a.block);
    if (b) out[a.key] = b.compute(entries ?? [], a, columns ?? [], { prior: { ...out }, boxes: nums, labels, logs, ...today ? { today } : {} });
  }
  return out;
}
function figuresOf2(results) {
  const out = {};
  for (const [k2, r] of Object.entries(results)) if (typeof r.value === "number" && Number.isFinite(r.value)) out[k2] = r.value;
  return out;
}
var BLOCK_CATALOGUE = ANALYSIS_BLOCKS.map((id) => {
  const b = BLOCKS[id];
  return { id, name: b.name, says: b.says, of: b.needs.of, by: b.needs.by, when: b.needs.when, against: b.needs.against, target: b.needs.target, targetSays: b.targetSays ?? "the level it is heading for", formula: b.needs.formula ?? "none", from: b.needs.from ?? "none", also: b.needs.also ?? "none", numeric: b.numeric, output: b.output, picture: b.picture };
});

// src/lib/flow/definition.ts
var isTypedNumber = (t) => t === "number" || t === "reading" || t === "timer" || t === "tally";
var isNumberBox = (t) => isTypedNumber(t) || t === "calc";
function allSteps(def) {
  return def.stages.flatMap((stage, stageIndex) => stage.steps.map((step) => ({ stage, step, stageIndex })));
}
function numbersOf(step) {
  const own = (step.fields ?? []).filter((f) => isNumberBox(f.type));
  const tool = componentOf(step.component?.tool)?.figures ?? [];
  const logged = step.answer === "log" ? (step.analyses ?? []).filter((a) => blockOf(a.block)?.output !== "series").map((a) => {
    const unit = analysisUnit(a, step.columns ?? []);
    return { key: a.key, label: a.label, type: "number", ...unit ? { unit } : {} };
  }) : [];
  const taken = new Set(own.map((f) => f.key));
  const more = [...tool.map((t) => ({ key: t.key, label: t.label, type: "number", ...t.unit ? { unit: t.unit } : {} })), ...logged];
  return [...own, ...more.filter((f) => taken.has(f.key) ? false : (taken.add(f.key), true))];
}
function analysisUnit(a, columns) {
  if (a.unit) return a.unit;
  if (a.block === "count") return "entries";
  if (a.block === "share" || a.block === "pareto") return "%";
  if (a.block === "cpk") return void 0;
  const c = columns.find((x) => x.key === a.of)?.unit;
  if (a.block === "perDay") return a.of ? `${c ?? ""} a day`.trim() : "a day";
  return c;
}
var roleName = (def, key) => key ? def.roles.find((r) => r.key === key)?.name : void 0;
var isTest = (s) => s.answer === "check" || s.answer === "measure";

// src/lib/flow/runtime.ts
var live2 = (xs) => xs.filter((x) => !x.deletedAt);
var newest = (a, b) => b.createdAt - a.createdAt || b.updatedAt - a.updatedAt;
var many2 = (n2, one, more = `${one}s`) => `${n2} ${n2 === 1 ? one : more}`;
var filled2 = (v) => v !== void 0 && v !== null && !(typeof v === "string" && !v.trim());
var fmt = (n2) => Math.abs(n2) >= 100 || Number.isInteger(n2) ? String(Math.round(n2 * 10) / 10) : String(Math.round(n2 * 100) / 100);
var withUnit2 = (n2, f) => f.unit === "£" ? numberSaid(n2, "£") : `${fmt(n2)}${f.unit ? ` ${f.unit}` : ""}`;
var logBoxes = (step, typed) => ({
  values: valuesOf(step, typed),
  labels: Object.fromEntries((step.fields ?? []).map((f) => [f.key, f.label]))
});
function earlierLogs(def, records, step, assetId) {
  if (!(step.analyses ?? []).some((a) => a.from)) return void 0;
  const out = {};
  for (const { stage, step: s } of allSteps(def)) {
    if (s.key === step.key) break;
    if (s.answer !== "log") continue;
    const mine = records.filter((r) => r.kind === "step" && r.stageKey === stage.key && r.stepKey === s.key && (s.per === "machine" ? r.assetId === assetId : !r.assetId)).sort(newest);
    out[s.key] = { title: s.title, columns: s.columns ?? [], entries: mine[0]?.entries ?? [] };
  }
  return out;
}
function valuesOf(step, typed = {}) {
  const out = {};
  for (const f of step.fields ?? []) {
    if (f.type === "calc") continue;
    const v = typed[f.key];
    if (!filled2(v)) continue;
    if (isTypedNumber(f.type)) {
      const n2 = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n2)) out[f.key] = n2;
    } else out[f.key] = v;
  }
  for (let pass = 0; pass < 3; pass++) {
    for (const f of step.fields ?? []) {
      if (f.type !== "calc" || !f.formula || out[f.key] !== void 0) continue;
      const nums = {};
      for (const [k2, v] of Object.entries(out)) if (typeof v === "number") nums[k2] = v;
      const r = calc(f.formula, nums);
      if (r !== void 0) out[f.key] = r;
    }
  }
  return out;
}
function limitsBroken(step, values) {
  const out = [];
  for (const f of step.fields ?? []) {
    if (!isTypedNumber(f.type)) continue;
    const v = values[f.key];
    if (typeof v !== "number") continue;
    if (f.min !== void 0 && v < f.min) out.push(`${f.label} ${withUnit2(v, f)} — at least ${withUnit2(f.min, f)}`);
    else if (f.max !== void 0 && v > f.max) out.push(`${f.label} ${withUnit2(v, f)} — at most ${withUnit2(f.max, f)}`);
  }
  return out;
}
function missingOf(def, step, rec, values, people, tool) {
  const out = [];
  for (const f of step.fields ?? []) {
    if (f.required && f.type !== "calc" && !filled2(values[f.key])) out.push(f.label);
  }
  if (step.answer === "measure") {
    for (const f of step.fields ?? []) {
      if ((f.type === "reading" || isTypedNumber(f.type) && (f.min !== void 0 || f.max !== void 0)) && !filled2(values[f.key]) && !f.required) out.push(f.label);
    }
  }
  const photos = (rec?.media ?? []).length;
  const files = (rec?.docs ?? []).length;
  const wantPhotos = step.evidence?.photos ?? 0;
  const wantFiles = step.evidence?.files ?? 0;
  if (photos < wantPhotos) out.push(wantPhotos - photos === 1 ? "a photo" : `${wantPhotos - photos} more photos`);
  if (files < wantFiles) out.push(wantFiles - files === 1 ? "a file" : `${wantFiles - files} more files`);
  if (step.answer === "paperwork" && photos + files === 0 && !wantPhotos && !wantFiles) out.push("the paperwork (a file or a photo)");
  if (step.answer === "log") {
    const want = Math.max(1, step.minEntries ?? 1), have = (rec?.entries ?? []).filter((e) => !e.struck).length;
    if (have < want) out.push(want === 1 ? "an entry in its log" : `${want} entries in its log (${have} so far)`);
  }
  if (step.answer === "signoff" && !rec?.signedBy?.trim()) {
    const by = step.role && people?.[step.role] || roleName(def, step.role);
    out.push(by ? `${by}'s sign-off` : "a sign-off");
  }
  if (step.component && answeredByRecord(componentOf(step.component.tool))) {
    const word = componentWord(step.component.tool);
    if (!rec?.studyId) out.push(`its ${word}`);
    else if (!tool) out.push(`its ${word} (not on this device yet)`);
    else if (!tool.enough) out.push(`its ${word} finished — ${tool.verdict ?? "not enough recorded yet"}`);
  }
  return out;
}
var componentWord = (tool) => ({
  capability: "capability study",
  losses: "loss count",
  changeover: "SMED study",
  balance: "line balance",
  sampling: "work sampling",
  map: "value stream map",
  capacity: "Line capacity"
})[tool] ?? "study";
function instanceTone(i) {
  if (i.complete) return "done";
  if (i.failed) return isTest(i.def) ? "failed" : i.late ? "late" : "problem";
  if (i.late) return "late";
  if (i.record?.outcome === "done") return "asking";
  const signs = !!i.record && (!!i.record.doneOn || Object.keys(i.values).length > 0 || !!i.record.note?.trim());
  if (signs && (isTest(i.def) || i.def.answer === "form")) return "going";
  if (i.def.answer === "log" && (i.record?.entries ?? []).some((e) => !e.struck)) return "going";
  return "ahead";
}
function tonesToGate(steps) {
  if (!steps.length) return "none";
  const t = steps.map((s) => s.tone);
  if (t.every((x) => x === "done")) return "done";
  if (t.includes("failed")) return "failed";
  if (t.includes("late")) return "late";
  if (t.includes("problem") || t.includes("asking")) return "problem";
  if (t.some((x) => x === "done" || x === "going")) return "going";
  return "ahead";
}
function opWords(c, f) {
  const u2 = (n2) => f ? withUnit2(n2, f) : fmt(n2);
  return c.op === ">=" ? `at least ${u2(c.value)}` : c.op === "<=" ? `at most ${u2(c.value)}` : c.op === "=" ? `exactly ${u2(c.value)}` : `between ${u2(c.value)} and ${u2(c.value2 ?? c.value)}`;
}
function meets2(c, v) {
  return c.op === ">=" ? v >= c.value : c.op === "<=" ? v <= c.value : c.op === "=" ? Math.abs(v - c.value) < 1e-9 : v >= c.value && v <= (c.value2 ?? c.value);
}
var RULE_WORD = { ">": "above", ">=": "at least", "<": "below", "<=": "at most", "=": "is", "!=": "is not" };
var wordOf = (v) => typeof v === "boolean" ? v ? "yes" : "no" : String(v).trim().toLowerCase().replace(/^true$/, "yes").replace(/^false$/, "no");
function ruleHolds(r, v) {
  if (v === void 0 || v === "") return false;
  if (typeof r.value === "number") {
    const n2 = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n2)) return false;
    switch (r.op) {
      case ">":
        return n2 > r.value;
      case ">=":
        return n2 >= r.value;
      case "<":
        return n2 < r.value;
      case "<=":
        return n2 <= r.value;
      case "=":
        return Math.abs(n2 - r.value) < 1e-9;
      default:
        return Math.abs(n2 - r.value) >= 1e-9;
    }
  }
  const same = wordOf(v) === wordOf(r.value);
  return r.op === "=" ? same : r.op === "!=" ? !same : false;
}
var ruleValue = (r, f) => typeof r.value === "number" ? `${fmt(r.value)}${f?.unit ? ` ${f.unit}` : ""}` : typeof r.value === "boolean" ? r.value ? "Yes" : "No" : r.value;
var ruleSaid = (r, f) => `${f?.label ?? r.field} ${RULE_WORD[r.op]} ${ruleValue(r, f)}`;
function readFlow(x) {
  const { def, today } = x;
  const records = live2(x.records);
  const machines = x.machines;
  const people = x.people ?? {};
  const whoFor = (step) => step.role ? people[step.role]?.trim() || roleName(def, step.role) : void 0;
  const instances = /* @__PURE__ */ new Map();
  const byStep = /* @__PURE__ */ new Map();
  for (const { stage, step } of allSteps(def)) {
    const targets = step.per === "machine" && machines.length ? machines.map((m) => ({ id: m.id, name: m.name })) : [{}];
    const list = targets.map((t) => {
      const mine = records.filter((r) => r.kind === "step" && r.stageKey === stage.key && r.stepKey === step.key && (r.assetId ?? void 0) === (step.per === "machine" ? t.id : void 0)).sort(newest);
      const record = mine[0];
      const tool = step.component && record?.studyId ? x.tools?.[record.studyId] : void 0;
      const analysis = step.answer === "log" ? analyse2(step.analyses, step.columns, record?.entries, logBoxes(step, record?.values), earlierLogs(def, records, step, step.per === "machine" ? t.id : void 0), x.today) : void 0;
      const values = { ...valuesOf(step, record?.values), ...tool?.figures ?? {}, ...analysis ? figuresOf2(analysis) : {} };
      const outOfLimits = step.answer === "measure" || (step.fields ?? []).some((f) => f.min !== void 0 || f.max !== void 0) ? limitsBroken(step, values) : [];
      const missing = missingOf(def, step, record, values, people, tool);
      const failed = record?.outcome === "failed" || record?.outcome === "done" && outOfLimits.length > 0;
      const complete = record?.outcome === "done" && !missing.length && !outOfLimits.length;
      const due = record?.plannedFor ?? (x.startedOn && step.dueDays !== void 0 ? addDays(x.startedOn, step.dueDays) : void 0);
      const ran = !!record && (record.outcome !== "planned" || !!record.doneOn || !!record.note?.trim());
      const settled = complete || isTest(step) && ran;
      const end = due ?? (record?.outcome === "failed" ? record.doneOn : void 0);
      const late = !complete && (record?.outcome === "notRun" || !!end && end < today && !settled);
      const inst = {
        stageKey: stage.key,
        def: step,
        assetId: t.id,
        machine: t.name,
        record,
        attempts: mine.length,
        values,
        complete,
        failed,
        late,
        due,
        missing,
        outOfLimits,
        blockedBy: [],
        tone: "ahead",
        who: record?.who?.trim() || whoFor(step),
        ...tool ? { tool } : {},
        ...analysis ? { analysis, entries: (record?.entries ?? []).filter((e) => !e.struck).length } : {}
      };
      inst.tone = instanceTone(inst);
      return inst;
    });
    instances.set(`${stage.key}/${step.key}`, list);
    byStep.set(step.key, list);
  }
  for (const list of byStep.values()) {
    for (const inst of list) {
      const r = inst.def.onlyIf;
      const dep = r ? byStep.get(r.step) : void 0;
      if (!r || !dep?.length) continue;
      const same = inst.assetId ? dep.filter((d) => !d.assetId || d.assetId === inst.assetId) : dep;
      const field = [...numbersOf(dep[0].def), ...dep[0].def.fields ?? []].find((f) => f.key === r.field);
      const rule = ruleSaid(r, field);
      const title = dep[0].def.title;
      if (!same.length || same.some((d) => !d.complete)) {
        inst.decision = { says: `Needed only when ${lowerFirst2(rule)} — decided when “${title}” is done` };
        inst.blockedBy.push(title);
        continue;
      }
      if (same.every((d) => d.notNeeded)) {
        Object.assign(inst, { decision: { needed: false, says: `Not needed — “${title}” was not needed` }, notNeeded: true, complete: true, failed: false, late: false, missing: [], outOfLimits: [], tone: "done" });
        continue;
      }
      const vals = same.map((d) => d.values[r.field]);
      const shown = vals.map((v) => v === void 0 ? "not recorded" : typeof v === "number" ? field ? withUnit2(v, field) : fmt(v) : typeof v === "boolean" ? v ? "Yes" : "No" : String(v)).join(", ");
      if (vals.some((v) => ruleHolds(r, v))) {
        inst.decision = { needed: true, says: `Needed — ${field?.label ?? r.field} ${shown}, ${RULE_WORD[r.op]} ${ruleValue(r, field)}` };
      } else {
        Object.assign(inst, { decision: { needed: false, says: `Not needed — ${field?.label ?? r.field} ${shown}; it is needed only when ${lowerFirst2(rule)}` }, notNeeded: true, complete: true, failed: false, late: false, missing: [], outOfLimits: [], tone: "done" });
      }
    }
  }
  for (const list of byStep.values()) {
    for (const inst of list) {
      for (const a of inst.def.after ?? []) {
        const dep = byStep.get(a);
        if (!dep) continue;
        const same = inst.assetId ? dep.filter((d) => !d.assetId || d.assetId === inst.assetId) : dep;
        if (same.some((d) => !d.complete) && !inst.blockedBy.includes(dep[0].def.title)) inst.blockedBy.push(dep[0].def.title);
      }
    }
  }
  const measures = (def.measures ?? []).map((m) => readMeasure(m, def, records, machines, x.tools, x.today));
  const stages = [];
  let prevPassed = true;
  let prevName = "";
  def.stages.forEach((stage, index) => {
    const steps = stage.steps.flatMap((s) => instances.get(`${stage.key}/${s.key}`) ?? []);
    const pass = records.filter((r) => r.kind === "gate" && r.stageKey === stage.key && r.outcome === "done").sort(newest)[0];
    const conditions = stage.gate.conditions.map((c) => readCondition(c, stage, steps, byStep, x, measures));
    const blockers = conditions.filter((c) => c.blocking);
    const passed = !!pass;
    const canPass = !passed && prevPassed && !blockers.length;
    const stepsTone = tonesToGate(steps);
    const tone = passed ? "done" : stepsTone === "done" ? "going" : stepsTone;
    stages.push({
      key: stage.key,
      name: stage.name,
      index,
      steps,
      done: steps.filter((s) => s.complete && !s.notNeeded).length,
      total: steps.filter((s) => !s.notNeeded).length,
      notNeeded: steps.filter((s) => s.notNeeded).length,
      late: steps.filter((s) => s.late).length,
      failed: steps.filter((s) => s.failed).length,
      stepsTone,
      tone,
      gate: {
        conditions,
        canPass,
        passed,
        pass,
        ...!prevPassed && !passed ? { waitsOn: `${prevName}'s gate` } : {},
        warnings: conditions.filter((c) => !c.met && !c.manual && c.policy === "warn")
      },
      ahead: !prevPassed && steps.some((s) => !!s.record)
    });
    prevPassed = prevPassed && passed;
    prevName = stage.name;
  });
  const outstanding = [];
  for (const st of stages) {
    if (st.gate.passed) continue;
    for (const s of st.steps) {
      if (s.complete) continue;
      const what = `${s.def.title}${s.machine ? ` — ${s.machine}` : ""}`;
      const why = s.blockedBy.length ? `waits on ${s.blockedBy.map((b) => `“${b}”`).join(" and ")}` : s.failed ? s.outOfLimits.length ? `did not pass: ${s.outOfLimits.join("; ")}` : "did not pass — to try again" : s.record?.outcome === "done" && s.missing.length ? `needs ${s.missing.join(", ")}` : s.record?.outcome === "notRun" ? "the day came and it did not happen" : s.missing.length && s.record ? `needs ${s.missing.join(", ")}` : "not done";
      outstanding.push({ kind: "step", stageKey: st.key, stageName: st.name, what, why, who: s.who, due: s.due, late: s.late, failed: s.failed, blocked: s.blockedBy.length > 0, stepKey: s.def.key, assetId: s.assetId });
    }
    for (const c of st.gate.conditions) {
      if (c.met || c.manual || c.type === "stepsDone" || c.type === "stepDone") continue;
      if (c.policy === "warn") continue;
      outstanding.push({ kind: "condition", stageKey: st.key, stageName: st.name, what: c.label, why: c.why, late: false, failed: false, blocked: false, conditionId: c.id });
    }
    if (st.gate.canPass) {
      outstanding.push({ kind: "gate", stageKey: st.key, stageName: st.name, what: `Pass ${st.name}'s gate`, why: st.gate.warnings.length ? `ready — ${many2(st.gate.warnings.length, "warning")} to note` : "every condition met", late: false, failed: false, blocked: false });
    }
  }
  const order = new Map(stages.map((s) => [s.key, s.index]));
  outstanding.sort((a, b) => Number(b.failed || b.late) - Number(a.failed || a.late) || (order.get(a.stageKey) ?? 0) - (order.get(b.stageKey) ?? 0) || Number(a.blocked) - Number(b.blocked) || (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const current = stages.find((s) => !s.gate.passed);
  const next = outstanding.find((o) => !o.blocked && o.stageKey === current?.key) ?? outstanding.find((o) => !o.blocked);
  const all = stages.flatMap((s) => s.steps);
  const needed = all.filter((s) => !s.notNeeded);
  const counts = {
    steps: needed.length,
    done: needed.filter((s) => s.complete).length,
    late: all.filter((s) => s.late).length,
    failed: all.filter((s) => s.failed).length,
    asking: all.filter((s) => s.tone === "asking").length,
    gatesPassed: stages.filter((s) => s.gate.passed).length,
    gates: stages.length
  };
  const done = stages.length > 0 && stages.every((s) => s.gate.passed);
  return { stages, current, outstanding, next, done, counts, verdict: verdictOf(stages, current, done, counts), measures };
}
function stepsDoneSaid(st, stepWord = true) {
  const skipped = st.notNeeded ? ` (${st.notNeeded} not needed)` : "";
  if (!st.total && st.notNeeded) return `none needed${skipped}`;
  return `${st.done} of ${stepWord ? many2(st.total, "step") : st.total} done${skipped}`;
}
var measureNumber = (m, n2) => withUnit2(n2, m);
function readMeasure(m, def, records, machines, tools, today) {
  const readings = [];
  for (const f of m.from) {
    const ref = allSteps(def).find((r) => r.step.key === f.step);
    if (!ref) continue;
    for (const r of records) {
      if (r.kind !== "step" || r.stepKey !== f.step || r.stageKey !== ref.stage.key || r.outcome === "planned") continue;
      const tool = ref.step.component && r.studyId ? tools?.[r.studyId] : void 0;
      if (ref.step.component && r.studyId && tool && !tool.enough) continue;
      const logged = ref.step.answer === "log" ? figuresOf2(analyse2(ref.step.analyses, ref.step.columns, r.entries, logBoxes(ref.step, r.values), earlierLogs(def, records, ref.step, r.assetId ?? void 0), today)) : {};
      const v = { ...valuesOf(ref.step, r.values), ...tool?.figures ?? {}, ...logged }[f.field];
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      const machine = r.assetId ? machines.find((x) => x.id === r.assetId)?.name : void 0;
      readings.push({ value: v, ...r.doneOn ? { on: r.doneOn } : {}, at: r.createdAt, step: ref.step.title, ...machine ? { machine } : {} });
    }
  }
  readings.sort((a, b) => (a.on ?? "").localeCompare(b.on ?? "") || a.at - b.at);
  const before = readings[0], now = readings[readings.length - 1];
  const n2 = (v) => measureNumber(m, v);
  const goal = m.target !== void 0 ? `target ${m.better === "lower" ? "at most" : "at least"} ${n2(m.target)}` : "";
  if (!now) return { def: m, readings, says: `${m.name}: not measured yet${goal ? ` — ${goal}` : ""}.` };
  const met = m.target !== void 0 ? m.better === "lower" ? now.value <= m.target : now.value >= m.target : void 0;
  const change = readings.length > 1 ? now.value - before.value : void 0;
  const improved = change === void 0 || change === 0 ? void 0 : m.better === "lower" ? change < 0 : change > 0;
  const moved = change === void 0 ? `${n2(now.value)}, the first reading` : change === 0 ? `${n2(before.value)} before, ${n2(now.value)} now — no change` : `${n2(before.value)} before, ${n2(now.value)} now — ${n2(Math.abs(change))} ${improved ? "better" : "worse"}`;
  const verdict = met === void 0 ? "" : met ? ` — ${goal}, met` : ` — ${goal}, not met yet`;
  return { def: m, readings, before, now, ...met !== void 0 ? { met } : {}, ...change !== void 0 ? { change } : {}, ...improved !== void 0 ? { improved } : {}, says: `${m.name}: ${moved}${verdict}.` };
}
function readCondition(c, stage, steps, byStep, x, measures) {
  const base = { id: c.id, type: c.type, policy: c.policy, manual: false };
  const out = (label, met, why) => ({ ...base, label: c.label || label, met, why, blocking: !met && c.policy === "block" });
  const titled = (key) => byStep.get(key)?.[0]?.def.title ?? key;
  const across = (list, one) => list.length > 1 ? `${list.filter((s) => s.complete).length} of ${list.length} ${one}` : "";
  switch (c.type) {
    case "stepsDone": {
      const need = steps.filter((s) => !s.notNeeded), skipped = steps.length - need.length;
      const done = need.filter((s) => s.complete).length;
      return out(`Every step in ${stage.name} done`, done === need.length, steps.length ? `${need.length ? `${done} of ${need.length} done` : "none needed"}${skipped ? ` (${skipped} not needed)` : ""}` : "no steps");
    }
    case "stepDone": {
      const list = byStep.get(c.step) ?? [];
      const ok = list.length > 0 && list.every((s) => s.complete);
      return out(`“${titled(c.step)}” done`, ok, ok ? list.every((s) => s.notNeeded) ? "not needed" : "done" : across(list, "machines done") || (list[0]?.failed ? "did not pass" : "not done"));
    }
    case "evidence": {
      const list = byStep.get(c.step) ?? [];
      const count = (s) => c.kind === "photo" ? (s.record?.media ?? []).length : (s.record?.docs ?? []).length;
      const ok = list.length > 0 && list.every((s) => count(s) >= c.min);
      const word = c.kind === "photo" ? "photo" : "file";
      const have = list.length === 1 ? count(list[0]) : list.filter((s) => count(s) >= c.min).length;
      return out(`“${titled(c.step)}” has ${many2(c.min, word)}`, ok, list.length === 1 ? `${have} of ${c.min}` : `${have} of ${list.length} machines`);
    }
    case "signedOff": {
      const list = byStep.get(c.step) ?? [];
      const ok = list.length > 0 && list.every((s) => !!s.record?.signedBy?.trim() && s.record.outcome === "done");
      const by = list.map((s) => s.record?.signedBy?.trim()).filter(Boolean);
      return out(`the sign-off “${titled(c.step)}”`, ok, ok ? `signed by ${[...new Set(by)].join(", ")}` : by.length ? `${by.length} of ${list.length} signed` : "not signed yet");
    }
    case "fieldMeets": {
      const list = byStep.get(c.step) ?? [];
      const field = list[0] ? numbersOf(list[0].def).find((f) => f.key === c.field) : void 0;
      const vals = list.map((s) => s.values[c.field]).filter((v) => typeof v === "number");
      const ok = list.length > 0 && vals.length === list.length && vals.every((v) => meets2(c, v));
      const label = `“${titled(c.step)}”: ${field?.label ?? c.field} ${opWords(c, field)}`;
      return out(label, ok, vals.length ? vals.map((v) => field ? withUnit2(v, field) : fmt(v)).join(", ") : "not measured yet");
    }
    case "measureMet": {
      const m = measures.find((x2) => x2.def.key === c.measure);
      if (!m) return out(`the measure “${c.measure}”`, false, "not on the method");
      const n2 = (v) => measureNumber(m.def, v);
      const goal = m.def.target !== void 0 ? `${m.def.better === "lower" ? "at most" : "at least"} ${n2(m.def.target)}` : "its target";
      return out(`${m.def.name} ${goal}`, m.met === true, m.now ? `${n2(m.now.value)} now` : "not measured yet");
    }
    case "noOpenProblems": {
      const rank = { critical: 3, high: 2, low: 1 };
      const want = c.priority === "critical" ? 3 : c.priority === "high" ? 2 : 1;
      const open = (x.problems ?? []).filter((p) => p.open && rank[p.priority ?? "low"] >= want);
      const word = c.priority === "any" ? "problems" : `${c.priority}${c.priority === "high" ? " or critical" : ""} problems`;
      return out(`No open ${word}`, open.length === 0, open.length ? `${open.length} open${open[0]?.title ? `: ${open.slice(0, 2).map((p) => p.title).join("; ")}` : ""}` : "none open");
    }
    case "dateReached": {
      const day = x.startedOn ? addDays(x.startedOn, c.dueDays) : void 0;
      const ok = !!day && x.today >= day;
      return out(day ? `Not before ${niceDay(day)}` : `${c.dueDays} days from the start`, ok, day ? ok ? "reached" : `from ${niceDay(day)}` : "no start date");
    }
    case "manual":
      return { ...base, manual: true, label: c.label, met: false, blocking: false, why: "confirmed when the gate is passed" };
  }
}
function verdictOf(stages, current, done, counts) {
  if (!stages.length) return { text: "The method has no stages yet.", tone: "n" };
  if (done) {
    const last = stages[stages.length - 1].gate.pass;
    return { text: `Every gate passed${last?.doneOn ? ` — the last on ${niceDay(last.doneOn)}` : ""}.`, tone: "g" };
  }
  const st = current ?? stages[0];
  const parts = [`${st.name} (stage ${st.index + 1} of ${stages.length}): ${stepsDoneSaid(st)}`];
  if (st.late) parts.push(`${st.late} late`);
  if (st.failed) parts.push(`${st.failed} did not pass`);
  const blocker = st.gate.conditions.find((c) => c.blocking && c.type !== "stepsDone");
  let tail = ".";
  if (st.gate.canPass) tail = " — ready to pass its gate.";
  else if (st.gate.waitsOn) tail = ` — ${st.gate.waitsOn} is not passed yet.`;
  else if (blocker) tail = ` — its gate needs ${lowerFirst2(blocker.label)}.`;
  const tone = st.failed || st.late || counts.failed ? "r" : counts.asking || blocker ? "a" : "n";
  return { text: parts.join(", ") + tail, tone };
}
var lowerFirst2 = (s) => /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;

// src/lib/flow/gateCheck.ts
var isoOf2 = (t) => new Date(t).toISOString().slice(0, 10);
function readPass(x, pass) {
  const t = pass.createdAt;
  const day = pass.doneOn ?? isoOf2(t);
  const def = x.defs[pass.version] ?? x.defs[x.current];
  const later = [];
  if (!def) {
    return finish(pass, "disagrees", ["the method it was passed under is not on the server"], later);
  }
  if (!x.defs[pass.version]) later.push(`read against version ${x.current} — version ${pass.version}, which it was passed under, is not on the server`);
  const stage = def.stages.find((s) => s.key === pass.stageKey);
  if (!stage) return finish(pass, "disagrees", [`its stage is not on version ${pass.version} of the method`], later);
  const records = [];
  for (const r of x.records) {
    if (r.createdAt > t) continue;
    if (r.deletedAt && r.deletedAt <= t) continue;
    const { deletedAt: _gone, ...kept } = r;
    let rec = kept;
    if (rec.kind === "step" && (rec.outcome === "done" || rec.outcome === "failed") && rec.doneOn && rec.doneOn > day) {
      const { doneOn: _d, ...rest } = rec;
      rec = { ...rest, outcome: "planned" };
    }
    if (rec.entries?.length) rec = { ...rec, entries: rec.entries.filter((e) => e.at <= t) };
    records.push(rec);
  }
  const onIt = new Set(records.filter((r) => r.assetId).map((r) => r.assetId));
  const machines = x.machines.filter((m) => (m.updatedAt ?? 0) <= t || onIt.has(m.id));
  for (const m of x.machines) if (!machines.includes(m)) later.push(`${m.name} — on the job only after it was passed`);
  const problems = (x.problems ?? []).filter((p) => (p.raisedAt === void 0 || p.raisedAt <= t) && (p.goneAt === void 0 || p.goneAt > t)).map((p) => ({ ...p, open: p.open || p.closedAt !== void 0 && p.closedAt > t }));
  const state = readFlow({
    def,
    records,
    machines,
    problems,
    today: day,
    startedOn: x.startedOn,
    people: x.people,
    tools: x.tools
  });
  const st = state.stages.find((s) => s.key === stage.key);
  if (!st) return finish(pass, "disagrees", ["its stage could not be read"], later);
  const unmet = [];
  const before = state.stages.slice(0, st.index).find((s) => !s.gate.passed);
  if (before) unmet.push(`${before.name}'s gate was not passed first`);
  for (const c of st.gate.conditions) {
    if (c.blocking) unmet.push(`${c.label} — ${c.why}`);
    else if (c.manual && !pass.checks?.[c.id]?.trim()) unmet.push(`${c.label} — not confirmed`);
  }
  for (const s of st.steps) {
    const r = s.record ? x.records.find((y) => y.id === s.record?.id) : void 0;
    const name = `“${s.def.title}”${s.machine ? ` (${s.machine})` : ""}`;
    if (r?.deletedAt && r.deletedAt > t) later.push(`${name} — taken off after it was passed`);
    else if (r && r.updatedAt > t) later.push(`${name} — changed after it was passed`);
    const study = r?.studyId;
    if (study && (x.toolsChanged?.[study] ?? 0) > t) later.push(`${name} — its ${s.tool?.name ?? "study"} changed after it was passed`);
  }
  const verdict = !unmet.length ? "agrees" : pass.override?.trim() ? "override" : "disagrees";
  return finish(pass, verdict, unmet, later);
}
function finish(pass, verdict, unmet, later) {
  const override = verdict === "override" ? pass.override?.trim() : void 0;
  return {
    passId: pass.id,
    stageKey: pass.stageKey,
    verdict,
    unmet,
    later,
    ...override ? { override } : {},
    says: gateCheckSaid({ verdict, unmet, later, override }, pass.doneOn)
  };
}
function readPasses(x) {
  return x.records.filter((r) => r.kind === "gate" && r.outcome === "done" && !r.deletedAt).sort((a, b) => a.createdAt - b.createdAt).map((p) => readPass(x, p));
}
function asGateCheck(p, projectId, at, was) {
  return {
    id: p.passId,
    projectId,
    stageKey: p.stageKey,
    verdict: p.verdict,
    says: p.says,
    unmet: p.unmet,
    later: p.later,
    ...p.override ? { override: p.override } : {},
    readAt: at,
    createdAt: was?.createdAt ?? at,
    updatedAt: at
  };
}
var sameReading = (a, b) => a.verdict === b.verdict && a.says === b.says && a.unmet.join("\n") === b.unmet.join("\n") && a.later.join("\n") === b.later.join("\n");
var listed = (xs) => xs.join("; ");
function gateCheckSaid(c, doneOn) {
  const lead = doneOn ? `Checked on the server, as the records stood on ${niceDay(doneOn)}: they` : "Checked on the server: the records";
  const head = c.verdict === "agrees" ? `${lead} bear this pass out — every condition was met.` : c.verdict === "override" ? `${doneOn ? `Checked on the server, as the records stood on ${niceDay(doneOn)}:` : "Checked on the server:"} passed over ${c.unmet.length === 1 ? "one condition" : `${c.unmet.length} conditions`} not met — ${listed(c.unmet)} — with the owner’s reason kept: “${c.override ?? ""}”.` : `${lead} do not bear this pass out — ${listed(c.unmet)} — and no reason to pass over ${c.unmet.length === 1 ? "it" : "them"} was given.`;
  return c.later.length ? `${head} Since: ${listed(c.later)}.` : head;
}

// src/lib/flow/serverCheck.ts
var many3 = async (fetch, table, column, values, kind) => values.length ? (await fetch(table, column, [...new Set(values)])).map((r) => MAPS[kind].fromRow(r)) : [];
async function checkProjects(projectIds, fetch, now) {
  const ids = [...new Set(projectIds.filter(Boolean))];
  const out = { write: [], read: 0, disagrees: 0 };
  if (!ids.length) return out;
  const projects = await many3(fetch, "projects", "id", ids, "projects");
  const running = projects.flatMap((p) => !p.deletedAt && p.flow ? [{ p, flow: p.flow }] : []);
  const [methods, records, assets, snags, kept] = await Promise.all([
    many3(fetch, "methods", "family_id", running.map((r) => r.flow.familyId), "methods"),
    many3(fetch, "flow_records", "project_id", ids, "flow_records"),
    many3(fetch, "commission_assets", "project_id", ids, "commission_assets"),
    many3(fetch, "snags", "project_id", ids, "snags"),
    many3(fetch, "gate_checks", "project_id", ids, "gate_checks")
  ]);
  const studyIds = records.filter((r) => !r.deletedAt && r.studyId).map((r) => r.studyId);
  const studies = await many3(fetch, "studies", "id", studyIds, "studies");
  const found = new Set(studies.map((s) => s.id));
  const standards = await many3(fetch, "standards", "id", studyIds.filter((id) => !found.has(id)), "standards");
  const lossLines = studies.filter((s) => s.tool === "losses" && s.workspaceId).map((s) => s.workspaceId);
  const [workspaces, observations] = await Promise.all([
    many3(fetch, "workspaces", "id", [...lossLines, ...standards.map((s) => s.workspaceId).filter((x) => !!x)], "workspaces"),
    many3(fetch, "observations", "workspace_id", lossLines, "observations")
  ]);
  const tools = readToolsFrom(studyIds, { studies, standards, workspaces, observations });
  const toolsChanged = Object.fromEntries([...studies, ...standards].map((s) => [s.id, s.updatedAt]));
  const readings = /* @__PURE__ */ new Map();
  for (const { p, flow } of running) {
    const family = methods.filter((m) => m.familyId === flow.familyId && !m.deletedAt);
    const defs = Object.fromEntries(family.map((m) => [m.version, m.definition]));
    const x = {
      defs,
      current: flow.version,
      records: records.filter((r) => r.projectId === p.id),
      machines: assets.filter((a) => a.projectId === p.id && !a.deletedAt).sort((a, b) => a.sort - b.sort).map((a) => ({ id: a.id, name: a.name, updatedAt: a.updatedAt })),
      problems: snags.filter((s) => s.projectId === p.id).map((s) => ({
        id: s.id,
        title: s.problem,
        open: s.status !== "closed",
        priority: s.priority ?? "low",
        raisedAt: s.raisedAt,
        ...s.closedAt !== void 0 ? { closedAt: s.closedAt } : {},
        ...s.deletedAt || s.archivedAt ? { goneAt: Math.min(s.deletedAt ?? Infinity, s.archivedAt ?? Infinity) } : {}
      })),
      startedOn: flow.startedOn,
      people: flow.people,
      tools,
      toolsChanged
    };
    for (const r of readPasses(x)) {
      out.read++;
      if (r.verdict === "disagrees") out.disagrees++;
      readings.set(r.passId, asGateCheck(r, p.id, now, kept.find((k2) => k2.id === r.passId)));
    }
  }
  for (const [id, c] of readings) {
    const was = kept.find((k2) => k2.id === id);
    if (was && !was.deletedAt && sameReading(was, c)) continue;
    out.write.push(MAPS.gate_checks.toRow(c, ""));
  }
  for (const k2 of kept) {
    if (k2.deletedAt || readings.has(k2.id)) continue;
    out.write.push(MAPS.gate_checks.toRow({ ...k2, deletedAt: now, updatedAt: now }, ""));
  }
  return out;
}
function toSweep(passes, checks) {
  const by = new Map(checks.filter((c) => !c.deleted_at).map((c) => [c.id, c.verdict]));
  return [...new Set(passes.filter((p) => by.get(p.id) === void 0 || by.get(p.id) === "disagrees").map((p) => p.project_id))];
}
export {
  checkProjects,
  toSweep
};
