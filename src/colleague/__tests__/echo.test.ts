/* LUNA DOES NOT HEAR HERSELF (10 November — Rowland: "When the AI speaks it hears its own voice, this then causes issues"):
 * the phone's own microphone is never taken for a headset, her late words after she stops are known as hers, and a short
 * real answer just after her question is still the person's. */
import { describe, expect, it } from 'vitest';
import { isEcho, isEchoTail } from '../speech';
import { isHeadset, listenWhileSpeaking } from '../voicePrefs';

describe('the phone’s own microphone is not a headset', () => {
  it('Android’s built-in names are never a headset — so the microphone is closed while she speaks on the speaker', () => {
    for (const l of ['Headset earpiece', 'Speakerphone', 'Default', 'Built-in Microphone', 'Communications - Default', 'Internal Speaker']) expect(isHeadset(l)).toBe(false);
    expect(listenWhileSpeaking({ talkOver: 'auto' }, { headset: isHeadset('Headset earpiece'), known: true })).toBe(false);
  });
  it('a headset the person wears is one', () => {
    for (const l of ['Bluetooth headset', 'Galaxy Buds2 Pro (Bluetooth)', 'AirPods Pro', 'Wired headset', 'Jabra Evolve hands-free']) expect(isHeadset(l)).toBe(true);
  });
});

describe('her own words, late after she stops', () => {
  const said = 'The wrapper has stopped twice this shift. Is it the wrapper or the filler that worries you most?';
  it('a run of her words in her order is hers', () => {
    expect(isEchoTail('the filler that worries you most', said)).toBe(true);
    expect(isEchoTail('worries you', said)).toBe(false);
    expect(isEchoTail('you most', said)).toBe(true);
    expect(isEchoTail('most', said)).toBe(true);
  });
  it('a short real answer that shares her words is the person’s', () => {
    expect(isEchoTail('the wrapper', said)).toBe(false);
    expect(isEchoTail('the filler', said)).toBe(false);
    expect(isEchoTail('yes do it', said)).toBe(false);
    expect(isEchoTail('it stopped on the wrapper again after the reel change', said)).toBe(false);
  });
  it('while she speaks, her words heard back are hers and the person talking over her is not', () => {
    expect(isEcho('twice this shift is it the wrapper', said)).toBe(true);
    expect(isEcho('no hold on I meant line three', said)).toBe(false);
  });
});
