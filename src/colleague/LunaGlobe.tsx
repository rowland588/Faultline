import type { Ref } from 'react';
import type { VoiceState } from './speech';

interface Props {
  className: string;
  size?: 'mark' | 'stage';
  state?: VoiceState | 'thinking';
  globeRef?: Ref<HTMLSpanElement>;
}

/** Luna's globe, from a quiet conversation avatar to the responsive voice stage. */
export function LunaGlobe({ className, size = 'mark', state, globeRef }: Props) {
  return <span ref={globeRef} className={`luna-globe ${className}${state ? ' is-' + state : ''}`} data-globe-size={size} aria-hidden="true">
    <span className="luna-globe-sphere" />
    <span className="luna-globe-orbit orbit-one" />
    <span className="luna-globe-orbit orbit-two" />
    {size === 'stage' && <span className="luna-globe-orbit orbit-three" />}
  </span>;
}
