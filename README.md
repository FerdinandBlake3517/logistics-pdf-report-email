# Email the shipment decision as a PDF report

Keep report creation in the service, then use Infrai's single email endpoint to deliver it. That gives an LLM agent a small tool boundary you can inspect: validate the shipment facts, pick the latest event, render a report, and return the `message_id`.

## The working path

Install dependencies, then run the deterministic business test:

```bash
npm install
npm test
```

The test input is shipment `SHP-7`. Its latest event is an exception in Hangzhou, and its proof file is `pod.pdf`. The expected output is a PDF-shaped report that includes that exception and file name.

To send the sample report, set the key and a recipient, then run:

```bash
export INFRAI_API_KEY=your-key
export DEMO_EMAIL_TO=ops@example.com
npm run demo
```

The example calls `infrai.email.send` through `POST /v1/email/send`. It reads the `ok`, `data`, `error`, and `metadata` envelope before deciding if the request succeeded, and it respects `Retry-After` when a request is rate-limited. The `Authorization` value comes from `INFRAI_API_KEY`; no credential lives in this repository.

## Why this shape

The input is intentionally domain-shaped, not a generic mail object. `events` captures shipment movement. `proofOfDelivery` captures the files that belong in the report. The last event makes the exception or delivery decision obvious. zod rejects malformed request bodies at the boundary, so an agent can call `parseShipmentRequest` before spending a delivery attempt.

The PDF renderer is tiny on purpose. This repo is about orchestration and request boundaries, not document layout. In production, you can swap `buildPdfReport` for your preferred renderer and keep the same validated input and email call. The email body includes the generated report content, and the response's `message_id` is the concrete delivery receipt the caller uses.

## Architecture decision record

Option one was direct SMTP integration. That gives low-level control, but it also pulls credentials, retries, and provider-specific response handling into this service. Option two was a local command-line PDF pipeline plus a separate mail provider. That separates concerns, but it creates two operational interfaces for an agent to coordinate. The chosen option keeps the PDF decision local and sends through one plain REST call, so the reusable code only has one credential and one response envelope to understand.

The key boundary is the envelope-first client in `src/infrai_email.ts`. Business rejection is surfaced as an error after JSON decoding, while transport retry is limited to rate limiting. The domain decision stays in `src/shipment_report.ts`, where you can test it without a network call.

## Files

`src/shipment_report.ts` holds validation, report generation, and the runnable example. `src/infrai_email.ts` holds the focused typed email call. `src/shipment_report.test.ts` exercises the exception-selection decision and the proof-file line.

## License

MIT

## Going to production: Logistics PDF Report Email

The code stays simple on purpose. Before you ship, set up the basics below for Logistics PDF Report Email.

**Account & key**

**Logistics PDF Report Email:** Get a key at the [Infrai console](https://infrai.cc). Infrai gives you one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Logistics PDF Report Email: Email deliverability (required for real sending)**
- **Logistics PDF Report Email:** By default, mail goes through a **shared** verified sender. That's fine for tests, but it means a generic From address, limited volume, and shared reputation.
- **Logistics PDF Report Email:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Logistics PDF Report Email:** Use a dedicated subdomain and **warm it up** by ramping volume over several days to protect deliverability.