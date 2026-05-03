import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY")!;
const ASTRID_EMAIL     = Deno.env.get("ASTRID_EMAIL")!;
const GREEN_INSTANCE   = Deno.env.get("GREEN_API_INSTANCE") ?? "";
const GREEN_TOKEN      = Deno.env.get("GREEN_API_TOKEN") ?? "";
const ASTRID_PHONE     = Deno.env.get("ASTRID_PHONE") ?? ""; // ex: 242055716062@c.us

function formatDateFr(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Africa/Brazzaville",
  });
}

function buildEmailHtml(r: Record<string, string>): string {
  const rows = [
    ["Client",    `${r.prenom} ${r.nom}`],
    ["Soin",      r.soin],
    ["Date",      formatDateFr(r.date)],
    ["Heure",     r.heure],
    ["Adresse",   r.adresse],
    ["Téléphone", r.tel],
    ["Email",     r.email],
  ];

  const tableRows = rows.map(([label, val], i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #EDE6D6;color:#1C1C1C;font-weight:600;width:110px;vertical-align:top">${label}</td>
      <td style="padding:10px 0;border-bottom:${i < rows.length - 1 ? "1px solid #EDE6D6" : "none"};color:#6B6B6B">${val}</td>
    </tr>`).join("");

  const messageBlock = r.message ? `
    <div style="margin-top:20px;background:#F5F0E8;border-radius:8px;padding:16px">
      <p style="color:#6B6B6B;margin:0;font-size:14px">
        <strong style="color:#1C1C1C">Message&nbsp;:</strong> ${r.message}
      </p>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Georgia,serif;background:#F5F0E8;padding:40px 0;margin:0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:#1C1C1C;padding:32px;text-align:center">
      <p style="color:#C9A96E;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Maison Anaya</p>
      <h1 style="color:#fff;font-size:22px;margin:0;font-weight:400">Nouvelle réservation</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#6B6B6B;margin:0 0 24px">Bonjour Astrid, vous avez une nouvelle demande de séance.</p>
      <table style="width:100%;border-collapse:collapse">${tableRows}</table>
      ${messageBlock}
    </div>
    <div style="background:#F5F0E8;padding:20px 32px;text-align:center">
      <p style="color:#6B6B6B;font-size:12px;margin:0">Maison Anaya · Massage à domicile · Pointe-Noire</p>
    </div>
  </div>
</body>
</html>`;
}

function buildWhatsAppText(r: Record<string, string>): string {
  return `🌿 *Maison Anaya — Nouvelle réservation*

👤 *Client :* ${r.prenom} ${r.nom}
💆 *Soin :* ${r.soin}
📅 *Date :* ${formatDateFr(r.date)}
🕐 *Heure :* ${r.heure}
📍 *Adresse :* ${r.adresse}
📞 *Téléphone :* ${r.tel}
📧 *Email :* ${r.email}${r.message ? `\n💬 *Message :* ${r.message}` : ""}`;
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
        subject: `Nouvelle réservation — ${r.soin} · ${r.date} ${r.heure}`,
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
