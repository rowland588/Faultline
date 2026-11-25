import { BASIS_WORD, DOC_KIND_WORD, STATE_WORD } from '../tools/talk/talkAssist';
import type { SavedTalkReport } from '../tools/talk/reportDocuments';
import { useBlobUrl } from '../lib/useBlobUrl';

export function TalkReportDetails({ report }: { report: SavedTalkReport }) {
  const { doc } = report;
  return <details>
    <summary>{doc.title}</summary>
    <p className="sub">{[DOC_KIND_WORD[doc.kind], report.line, report.talk].filter(Boolean).join(' · ')}</p>
    {doc.status && <p><strong>{STATE_WORD[doc.status.state]}</strong> · {doc.status.line}</p>}
    {doc.sections.map((section, i) => <section key={i}>
      <h3>{section.heading}</h3>
      {section.text.split(/\n\s*\n/).filter(Boolean).map((para, n) => <p key={n}>{para}</p>)}
      {section.points.map((point, n) => <p key={n}>
        <strong>{[BASIS_WORD[point.basis], point.state && STATE_WORD[point.state]].filter(Boolean).join(' · ')}</strong> · {point.text}
        {point.owner && <span>Owner · {point.owner}</span>}{point.due && <span>Due · {point.due}</span>}
      </p>)}
      {section.photos.map((photo, n) => <ReportPhoto key={n} label={photo.photo} caption={photo.caption}
        blobKey={report.photos.find(p => p.label === photo.photo)?.blobKey} />)}
    </section>)}
  </details>;
}

function ReportPhoto({ label, caption, blobKey }: { label: string; caption: string; blobKey?: string }) {
  const url = useBlobUrl(blobKey);
  return <figure>{url && <img loading="lazy" src={url} alt={caption || label} className="cr-evidence-photo" />}
    <figcaption>{[label, caption, !url && 'Picture unavailable on this device'].filter(Boolean).join(' · ')}</figcaption></figure>;
}
