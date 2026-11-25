/** Account provisioning belongs to the organisation. Keep the provider's setup in a new tab so Connect is still here. */
export function MicrosoftAccountHelp() {
  return (
    <details className="ms-help">
      <summary>Need a Microsoft work or school account?</summary>
      <p>Already part of an organisation? Ask your IT team for an account and access to the files or mailbox you want to use.</p>
      <p>Setting up your own business? Choose a Microsoft 365 business plan with the service you need, then return here to connect.</p>
      <a className="cw-link" href="https://www.microsoft.com/en-gb/microsoft-365/business/compare-all-microsoft-365-business-products" target="_blank" rel="noreferrer">Set up Microsoft 365 for business ↗</a>
    </details>
  );
}
