/* WHICH CUSTOMER IS THIS FOR? (21 November 2026, docs/CONNECTED-LUNA.md X1c — Rowland: "Simple way is connect files to customer; if
 * customer is archived then so is the data … think of it as tenant addresses").
 *
 * A file always has a customer. It is asked ONLY when it cannot be known: several customers in use, all of them shown (none chosen in
 * the top bar), and the conversation on no line. One customer — a consultant's own — is never asked. One question, a row a customer;
 * shut without an answer and nothing is connected. */
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/Icon';

export function WhoseSheet({ customers, onPick, onClose }: { customers: string[]; onPick: (customer: string) => void; onClose: () => void }) {
  return (
    <Sheet open onClose={onClose} title="Which customer?">
      <div className="cn" data-whose-sheet>
        <p className="cn-q">Which customer is this for?</p>
        {customers.map(c => (
          <button key={c} type="button" className="cn-to" onClick={() => onPick(c)} data-whose={c}>
            <span className="cn-to-b"><b>{c}</b></span>
            <Icon name="chevron" size={16} />
          </button>
        ))}
      </div>
    </Sheet>
  );
}
