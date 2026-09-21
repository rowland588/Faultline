/* Faultline — persistence. One IndexedDB per origin; workspaces are isolated by
 * key, not by database.
 *
 * THIS FILE IS A DOOR, NOT A ROOM. It was 1,549 lines holding the schema, the
 * upgrade path, the write signals and every query in the app, which meant every
 * change to any of it happened in the same place and any of it could reach any
 * other part by accident. The code now lives in src/db/, one module per concern,
 * and this re-exports all of it.
 *
 * Re-exported rather than moved-and-updated on purpose: a hundred call sites
 * already import from './db', and rewriting them all in the same commit as the
 * split would have made a behaviour change indistinguishable from an import
 * change in the diff. Nothing outside src/db/ needed editing.
 *
 * THE ONE RULE: src/db/core.ts owns the connection and the signals, every other
 * module imports from it, and it imports from none of them. That is what keeps
 * the split acyclic — and why `dbp` and `opened` exist in exactly one file. Two
 * modules each caching a connection is two upgrade paths racing.
 */

// the shapes stored, and the database itself
export * from './db/rows';
export * from './db/core';

// what the sync layer reaches for, plus this device's own session state
export * from './db/sync';

// the features, in the order the app moves through them
export * from './db/workspaces';
export * from './db/observations';
export * from './db/blobs';
export * from './db/walk';
export * from './db/cases';
export * from './db/projects';
export * from './db/pace';
export * from './db/tree';
export * from './db/testing';
export * from './db/measures';
export * from './db/materials';
