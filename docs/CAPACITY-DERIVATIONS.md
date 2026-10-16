# Derivations written BEFORE reading src/lib/capacity.ts (from docs/CAPACITY.md + TOOLKIT Part 1)

F1 Unit chain. Station i counts in unit u_i; k_i = how many of u_{i-1} make one u_i (k_1 = 1).
   Factor to the line's unit F_i = Π_{j≤i} k_j. Speed in the line's unit = rate_i × F_i.
   Worked: bagger 70 bags/min; trays of 8 at 7.5 trays/min = 60 bags/min; pallet of 36 trays F = 288;
   "1 pallet = 36 baskets = 360 units" (10 per basket).

F2 Rejects put back (like-for-like, at the START of the line). A station downstream of
   weigher rejecting r receives (1−r) of the weigher's throughput. For station i to run at its own
   speed S_i (line unit), the start of the line must feed L_i = S_i ÷ Π_{j<i}(1−r_j).
   Worked: weigher 2% before Bagger at 100 → L = 100/0.98 = 102.04 ("102" in the doc).
   What a station MAKES = S_i, nothing put back. Open question: does the station's OWN reject enter
   its like-for-like? Doc says "rejects put back" at start of line; own rejects happen after it
   processes, so I take j<i. (QUESTION if the app differs.)

F3 Running %. Effective speed = plate × running% (the station's own stops as a share of time).
   Good % = 1 − r. Effective like-for-like E_i = L_i × running_i.

F4 Bottleneck = argmin_i E_i. The line never makes more than it. Good off the end of the line
   = (bottleneck's own effective speed S_b×run_b) × Π_{j≥b}(1−r_j) = E_b × Π_all(1−r_j).
   Worked: Bagger 100, packers 95% → 95 good/min; weigher rejecting BEFORE the bagger changes
   nothing the Bagger makes.

F5 Adding capacity at the bottleneck raises the line until the next-slowest takes over — never
   lowers, never past the next-slowest. Speeding a non-bottleneck adds nothing.

F6 A person's rate two ways: "how many in a time" (N a minute, or an hour ÷ 60) and "how long one
   takes" (T seconds → 60/T a minute; T minutes → 1/T a minute). Tray every 8 s → 7.5 a minute.
   Under one a minute said per hour: a pallet every 5 min = 0.2/min = 12 an hour.

F7 ILO rest 9% (5% personal + 4% fatigue). Planned time = T × 1.09, i.e. planned rate = rate ÷ 1.09.
   6 s → 6.54 s ("6.5 s with 9% rest"); 8 s → 8.72 ("8.7 s"). A standard time from the time study
   already carries allowances → factor 1.0. A machine → 1.0. Applied ONCE.

F8 Arrivals at station i = slowest station BEFORE it in the line's unit, put into u_i:
   A_i = min_{j<i} E_j ÷ F_i (rejects between should also come off, strictly: min_j E_j×Π_{j≤k<i}(1−r_k)/F_i).
   Worked: 70 bags/min, 8 to a tray → 8.75 trays/min → one every 6.857 s ("6.9 s").
   Keeps up if planned pace ≥ A_i. "8 s a tray — 8.7 s with rest — 1.9 s too slow": 8.72 − 6.857 = 1.86.
   People needed = ⌈A_i ÷ (one person's planned rate)⌉ = ⌈8.75 ÷ 6.88⌉ = 2.
   Paced load = A_i ÷ planned rate = 1.27; amber when fed straight and load > 0.90 (PACED_LOAD_MAX).

F9 rateAsTime: R a minute typed, R×F_i units/min vs arrivals: 5 pallets/min × 360 = 1,800 units/min;
   1,800/70 = 25.7 ≈ "26 times". Reading as one every R minutes = 1 every 5 min = 0.2/min = 72 units/min,
   close to 70 → asked about, never changed by itself.

F10 Labour cost a pack = people × £/h ÷ (good a minute × 60). 8 × 12.50 = £100/h; 409 bags/h →
   £0.2445 = 24.4p. One more person at a PEOPLE bottleneck: new line = min(next-slowest E,
   E_b × (n+1)/n); cost = (people+1) × rate ÷ (new good/h). Lower when packs added outweigh cost.
   Never offered away from the bottleneck.

F11 V-curve: margin m (owner's, default 10%). Station k places from the bottleneck should run at
   ≥ E_b × (1+m)^k (compounded) — or linear 1 + k·m? Doc: "about 10% faster ... each further machine about
   10% more" — compounded reading (1.1, 1.21, 1.331). Either is a DESIGN choice. Under it → amber.
   Share = E_i ÷ E_b; bottleneck = 100%.

F12 Accumulation: buffer must hold ≥ typical minor stop (min) × critical machine's rate (units/min);
   rule of thumb 2–5 minutes of production. Worked: 1.5 min stop × 100/min = 150 units.

F13 Capacity a shift = (shift − breaks the line stops for − changeovers × minutes) × good/min off end.
   Worked: 480 − 30 = 450; 3 × 42 = 126; 324 × 100 = 32,400 (45,000 with no changeover); 95 good →
   30,780. Changeover comes off the shift once, never also off running %. A break not said, a changeover
   not timed or not counted → left out and said so.

F14 Line speed for the loss count = the bottleneck's OWN speed in the line's unit (what it makes), at
   plate (the loss count counts at ideal speed) — lineLoss packs = minutes of stops that stopped the
   line (bottleneck, whole line, no machine) × that rate; labour = minutes × £/h ÷ 60. Other machine's
   stop → labour only, no packs. No Line capacity → every stop counted, said so.

F15 Three numbers: utilisation = actual ÷ design = 148,000/201,600 = 73.4%; efficiency = actual ÷
   effective = 148,000/175,000 = 84.6%; loading = demand ÷ effective (may exceed 100%).
   Design = plate × planned production time; effective = design − planned losses.

F16 Mix: throughput per constraint minute = (price − materials) × packs the constraint makes a minute.
   A £0.40 × 80 = £32; B £0.60 × 40 = £24 → A first. Fill the week in that order to demand; unmade said.

F17 Several lanes into one place: each lane has its own chain to the merge; the shared stations
   receive the SUM of the lanes' outputs. N identical lanes → N × one lane into the shared stations.
   Bottleneck of the merged line = min(Σ lanes' limits vs shared stations' E).

F18 planToTarget: add a person at the people bottleneck (or say the machine limits) until the
   target is met; each step raises the line monotonically; stops at target; says if a machine stops it.

F19 screenCapacity: station a third of target → say what it would need; V percentages said against
   the bottleneck they are against; a person's rest counted twice (timed standard + 9%) → flag;
   a line that meets its target is NOT told it is short.
