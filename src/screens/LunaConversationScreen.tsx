/* CONVERSATION MODE — Luna Hall full viewport (23 November, docs/LUNA-ROOM.md §5 C1): no frame, voice-first, same conversation engine. */
import { useEffect } from 'react';
import { AiModeScreen } from './AiModeScreen';
import { setAiMode, useAiMode } from '../colleague/aiMode';
import { nav, useRoute } from '../state/useRoute';
import { Icon } from '../ui/Icon';

export function LunaConversationScreen() {
  const route = useRoute();
  const on = useAiMode();
  useEffect(() => {
    document.documentElement.dataset.lunaHall = '1';
    return () => { delete document.documentElement.dataset.lunaHall; };
  }, []);

  if (!on) {
    return (
      <div className="lc-off" data-luna-conversation-off>
        <h1 className="pace-title">AI Mode is off</h1>
        <p className="pace-lede">Conversation mode needs Luna. Turn AI Mode on to talk full screen.</p>
        <button type="button" className="btn btn-primary" onClick={() => setAiMode(true)}><Icon name="spark" size="1.05em" />Turn AI Mode on</button>
        <button type="button" className="btn" onClick={() => nav('/')}>Back to Faultline</button>
      </div>
    );
  }

  return <AiModeScreen route={route} shown hall />;
}