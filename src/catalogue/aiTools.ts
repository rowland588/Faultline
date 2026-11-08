/* THE AI TOOLBOX (docs/AI-TOOLBOX.md §1 — Rowland, 8 November: "some of the tools have really advanced AI functionalities. Which I
 * still believe should be in an AI tool box itself ... so it's separated, so we know that they use AI"; "Go ahead with a AI toolbox").
 *
 * The one list of every place a model is used in Faultline: what it does, what it is sent and to whom, and what it never does. The
 * Tools page draws it as a shelf of its own (ToolsScreen), and every tool on it wears an AI mark wherever its card shows (ui/ToolCard)
 * and on its own page (ToolPageScreen). The sums never: every figure in every tool is a formula's (docs/DIRECTION.md, 20 October). */

export interface AiTool {
  /** A stable id. */
  id: string;
  /** Its name, as a person reads it. */
  name: string;
  /** The app tools (registry keys) it lives in or fills — they wear the mark. */
  tools: string[];
  /** What the AI does, in a sentence. */
  does: string;
  /** What it is sent, and to whom. */
  sends: string;
  /** What it never does. */
  never: string;
  /** Where it is opened — an address, or none when it lives inside forms. */
  to?: string;
  /** Where to find it when it has no page of its own. */
  where?: string;
}

export const AI_TOOLS: readonly AiTool[] = [
  {
    id: 'talk', name: 'Line Talk', tools: ['talk'], to: '/talk',
    does: 'Talk or type on the line and it answers like a colleague — asks back, builds on what you said — and writes the walk up as a report.',
    sends: 'What you say, type and photograph on the talk, with what Faultline holds about the line, to Claude (Anthropic) through Faultline’s own gateway.',
    never: 'Works out a figure — every number it quotes is from a tool’s formula, and it says so.',
  },
  {
    id: 'talk-in', name: 'Talk it into a tool', tools: ['processflow', 'spaghetti', 'valuestream'], to: '/talk',
    does: 'Walk the line talking and it fills the process flow chart, the spaghetti diagram or the value stream from what you say — you check the draft, then make it.',
    sends: 'What you say on the talk and the tool’s draft as you have it, to Claude (Anthropic) through Faultline’s gateway.',
    never: 'Classes a step as adding value for you, or adds up anything — the tool works out every figure from what was said.',
    where: 'In Line Talk, pick the kind of walk: Flow diagram, Spaghetti diagram or Value stream.',
  },
  {
    id: 'video-name', name: 'Name the work from the frames', tools: ['video'], to: '/video',
    does: 'In a video study, when you tick it, names what each person is doing in the frames it is shown.',
    sends: 'A few small frames of each station — cropped to the station, no sound — to Claude (Anthropic) through Faultline’s gateway. It is told never to identify anyone.',
    never: 'Times anything — the timing is measured from the footage, and every event is yours to accept or reject.',
    where: 'On a video study, under The reading: tick Name the work from the frames.',
  },
  {
    id: 'voice-note', name: 'Voice note in a form', tools: [],
    does: 'Say a fix, what was found or how a test went, and it is read into the boxes of the form you are on — shown beside what it would change for you to put in or not.',
    sends: 'The recording of what you said, to Google’s Gemini through Faultline’s server.',
    never: 'Writes anything by itself — nothing is saved until you put it in.',
    where: 'The microphone on a problem, a fishbone cause and the forms that offer it.',
  },
];

/** The AI toolbox entries a tool (registry key) is on — the tool wears the mark when there is any. */
export const aiOf = (toolKey: string): AiTool[] => AI_TOOLS.filter(a => a.tools.includes(toolKey));
/** The mark's words for a tool: "Uses AI" when the AI is the tool, "Can be talked in" when AI fills it. */
export function aiMark(toolKey: string): string | undefined {
  const a = aiOf(toolKey);
  if (!a.length) return undefined;
  return a.some(x => x.id === 'talk' || x.id === 'video-name') ? 'Uses AI' : 'Can be talked in · AI';
}
