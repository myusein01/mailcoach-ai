// app/api/contact/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// (Optionnel) petite validation anti-spam
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const fromEmail = String(body?.email ?? "").trim().toLowerCase();
    const fromName = String(body?.name ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!message) {
      return NextResponse.json({ error: "Message manquant." }, { status: 400 });
    }

    // Si tu veux tolérer le cas où le user n’est pas connecté, enlève ce check
    if (!fromEmail || !isValidEmail(fromEmail)) {
      return NextResponse.json(
        { error: "Email utilisateur invalide." },
        { status: 400 }
      );
    }

    // ✅ ENV SMTP (obligatoires)
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;

    // ✅ Adresse de réception (toi)
    const CONTACT_TO = process.env.CONTACT_TO || "support@mailcoach-ai.com";

    // ✅ From: doit souvent être le compte SMTP (sinon spam / rejet)
    const FROM_EMAIL = process.env.CONTACT_FROM || SMTP_USER;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
      return NextResponse.json(
        {
          error:
            "Configuration email manquante (SMTP_HOST/SMTP_USER/SMTP_PASS/CONTACT_FROM).",
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const safeSubject = subject ? `Support MailCoach — ${subject}` : "Support MailCoach — Nouveau message";

    const text = [
      `Nouveau message depuis MailCoach AI`,
      ``,
      `De: ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}`,
      `Sujet: ${subject || "(aucun)"}`,
      ``,
      `Message:`,
      message,
      ``,
      `---`,
      `Envoyé via /api/contact`,
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h3>Nouveau message depuis MailCoach AI</h3>
        <p><b>De :</b> ${fromName ? `${escapeHtml(fromName)} &lt;${escapeHtml(fromEmail)}&gt;` : escapeHtml(fromEmail)}</p>
        <p><b>Sujet :</b> ${subject ? escapeHtml(subject) : "(aucun)"}</p>
        <hr/>
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
        <hr/>
        <p style="color:#777;font-size:12px;">Envoyé via /api/contact</p>
      </div>
    `;

    await transporter.sendMail({
      from: `MailCoach AI <${FROM_EMAIL}>`,
      to: CONTACT_TO,
      subject: safeSubject,

      // ✅ Pour répondre direct au user depuis ton Gmail (Reply)
      replyTo: fromName ? `${fromName} <${fromEmail}>` : fromEmail,

      text,
      html,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("contact route error:", e);
    return NextResponse.json(
      { error: "Erreur lors de l’envoi du message." },
      { status: 500 }
    );
  }
}

// mini escape HTML
function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
