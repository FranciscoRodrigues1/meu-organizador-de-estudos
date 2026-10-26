import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

export const enviarLembreteSms = createServerFn({ method: "POST" })
  .inputValidator((d: { telefone: string; mensagem: string }) => {
    if (!/^\+\d{10,15}$/.test(d.telefone)) throw new Error("Telefone inválido");
    if (!d.mensagem || d.mensagem.length > 500) throw new Error("Mensagem inválida");
    return d;
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const twilioKey = process.env.TWILIO_API_KEY;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!lovableKey || !twilioKey || !from) throw new Error("SMS não configurado");
    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: data.telefone, From: from, Body: data.mensagem }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Twilio falhou [${res.status}]: ${body}`);
      throw new Error(`Falha ao enviar SMS [${res.status}]`);
    }
    return { ok: true };
  });
