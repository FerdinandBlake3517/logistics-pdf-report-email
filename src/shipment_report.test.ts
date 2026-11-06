import assert from "node:assert/strict";
import { buildPdfReport, parseShipmentRequest } from "./shipment_report.js";

const request = parseShipmentRequest({
  shipmentId: "SHP-7",
  recipient: "ops@example.com",
  events: [
    { status: "in_transit", occurredAt: "2026-10-24T10:00:00Z", location: "Ningbo" },
    { status: "exception", occurredAt: "2026-10-24T12:00:00Z", location: "Hangzhou" }
  ],
  proofOfDelivery: [{ name: "pod.pdf", content: "signed" }]
});

const report = buildPdfReport(request);
assert.match(report, /^%PDF-1\.4/);
assert.match(report, /Latest status: exception at Hangzhou/);
assert.match(report, /Proof-of-delivery files: pod\.pdf/);
console.log("shipment decision test passed");
