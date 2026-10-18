/* VIDEO STUDY — THE RECORD (docs/VIDEO.md).
 *
 * Rowland, 18 October: "upload a production video, describe the analysis they
 * want in natural language, and receive a structured, reviewable
 * manufacturing study with measurements, findings, calculations and a
 * professional report."
 *
 * A video study is not a new noun beside the tools: it is one use of a tool
 * whose measurements come from footage instead of a stopwatch. The first one
 * is the LINE BALANCE (a `balance` study, lib/ie/balance): its laps are the
 * durations of video events a person has accepted, so the people's stacks,
 * the takt, the Yamazumi, the cost and the paper are the line balance's own.
 * The footage, its facts and the job that reads it sit on the study's facts
 * as `video`; the events as `vevents`, an id-keyed list so two devices
 * reviewing at once both keep theirs (cloud/sync mergeRows, facts nested).
 *
 * Nothing worked out is stored: the cycles, the means, the workload and the
 * report are worked out from the accepted events every time they are read.
 * What a person decided is kept with what the machine first proposed, so a
 * correction never loses the analysis it corrected. */

/** Where the footage stands as a record — what was uploaded and what it is. */
export interface VideoFacts {
  /** The file as it came: its name, its type read from its bytes, its size. */
  fileName: string;
  /** Read from the file's first bytes (lib/mime sniffMime), never its extension. */
  mime: string;
  bytes: number;
  /** Seconds, as the player reads it. */
  durationSec: number;
  width: number;
  height: number;
  /** Frames a second, estimated by playing it and timing the frames presented. */
  fps?: number;
  orientation: 'landscape' | 'portrait' | 'square';
  /** The codec named in the file, where the file names it ("H.264", "HEVC"). */
  codec?: string;
}

/** The job that reads the footage — a lifecycle kept on the record, so it
 *  survives the person leaving and coming back (lib/video/job). */
export type JobState =
  | 'uploaded' | 'queued' | 'extracting' | 'analysing' | 'validating'
  | 'review' | 'reported' | 'failed' | 'cancelled';

export interface VideoJob {
  state: JobState;
  /** 0–1, through the current state. */
  progress: number;
  /** In words: "Reading frame 120 of 300". */
  said?: string;
  /** What went wrong, for a person: never a stack trace. */
  error?: string;
  /** Whether trying again can help (a decode that timed out) or not (a file that is not a video). */
  retryable?: boolean;
  attempts: number;
  /** The settings it ran with — kept so a result can be reproduced. */
  config: ProcessingConfig;
  /** The footage and settings it was read with: the same key is never read twice. */
  key?: string;
  startedAt?: number;
  updatedAt: number;
  finishedAt?: number;
}

/** HOW THE FOOTAGE IS READ — every number that decides what is found. */
export interface ProcessingConfig {
  /** Seconds between the frames compared for movement. */
  sampleSec: number;
  /** The width frames are read at for movement, in pixels. */
  readWidth: number;
  /** The stations in view, left to right: each a band of the picture. */
  zones: VideoZone[];
  /** How far above the quiet level movement must be to count as work, in steps of the spread. */
  sensitivity: number;
  /** Gaps shorter than this inside one piece of work are joined, seconds. */
  joinGapSec: number;
  /** Work shorter than this is not counted, seconds. */
  minEventSec: number;
  /** The version of the reading below, so a later change is never mistaken for the same result. */
  version: string;
}

/** A station in view: a rectangle of the picture, in fractions 0–1. */
export interface VideoZone {
  id: string;
  /** "Workstation 1" — a place, never a person's name. */
  label: string;
  /** Who works there, as a temporary label: "Operator A" — never a name. */
  track: string;
  x0: number; x1: number; y0: number; y1: number;
}

export const EVENT_CATEGORIES = ['work', 'wait', 'walk', 'handling', 'cycle', 'stop', 'other'] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];

export const EVENT_WORD: Record<EventCategory, string> = {
  work: 'Work', wait: 'Waiting', walk: 'Walking', handling: 'Handling', cycle: 'A cycle', stop: 'A stop', other: 'Other',
};

/** Where a record came from. */
export type EvidenceBasis = 'motion' | 'vision' | 'person';

export const BASIS_WORD: Record<EvidenceBasis, string> = {
  motion: 'movement in the picture', vision: 'the assistant, from the frames', person: 'a person',
};

/** What a person decided about it. */
export type ReviewState = 'candidate' | 'accepted' | 'rejected';

/** ONE EVENT IN THE FOOTAGE — a stretch of time at one station, what is seen
 *  in it, and how it is known. Times are the SOURCE video's seconds, always:
 *  never a sample's index, never a clip's own clock. */
export interface VideoEvent {
  id: string;
  start: number;
  end: number;
  category: EventCategory;
  /** The station (VideoZone.id). */
  zone: string;
  /** The temporary label of who is there — "Operator A". */
  track?: string;
  /** What can be SEEN: "movement at Workstation 1", "places a tray". */
  observed: string;
  /** What it is BELIEVED to be, kept apart from what is seen — "fold and tape the case". */
  inferred?: string;
  /** 0–1: how sure the reading is — never shown as certainty. */
  confidence: number;
  /** The source seconds of the frames that support it. */
  frames: number[];
  basis: EvidenceBasis;
  review: ReviewState;
  /** As the analysis first proposed it, kept once a person changes it. */
  proposed?: { start: number; end: number; category: EventCategory; zone: string };
  /** Who reviewed it and when. */
  by?: string;
  at?: number;
  /** What produced it: the reading, its version, the model where one was used. */
  provenance: { provider: string; version: string; model?: string; key?: string };
}

export interface VideoSource {
  /** The original recording — a media blob on this device (db putBlob), never a public address. */
  media: { id: string; blobKey: string; thumbKey?: string; mime: string; capturedAt: number };
  facts: VideoFacts;
  /** What the person said they want to find out, in their words. */
  objective?: string;
  /** What that was read as (lib/video/ask). */
  kind?: VideoStudyKind;
  job: VideoJob;
  /** The demand and the time to make it in, when takt is asked for. */
  demand?: { units: number; unit: string; availableMin: number; per: 'shift' | 'day' };
  /** The footage taken off this record by a person, keeping what was found in it. */
  footageDeletedAt?: number;
  footageDeletedBy?: string;
  /** Every time the report was made, from what. */
  reports?: { at: number; accepted: number; candidates: number; by?: string }[];
}

export type VideoStudyKind = 'balance' | 'cycles' | 'changeover' | 'waiting';

export const KIND_WORD: Record<VideoStudyKind, string> = {
  balance: 'Line balance', cycles: 'Cycle times', changeover: 'Changeover (SMED)', waiting: 'Waiting and idle time',
};

export const READING_VERSION = 'motion-1';
