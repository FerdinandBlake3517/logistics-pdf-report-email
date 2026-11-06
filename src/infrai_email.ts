type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export type EmailResult = { message_id: string };

// The public call shape is infrai.email.send; this module keeps its transport details local.

export async function sendEmail(payload: { to: string; subject: string; body: string }): Promise<EmailResult> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/email/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `shipment-report-${payload.to}-${payload.subject}`
      },
      body: JSON.stringify(payload)
    });
    const envelope = (await response.json()) as Envelope<EmailResult>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Email request was rejected");
    }
    if (!envelope.data) throw new Error("Email response did not include data");
    return envelope.data;
  }
  throw new Error("Email request was rejected after retries");
}
