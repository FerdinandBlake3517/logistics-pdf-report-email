import { z } from "zod";
import { sendEmail } from "./infrai_email.js";

const shipmentRequest = z.object({
  shipmentId: z.string().min(1),
  recipient: z.string().email(),
  events: z.array(z.object({
    status: z.enum(["picked_up", "in_transit", "delivered", "exception"]),
    occurredAt: z.string().datetime(),
    location: z.string().min(1)
  })).min(1),
  proofOfDelivery: z.array(z.object({
    name: z.string().min(1),
    content: z.string().min(1)
  })).default([])
});

export type ShipmentRequest = z.infer<typeof shipmentRequest>;

export function parseShipmentRequest(input: unknown): ShipmentRequest {
  return shipmentRequest.parse(input);
}

export function buildPdfReport(request: ShipmentRequest): string {
  const latest = request.events[request.events.length - 1];
  const files = request.proofOfDelivery.map((file) => file.name).join(", ") || "none";
  return [
    "%PDF-1.4",
    "Shipment report",
    `Shipment: ${request.shipmentId}`,
    `Latest status: ${latest.status} at ${latest.location}`,
    `Proof-of-delivery files: ${files}`,
    "%%EOF"
  ].join("\n");
}

export async function emailShipmentReport(input: unknown): Promise<{ message_id: string; report: string }> {
  const request = parseShipmentRequest(input);
  const report = buildPdfReport(request);
  const result = await sendEmail({
    to: request.recipient,
    subject: `Shipment ${request.shipmentId} report`,
    body: report
  });
  return { message_id: result.message_id, report };
}

if (process.argv[1]?.endsWith("shipment_report.ts")) {
  const input = {
    shipmentId: "SHP-2048",
    recipient: process.env.DEMO_EMAIL_TO ?? "logistics@example.com",
    events: [
      { status: "picked_up", occurredAt: "2026-10-24T08:00:00Z", location: "Shenzhen" },
      { status: "delivered", occurredAt: "2026-10-24T16:30:00Z", location: "Shanghai" }
    ],
    proofOfDelivery: [{ name: "signed-receipt.pdf", content: "signed" }]
  };
  const result = await emailShipmentReport(input);
  console.log(`sent ${result.message_id} for ${input.shipmentId}`);
}
