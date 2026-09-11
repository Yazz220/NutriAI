# Folio email templates

These are the launch-ready, email-client-safe templates for Folio. They use the approved Folio plum, paper, ink, and editorial typography without depending on remotely hosted brand images.

## Account confirmation

- Subject: `Confirm your email to open Folio`
- Preheader: `One quick step, then your personal cookbooks are ready.`
- Template: [`../supabase/templates/confirm-sign-up.html`](../supabase/templates/confirm-sign-up.html)
- Delivery owner: Supabase Auth
- Required template variable: `{{ .ConfirmationURL }}`

Paste the subject and HTML into **Supabase → Authentication → Emails → Confirm sign up** after custom SMTP is enabled. Do not enable click tracking or any feature that rewrites the confirmation link.

## Folio Plus welcome

- Subject: `Welcome to Folio Plus`
- Preheader: `Your 40 monthly designed recipe pages are ready.`
- Template: [`folio-plus-welcome.html`](./folio-plus-welcome.html)
- Delivery owner: future Folio lifecycle mailer triggered only after verified RevenueCat entitlement activation

Apple continues to send the purchase receipt, renewal, billing, and refund emails. This template is a separate product welcome message and must never be treated as proof of payment.

## Sender and replies

- Display name: `Folio`
- Reply-to/support: `folio.cookbook.help@outlook.com`
- Recommended production From address: a verified Folio-owned domain address when one is available

The Outlook mailbox is suitable for support and replies. Supabase cannot send branded production auth email from it until a compatible custom SMTP provider is configured. Never commit SMTP passwords, provider API keys, or mailbox credentials.

## Release activation

1. Configure custom SMTP in Supabase Auth.
2. Apply and test the confirmation template on a disposable account.
3. Verify the confirmation link returns to Folio and works with tracking disabled.
4. Keep the Plus welcome template dormant until a transactional sender and an idempotent RevenueCat-to-email delivery path are deliberately added.
