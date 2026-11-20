/* LOST TIME HAS ONE COLOUR — a neutral slate, the ink's second shade.
 *
 * Lean visual management: a colour means one thing everywhere. The Pareto
 * bars and the "where it hurt" bars used to take the line's own colour, which
 * on some lines is green (done) or red (late) — so a loss could read as good
 * news, or as an alarm before anybody had looked at the size. A loss bar says
 * how big, not how it is going; the line keeps its colour on its dot.
 *
 * A hex, not a CSS variable, because charts are also drawn into printed and
 * exported copies where a variable would not resolve. */
/* minimal v2 (20 November): the house's own greys — the secondary text for a loss, the ink for the biggest */
export const LOSS = '#616161';
/** The biggest — the vital few — stands out by weight, not by a new hue. */
export const LOSS_TOP = '#242424';
