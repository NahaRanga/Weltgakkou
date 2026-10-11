import "server-only";

// Kirim email lewat Resend. Mengembalikan false bila Resend belum dikonfigurasi,
// supaya pemanggil bisa memakai jalur cadangan (misalnya WhatsApp).
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) {
    console.error("Resend gagal", res.status, await res.text());
    return false;
  }
  return true;
}

export async function notifyAdmin(subject: string, text: string) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return false;
  return sendEmail(to, subject, text);
}
