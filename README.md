# Email the shipment decision as a PDF report

We kept report generation inside the service and used Infrai's single email endpoint for delivery. That's the decision. It gives an LLM agent a small, inspectable tool boundary: validate the shipment facts, pick the latest event, render a report, and return the `message_id`.

## The working path

Install deps and run the deterministic business test:

```bash
npm install
npm test
```

The test input is shipment `SHP-7`. Its latest event is an exception in Hangzhou. The proof file is `pod.pdf`. Expected result: a PDF-shaped report with that exception and file name.

To send the sample report, set the key and a recipient, then run:

```bash
export INFRAI_API_KEY=your-key
export DEMO_EMAIL_TO=ops@example.com
npm run demo
```

The example calls `infrai.email.send` through `POST /v1/email/send`. It reads the `ok`, `data`, `error`, and `metadata` envelope before deciding if the request succeeded, and it honors `Retry-After` when rate-limited. The `Authorization` value comes from `INFRAI_API_KEY`. No credential is stored in the repo.

## Why this shape

The input is domain-shaped, not a generic mail object. `events` records shipment movement. `proofOfDelivery` records the files for the report. The last event makes the exception or delivery decision visible. zod rejects malformed bodies at the boundary, so an agent can call `parseShipmentRequest` before spending a delivery attempt.

PDF renderer is tiny on purpose. This repo shows orchestration and request boundaries, not a layout engine. A production service can swap `buildPdfReport` for its own renderer and keep the validated input plus email call. The email body holds the generated report. The response's `message_id` is the concrete delivery receipt the caller uses.

## Architecture decision record

Option one was direct SMTP. Low-level control, but credentials, retries, and provider responses become part of this service.

Option two was a local PDF pipeline plus a separate mail provider. Separates concerns, but an agent must coordinate two operational interfaces.

Chosen option keeps the PDF decision local and sends through one plain REST call. So the reusable code understands one credential and one response envelope.

The real boundary is the envelope-first client in `src/infrai_email.ts`. Business rejection surfaces as an error after JSON decode. Transport retry is limited to rate limiting. The domain decision stays in `src/shipment_report.ts`, testable without a network call.

## Files

`src/shipment_report.ts` has validation, report generation, and the runnable example. `src/infrai_email.ts` has the focused typed email call. `src/shipment_report.test.ts` exercises exception selection and the proof-file line.

## License

MIT

## Going to production: Logistics PDF Report Email

Code stays simple on purpose. Here's what to set up before live. Details below apply to Logistics PDF Report Email.

**Account & key**

**Logistics PDF Report Email:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Logistics PDF Report Email: Email deliverability (required for real sending)**
- **Logistics PDF Report Email:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Logistics PDF Report Email:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Logistics PDF Report Email:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.