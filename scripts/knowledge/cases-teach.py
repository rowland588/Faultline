"""Independent cases for the documents that teach (FC-225 SOP, FC-223 job breakdown, FC-224 one-point lesson) and for FC-198's tiered meeting.
Plain Python, standard library only; the unit tests (src/tools/doc/__tests__/teach.test.ts) hold the code to these figures.

    python3 scripts/knowledge/cases-teach.py
"""
import re
from datetime import date

print("== P1 SOP: seconds summed by hand, photos matched to steps by the number a caption starts with")
secs = [30, 45, 60, 20, 90, 40, 35, 30]
t = sum(secs)
print(f"  {len(secs)} steps, {t} s = {t // 60} min {t % 60} s")
def step(c):
    m = re.match(r'^\s*(?:step\s*)?(\d{1,3})(?![\d.,]*\d)\s*(?:[-–—:.)]|\s|$)', c or '', re.I)
    return int(m.group(1)) if m and int(m.group(1)) >= 1 else None
caps = ['1 — isolate', 'Step 3: tube seated', '5. guide at 2 mm', '2.5 mm gap', 'the panel', '9 — extra']
got = [step(c) for c in caps]
print("  captions", got)
have = sorted({g for g in got if g and g <= 8})
print("  steps with a photo", have, "without", [k for k in range(1, 9) if k not in have], "unnumbered", sum(1 for g in got if g is None), "beyond", [g for g in got if g and g > 8])
print("  review 2026-10-20 against 2026-11-01:", (date(2026, 11, 1) - date(2026, 10, 20)).days, "days overdue")

print("\n== J1 TWI job instruction: the film-splice teaching record (twi-job-instruction worked case, dated for the example)")
taught_signed = [("2026-09-24","2026-09-25"),("2026-10-01","2026-10-02"),("2026-10-06","2026-10-08"),("2026-10-08","2026-10-10"),("2026-10-13","2026-10-16"),("2026-10-15","2026-10-20")]
days = [(date.fromisoformat(s) - date.fromisoformat(t)).days for t, s in taught_signed]
print(f"  9 trained, 6 signed off = {6/9*100:.1f}%, 3 to try again; days {days} mean {sum(days)/len(days):.4f}")
today = date(2026, 11, 1)
from datetime import timedelta
for (t, s) in taught_signed:
    due = date.fromisoformat(s) + timedelta(days=30)
    print(f"  signed {s} -> re-check due {due} ({'overdue ' + str((today - due).days) + ' d' if due < today else 'not yet'})")
print(f"  money: 9 x (14 - 8) = {9*(14-8)} h x 14.70 = {9*(14-8)*14.70:.2f}")

print("\n== O1 One-point lesson: the film guide trouble case (people.one-point-lesson worked case)")
people = [("Days", True)] * 6 + [("Nights", True)] * 5 + [("Nights", False)]
taught = sum(1 for _, t in people if t)
print(f"  {taught} of {len(people)} = {taught/len(people)*100:.1f}% (92%)")
for sh in ("Days", "Nights"):
    n = [t for s, t in people if s == sh]
    print(f"  {sh}: {sum(n)} of {len(n)} = {sum(n)/len(n)*100:.1f}%")
print("  written 2026-10-20, a week later is 2026-10-27; on 2026-11-01 it is", (date(2026, 11, 1) - date(2026, 10, 20)).days, "days on")
