/* Artifact strip in Conversation mode — what Luna made or opened stays visible on the glass surface. */
import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import type { CapRef } from '../capabilities/types';
import { artifactPreview, canPresentOnScreen } from './conversationArtifact';

export interface ConversationArtifactProps {
  work: CapRef | null;
  preview: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDismiss: () => void;
  onPresent?: (reportId: string) => void;
  children?: ReactNode;
}

export function ConversationArtifactStrip(p: ConversationArtifactProps) {
  if (!p.work && !p.preview.trim()) return null;
  const title = p.work?.label ?? 'What Luna is working on';
  const line = artifactPreview(p.preview, p.work ? `Open ${p.work.label}` : '');
  const presentId = p.work && canPresentOnScreen(p.work) ? p.work.id.split('@')[0] : undefined;
  return (
    <aside
      className={'lc-artifact' + (p.open ? ' is-open' : '')}
      aria-label="Artifact from Luna"
      data-conversation-artifact
      data-conversation-artifact-open={p.open ? 'yes' : 'no'}
    >
      <div className="lc-artifact-bar">
        <span className="lc-artifact-k"><Icon name="spark" size={14} /> {title}</span>
        {line && <p className="lc-artifact-preview">{line}</p>}
        <div className="lc-artifact-acts">
          {p.work && (
            <button type="button" className="btn btn-sm" data-conversation-artifact-open onClick={p.onOpen}>
              {p.open ? 'On screen' : 'Open'}
            </button>
          )}
          {presentId && p.onPresent && (
            <button type="button" className="btn btn-sm ghost" data-conversation-artifact-present onClick={() => p.onPresent?.(presentId)}>
              Put on screen
            </button>
          )}
          {p.open && (
            <button type="button" className="btn btn-sm ghost" data-conversation-artifact-back onClick={p.onClose} aria-label="Back to conversation">
              <Icon name="chevronLeft" size="1em" /> Back
            </button>
          )}
          <button type="button" className="lc-icon" onClick={p.onDismiss} aria-label="Dismiss artifact bar" title="Dismiss">
            <Icon name="close" size="1em" />
          </button>
        </div>
      </div>
      {p.open && p.children && <div className="lc-artifact-pane" data-conversation-artifact-pane>{p.children}</div>}
    </aside>
  );
}

/** Inline chip in the chat thread — opens the work pane. */
export function ConversationArtifactCard({ ref: r, preview, onOpen }: { ref: CapRef; preview?: string; onOpen: () => void }) {
  const line = artifactPreview(preview, r.label);
  return (
    <button type="button" className="lc-artifact-card" data-conversation-artifact-card data-artifact={`${r.kind}:${r.id}`} onClick={onOpen}>
      <span className="lc-artifact-card-k">{r.kind === 'page' ? 'Page' : r.kind[0].toUpperCase() + r.kind.slice(1)}</span>
      <span className="lc-artifact-card-t"><b>{r.label}</b>{line !== r.label && <span className="sub"> · {line}</span>}</span>
      <Icon name="chevron" size={14} />
    </button>
  );
}