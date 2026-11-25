# Connect Microsoft to Faultline

## Rowland · Set up once for Opex Elevate

Sign in to Faultline with your owner account and open [Faultline owner setup](https://faultline.opexelevate.co.uk/#/factory/data?ms=1&setup=1). Only the Faultline super administrator can publish the Application ID for everyone. Microsoft permissions come from a separate account in your Opex Elevate Microsoft organisation.

1. **Use the Opex Elevate directory.** If the business already uses Microsoft 365, use its existing work account and directory. Ask your Microsoft administrator to register the app if your work account cannot. If you need a new business account with SharePoint, OneDrive or Exchange Online, [start with Microsoft’s business plans](https://www.microsoft.com/en-gb/microsoft-365/business/compare-all-microsoft-365-business-products).
2. **Register Faultline.** If you use Azure Cloud Shell, copy the command on the owner page and follow the link it prints. With no Azure subscription for Cloud Shell, choose **Or register by hand** and **Open Microsoft Entra**. Register **Faultline** with **Accounts in any organizational directory (multitenant)**. Under **Single-page application**, enter the redirect address below. Add the delegated Microsoft Graph permissions listed on the owner page. Your Microsoft administrator can grant consent for Opex Elevate.
3. **Publish the registration.** Copy the **Application (client) ID** from the registration’s Overview. Return to the owner page and press **Save for everyone**. A setting marked **on this device only** still needs to be saved for everyone. The browser sign-in uses PKCE and requires no client secret.
4. **Prove the first connection.** Sign in with your Opex Elevate work account. Open a workbook you recognise. If you use Outlook, connect a licensed mailbox separately and confirm a test email. Before inviting customers broadly, have a pilot user from a different Microsoft organisation complete the customer steps below.

Production single-page application redirect address

```text
https://faultline.opexelevate.co.uk/ms-auth.html
```

## Customers · Connect your own files or mailbox

1. In Faultline, open **Data connections**. Choose **SharePoint and OneDrive** for files or **Outlook** for mail. In Luna, **＋ → Connect → Microsoft 365** opens the file picker directly.
2. Use your own work or school account. For files, you need access to the SharePoint site or OneDrive files you want to use. For Outlook, you need an Exchange Online mailbox. If you need access, ask your own IT team. Someone starting a new business can open Microsoft business account setup from the connector.
3. If Microsoft requests admin approval, open **Get IT approval** in Faultline, enter your organisation’s Microsoft domain, and give the link to your IT administrator. Return to **Connect** once they approve.
4. Pick the file you want Luna to read. For Outlook, review and confirm the message before sending. For a single file you can also upload a copy, or choose **A link** if its sharing settings allow anyone with the link to read it.

## Before self-service SaaS

Faultline already has businesses, invited members, roles and site or area scopes. For a self-service launch, provision a separate business and its first administrator at sign-up, scope connector access and scheduled work to that business, and test with two independent organisations. Confirm that a person in one cannot see the other’s files, chats, reports, schedules or recipients. Test what happens after consent is revoked. Microsoft publisher verification identifies Opex Elevate on the consent screen and can help with customers’ consent policies. Each customer’s IT team still controls its own tenant. [Microsoft publisher verification](https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview)
