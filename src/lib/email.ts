import "server-only";
import { sendSmtp, smtpConfig } from "@/lib/smtp";

// Kirim email. Utama: SMTP Hostinger (admin@weltgakko.com, butuh secret SMTP_PASSWORD di Cloudflare).
// Cadangan: Resend bila RESEND_API_KEY diisi. Mengembalikan false bila keduanya belum dikonfigurasi
// atau gagal, supaya pemanggil bisa memakai jalur cadangan (misalnya WhatsApp).
export async function sendEmail(to: string | string[], subject: string, text: string): Promise<boolean> {
  const recipients = (Array.isArray(to) ? to : [to]).map((t) => t.trim()).filter(Boolean);
  if (recipients.length === 0) return false;
  const from = process.env.EMAIL_FROM || "Weltgakko <admin@weltgakko.com>";

  const smtp = smtpConfig();
  if (smtp) {
    try {
      await sendSmtp(smtp, from, recipients, subject, text);
      return true;
    } catch (err) {
      console.error("SMTP gagal", err instanceof Error ? err.message : err);
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: recipients, subject, text }),
  });
  if (!res.ok) {
    console.error("Resend gagal", res.status, await res.text());
    return false;
  }
  return true;
}

// Email pengingat ke admin. ADMIN_EMAIL boleh berisi beberapa alamat, dipisah koma.
export async function notifyAdmin(subject: string, text: string) {
  const to = (process.env.ADMIN_EMAIL ?? "").split(",");
  return sendEmail(to, subject, `${text}\n\nBuka admin: https://weltgakko.com/admin`);
}
