"""Independent worked cases for the Pugh matrix (FC-143, sixsigma.selection-matrices).

Run: python3 -I scripts/knowledge/cases-pugh.py

Pugh (1991) Total Design: the datum scores 0 on every criterion; each option is marked + (better),
S/0 (same) or - (worse) than the datum, criterion by criterion; the pluses and minuses are counted
and, where the criteria are weighted, summed as the weight times the mark. This is a second
implementation, written without the app's code, whose figures the unit tests (src/tools/pugh/__tests__)
and the acceptance script (scripts/acceptance/scored-shape.mjs) are held to.
No published table of numbers for a Pugh matrix exists to check against: the arithmetic is a count and a
weighted sum, so the cases are worked by hand (case 1 is the knowledge record's worked case) and by this script.
"""
import itertools


def score(weights, marks):
    return sum(w * m for w, m in zip(weights, marks))


def leaders(weights, options):
    s = {n: score(weights, m) for n, m in options.items()}
    top = max(s.values())
    return sorted(n for n, v in s.items() if v == top), s


def sensitivity(weights, options):
    """One weight a step up or down (kept 1..5): does the set of leaders change?"""
    base, _ = leaders(weights, options)
    flips = []
    for j, d in itertools.product(range(len(weights)), (+1, -1)):
        w = list(weights)
        w[j] += d
        if not 1 <= w[j] <= 5:
            continue
        now, _ = leaders(w, options)
        if now != base:
            flips.append((j, d, now))
    return flips


def show(title, crit, weights, options):
    print(f"\n== {title}")
    print("  criteria:", ", ".join(f"{c} x{w}" for c, w in zip(crit, weights)))
    lead, s = leaders(weights, options)
    for n, m in sorted(options.items(), key=lambda kv: -score(weights, kv[1])):
        plus = sum(1 for x in m if x > 0)
        minus = sum(1 for x in m if x < 0)
        same = len(m) - plus - minus
        print(f"  {n:18s} +{plus} -{minus} S{same}  weighted {score(weights, m):+d}")
    print("  leader(s):", ", ".join(lead))
    fl = sensitivity(weights, options)
    print("  one-step weight changes that change the leader:", [(crit[j], d, now) for j, d, now in fl] or "none")
    first = sorted(options.items(), key=lambda kv: -score(weights, kv[1]))[0]
    beaten = [(crit[j], [n for n, m in options.items() if m[j] > first[1][j]]) for j in range(len(crit))]
    print(f"  where {first[0]} is beaten:", [(c, o) for c, o in beaten if o] or "nowhere")


# 1. the knowledge record's worked case (film breaks)
crit1 = ["cuts breaks", "cost", "time to do", "safety", "hygiene"]
w1 = [5, 3, 3, 4, 4]
o1 = {"Film guide": [1, 1, 1, 0, 0], "Reel trolley": [1, 0, 0, 1, 0], "New unwind unit": [1, -1, -1, 0, 0], "Second operator": [0, -1, 1, 0, 0]}
show("1. film breaks (record's worked case)", crit1, w1, o1)

# 1b. the same options, no weights (pure Pugh: counts only)
show("1b. the same, all weights 1", crit1, [1] * 5, o1)

# 2. a close call: the leader holds by one point and one step on a weight changes it
crit2 = ["cost", "safety", "speed"]
w2 = [3, 2, 2]
o2 = {"X": [1, 0, 1], "Y": [0, 1, 1]}
show("2. knife-edge", crit2, w2, o2)

# 3. a tie
crit3 = ["cost", "safety", "speed"]
w3 = [2, 2, 1]
o3 = {"P": [1, -1, 1], "Q": [-1, 1, 1], "R": [0, 0, -1]}
show("3. a tie at the top (P and Q, +1 each)", crit3, w3, o3)

# 4. nothing beats the datum
crit4 = ["cost", "time"]
w4 = [3, 2]
o4 = {"M": [-1, 1], "N": [-1, 0]}
show("4. nothing beats the datum", crit4, w4, o4)

# 5. the order depends on the datum (same underlying ratings, higher is better)
r = {"D": [3, 3, 3], "A": [4, 4, 1], "B": [5, 2, 2]}
sign = lambda x: (x > 0) - (x < 0)
for datum in ("D", "A", "B"):
    opts = {n: [sign(a - b) for a, b in zip(v, r[datum])] for n, v in r.items() if n != datum}
    lead, s = leaders([1, 1, 1], opts)
    print(f"\n== 5. datum {datum}: " + ", ".join(f"{n} {v:+d}" for n, v in s.items()) + f"  -> leader {lead}")
