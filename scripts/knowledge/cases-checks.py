"""Independent worked cases for the check log (knowledge/specs/FC-236-check-logs.md; src/tools/checks).

Run: python3 -I scripts/knowledge/cases-checks.py            (prints the cases)
     python3 -I scripts/knowledge/cases-checks.py --write    (writes src/tools/checks/__tests__/cases.json, which the unit tests read)

Every expected number a unit test compares the module with comes from here, worked out a second way:
  - the schedule is walked a minute at a time (the module walks results, not minutes);
  - the 5S score is the record's own worked case (knowledge/methods/lean/five-s.md; scripts/knowledge/cases-lean.py);
  - the zero-failure bound is scipy's beta quantile (the module uses 1 - (1 - conf)^(1/n));
  - the packs held are minutes x rate, worked by hand from knowledge/methods/foodsafety/metal-detection-verification.md.
"""
import json, random, sys
from scipy import stats

MIN = 1
HOUR = 60
DAY = 24 * 60


def grace(interval):
    """a quarter of the interval, at least 5 minutes, at most 12 hours"""
    return min(max(interval / 4, 5), 12 * 60)


def comp(since, interval, results, frm, to):
    """The schedule walked a minute at a time. A due point d is met by the next result, early or late, if it
    comes by d + grace; otherwise it is missed at d + grace and the next due point is d + interval. A result
    meets the due point and the next is the result + interval."""
    g = grace(interval)
    marks = set(results)
    due = since
    expected = on_time = missed = 0
    t = since
    while t <= to:
        # a due point whose grace has just passed is missed (decided at due + g)
        while t > due + g:
            decided = due + g
            if frm <= decided <= to:
                expected += 1
                missed += 1
            due += interval
        if t in marks:
            if frm <= t <= to:
                expected += 1
                on_time += 1
            due = t + interval
        t += 1
    # the points whose grace passed by `to` but that no minute step reached
    while to > due + g:
        decided = due + g
        if frm <= decided <= to:
            expected += 1
            missed += 1
        due += interval
    return dict(expected=expected, onTime=on_time, missed=missed)


def state(since, interval, last, now, bad=False):
    g = grace(interval)
    if bad:
        return 'failed'
    nxt = (last + interval) if last is not None else since
    if now > nxt + g:
        return 'overdue'
    if now >= nxt:
        return 'due'
    if now >= nxt - g:
        return 'soon'
    return 'done'


out = {}

# ---- the schedule: a hand-worked case, then forty random ones
hand = dict(since=0, interval=60, results=[5, 63, 121, 250], frm=0, to=300)
hand['expect'] = comp(hand['since'], hand['interval'], hand['results'], hand['frm'], hand['to'])
print('hand-worked schedule (hourly from 0, results at 5, 63, 121, 250, looked at 300):', hand['expect'])
assert hand['expect'] == dict(expected=5, onTime=4, missed=1)
cases = [hand]
rnd = random.Random(236)
for i in range(40):
    interval = rnd.choice([10, 30, 60, 120, 480, 1440])
    since = rnd.randint(0, 300)
    to = since + rnd.randint(interval, interval * 14)
    n = rnd.randint(0, 12)
    res = sorted(set(rnd.randint(since, to) for _ in range(n)))
    frm = rnd.choice([since, since + (to - since) // 3])
    cases.append(dict(since=since, interval=interval, results=res, frm=frm, to=to, expect=comp(since, interval, res, frm, to)))
out['compliance'] = cases

# ---- one check's state now
states = []
for last, now, interval, bad in [(None, 0, 60, False), (None, 10, 60, False), (None, 40, 60, False), (0, 30, 60, False), (0, 44, 60, False), (0, 45, 60, False), (0, 60, 60, False),
                                 (0, 75, 60, False), (0, 76, 60, False), (0, 30, 60, True), (0, 90, 480, False), (0, 361, 480, False), (0, 480, 480, False), (0, 600, 480, False), (0, 601, 480, False),
                                 (0, 10080 - 721, 10080, False), (0, 10080, 10080, False), (0, 10080 + 721, 10080, False), (0, 7, 10, False), (0, 11, 10, False), (0, 16, 10, False)]:
    states.append(dict(since=0, interval=interval, last=last, now=now, bad=bad, expect=state(0, interval, last, now, bad)))
out['states'] = states

# ---- what a failure holds (metal-detection-verification.md worked case): last good 10:00, failed 11:00, 110 a minute
good, fail = 10 * 60, 11 * 60
out['hold'] = dict(lastGood=good, failedAt=fail, ratePerMin=110, windowMin=fail - good, packs=(fail - good) * 110)
print('held:', out['hold'])
assert out['hold']['packs'] == 6600
# a run: good, good, fail, fail (re-test fails again), good, fail
seq = [('good', 0), ('good', 60), ('fail', 120), ('fail', 135), ('good', 150), ('fail', 215)]
runs = []
last_good = None
prev_bad = False
for kind, t in seq:
    if kind == 'good':
        last_good = t
        prev_bad = False
    else:
        if not prev_bad:
            runs.append(dict(at=t, from_=last_good, windowMin=t - last_good))
        else:
            runs.append(dict(at=t, from_=None, windowMin=0))
        prev_bad = True
out['runs'] = dict(seq=seq, runs=runs)
print('failure runs:', runs)

# ---- the zero-failure bound (what a clean record proves): n checks, none failed, 95%
out['zero'] = [dict(n=n, conf=0.95, bound=float(stats.beta.ppf(0.95, 1, n))) for n in (1, 10, 59, 100, 200, 300)]
print('zero-failure bounds:', [(z['n'], round(z['bound'], 5)) for z in out['zero']])

# ---- the 5S audit (lean.five-s worked case): five S x four questions, 0-4
scores = {"Sort": [4, 3, 4, 3], "Set in order": [3, 3, 2, 3], "Shine": [2, 1, 2, 2], "Standardise": [3, 2, 3, 3], "Sustain": [2, 2, 3, 2]}
tot = sum(sum(v) for v in scores.values())
mx = 5 * 4 * 4
groups = {k: dict(points=sum(v), max=4 * len(v), pct=sum(v) / (4 * len(v)) * 100) for k, v in scores.items()}
out['fiveS'] = dict(scores=scores, points=tot, max=mx, pct=tot / mx * 100, groups=groups,
                    prev=[81, 78, 75, 72], weakest='Shine', fallsInARow=4)
print('5S:', tot, mx, round(tot / mx * 100, 2), {k: round(v['pct'], 1) for k, v in groups.items()})
assert tot == 52 and mx == 80
# with two answers not applicable (excluded from both sides)
na = {"Sort": [4, 3, None, 3], "Set in order": [3, 3, 2, 3], "Shine": [2, 1, 2, 2], "Standardise": [3, 2, 3, 3], "Sustain": [2, 2, 3, None]}
p = sum(x for v in na.values() for x in v if x is not None)
m = 4 * sum(1 for v in na.values() for x in v if x is not None)
out['fiveSna'] = dict(scores=na, points=p, max=m, pct=p / m * 100)
print('5S with two N/A:', p, m, round(p / m * 100, 2))
# the series 81, 78, 75, 72, 65: four falls in a row, the weakest S is Shine; findings below 3 are:
find = {k: [i for i, x in enumerate(v) if x < 3] for k, v in scores.items()}
out['fiveSfindings'] = dict(below=3, items=find, count=sum(len(v) for v in find.values()))
print('5S findings below 3:', out['fiveSfindings'])
# repeats: an earlier audit with these items also below 3
prev_scores = {"Sort": [4, 3, 4, 3], "Set in order": [3, 3, 3, 3], "Shine": [2, 2, 2, 3], "Standardise": [3, 3, 3, 3], "Sustain": [3, 2, 3, 3]}
prev_find = {k: [i for i, x in enumerate(v) if x < 3] for k, v in prev_scores.items()}
rep = {k: sorted(set(find[k]) & set(prev_find[k])) for k in scores}
out['fiveSrepeats'] = dict(prev=prev_scores, repeats=rep, count=sum(len(v) for v in rep.values()))
print('5S repeats against the audit before:', out['fiveSrepeats'])

# the two audits a week apart: the one before (prev_scores) and the record's Line 3 — points, %, falls, repeats
prev_pts = sum(sum(v) for v in prev_scores.values())
out['fiveSseries'] = dict(pcts=[prev_pts / mx * 100, tot / mx * 100], prevPoints=prev_pts, falls=1, repeats=4)
print('5S series:', out['fiveSseries'])
# a GMP audit: 5 sections x 4 questions on 0-2; 17 at 2, two at 1, one at 0 -> 36 of 40 = 90%, three findings below 2
gmp = {"People": [2, 2, 2, 2], "Premises and equipment": [2, 2, 2, 2], "Cleaning and hygiene": [2, 1, 0, 2], "Foreign body control": [2, 1, 2, 2], "Records": [2, 2, 2, 2]}
gp = sum(sum(v) for v in gmp.values())
out['gmp'] = dict(points=gp, max=40, pct=gp / 40 * 100, findings=sum(1 for v in gmp.values() for x in v if x < 2), weakest='Cleaning and hygiene', weakestPct=5 / 8 * 100)
print('GMP audit:', out['gmp'])
assert gp == 36

# ---- a value check: trend by point (condition checks) and the headroom to a limit
vals = [61, 62, 62, 64, 65, 67, 68, 70]
n = len(vals)
s_stat = sum((1 if vals[j] > vals[i] else -1 if vals[j] < vals[i] else 0) for i in range(n) for j in range(i + 1, n))
slopes = sorted((vals[j] - vals[i]) / (j - i) for i in range(n) for j in range(i + 1, n))
sen = slopes[len(slopes) // 2] if len(slopes) % 2 else (slopes[len(slopes) // 2 - 1] + slopes[len(slopes) // 2]) / 2
kendall = stats.kendalltau(range(n), vals)
out['trend'] = dict(values=vals, S=s_stat, sen=sen, tau=float(kendall.statistic), p=float(kendall.pvalue), lo=40, hi=75,
                    headroomPct=(75 - vals[-1]) / (75 - 40) * 100)
print('trend:', out['trend'])

# ---- the line balance of numbers the hub states: a log of three checks, one failed, one overdue, one done
if '--write' in sys.argv:
    with open('src/tools/checks/__tests__/cases.json', 'w') as f:
        json.dump(out, f, indent=1, default=lambda o: None)
    print('written')
