import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const ASTRID_EMAIL   = Deno.env.get("ASTRID_EMAIL")!;
const GREEN_INSTANCE = Deno.env.get("GREEN_API_INSTANCE") ?? "";
const GREEN_TOKEN    = Deno.env.get("GREEN_API_TOKEN") ?? "";
const ASTRID_PHONE   = Deno.env.get("ASTRID_PHONE") ?? "";

function starsText(note: number): string {
  return "★".repeat(note) + "☆".repeat(5 - note);
}

function buildEmailHtml(r: Record<string, string>): string {
  const stars = starsText(Number(r.note));
  const loc   = r.quartier ? `<br><span style="color:#6B6B6B;font-size:13px">${r.quartier}</span>` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Georgia,serif;background:#F5F0E8;padding:40px 0;margin:0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#1C1C1C;padding:32px;text-align:center">
      <p style="color:#C9A96E;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Maison Anaya</p>
      <h1 style="color:#fff;font-size:22px;margin:0;font-weight:400">Nouvel avis client</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#6B6B6B;margin:0 0 24px">Bonjour Astrid, un client vient de laisser un avis sur votre site.</p>
      <div style="background:#F5F0E8;border-radius:12px;padding:24px">
        <p style="color:#C9A96E;font-size:20px;margin:0 0 12px;letter-spacing:2px">${stars}</p>
        <p style="color:#1C1C1C;font-size:16px;font-style:italic;line-height:1.7;margin:0 0 16px">"${r.texte}"</p>
        <p style="color:#1C1C1C;font-weight:600;margin:0">— ${r.prenom}${loc}</p>
      </div>
    </div>
    <div style="background:#F5F0E8;padding:20px 32px;text-align:center">
      <p style="color:#6B6B6B;font-size:12px;margin:0">Maison Anaya · Massage à domicile · Pointe-Noire</p>
    </div>
  </div>
</body>
</html>`;
}

function buildWhatsAppText(r: Record<string, string>): string {
  const stars = starsText(Number(r.note));
  const loc   = r.quartier ? `\n📍 *Quartier :* ${r.quartier}` : "";
  return `🌿 *Maison Anaya — Nouvel avis client*

👤 *Client :* ${r.prenom}${loc}
${stars}

💬 "${r.texte}"`;
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const r = payload.record as Record<string, string>;

    // — Email via Resend —
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Maison Anaya <onboarding@resend.dev>",
        to: [ASTRID_EMAIL],
        subject: `Nouvel avis ${starsText(Number(r.note))} — ${r.prenom}`,
        html: buildEmailHtml(r),
      }),
    });

    // — WhatsApp via Green API —
    if (GREEN_INSTANCE && GREEN_TOKEN && ASTRID_PHONE) {
      await fetch(
        `https://api.green-api.com/waInstance${GREEN_INSTANCE}/sendMessage/${GREEN_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: ASTRID_PHONE,
            message: buildWhatsAppText(r),
          }),
        }
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
