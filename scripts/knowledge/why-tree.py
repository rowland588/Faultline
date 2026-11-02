#!/usr/bin/env python3
"""FC-148 part B — the why tree, a second implementation written from the spec, not from src/lib/whyTree.ts.

Counts a tree of whys by plain recursion over a parent map and prints the figures the unit test
(src/lib/__tests__/whyTree.test.ts) holds as literals: branches, roots (a shared root once), the branches ending at each,
the open branches and the deepest branch. Run:  python3 scripts/knowledge/why-tree.py   (asserts, exits non-zero on a miss)

A branch ends at a node marked root, at a node whose sameAs names a root, or at a node with no answers under it.
"""
import sys

CAUSE = 'cause'


def read(whys):
    by_id = {w['id']: w for w in whys}
    kids = {}
    top = []
    for w in whys:
        p = w.get('of', CAUSE)
        (kids.setdefault(p, []) if p in by_id else top).append(w['id'])
    depth = {}

    def setd(i, d):
        depth[i] = d
        for k in kids.get(i, []):
            setd(k, d + 1)

    for t in top:
        setd(t, 1)
    roots, opens, branches, deepest = {}, [], 0, 0

    def walk(i):
        nonlocal branches, deepest
        w = by_id[i]
        target = by_id.get(w.get('sameAs'))
        if w.get('root'):
            branches += 1; deepest = max(deepest, depth[i]); roots[i] = roots.get(i, 0) + 1
        elif target is not None and target.get('root'):
            branches += 1; deepest = max(deepest, depth[i]); roots[target['id']] = roots.get(target['id'], 0) + 1
        elif not kids.get(i):
            branches += 1; deepest = max(deepest, depth[i]); opens.append(i)
        else:
            for k in kids[i]:
                walk(k)

    for t in top:
        walk(t)
    return {'branches': branches, 'roots': roots, 'open': opens, 'depth': deepest}


def training(w5_open=False):
    return [
        {'id': 'W1'}, {'id': 'W2'}, {'id': 'W3'},
        {'id': 'W4', 'of': 'W1', 'sameAs': 'W6'},
        {'id': 'W5', 'of': 'W2', **({} if w5_open else {'sameAs': 'W6'})},
        {'id': 'W6', 'of': 'W3', 'root': True},
    ]


cases = {
    'poor training': (read(training()), {'branches': 3, 'roots': {'W6': 3}, 'open': [], 'depth': 2}),
    'poor training, W5 open': (read(training(True)), {'branches': 3, 'roots': {'W6': 2}, 'open': ['W5'], 'depth': 2}),
    'a chain of five, last a root': (
        read([{'id': 'a'}, {'id': 'b', 'of': 'a'}, {'id': 'c', 'of': 'b'}, {'id': 'd', 'of': 'c'}, {'id': 'e', 'of': 'd', 'root': True}]),
        {'branches': 1, 'roots': {'e': 1}, 'open': [], 'depth': 5}),
    'two unrelated roots': (
        read([{'id': 'a', 'root': True}, {'id': 'b', 'root': True}]),
        {'branches': 2, 'roots': {'a': 1, 'b': 1}, 'open': [], 'depth': 1}),
}
bad = 0
for name, (got, want) in cases.items():
    ok = got == want
    print(('ok   ' if ok else 'FAIL ') + name, got)
    bad += 0 if ok else 1
sys.exit(1 if bad else 0)
