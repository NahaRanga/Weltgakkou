import "server-only";

// Klien SMTP mini untuk Cloudflare Workers (TCP lewat `cloudflare:sockets`, TLS langsung di port 465).
// Dipakai untuk email notifikasi admin lewat kotak surat Hostinger admin@weltgakko.com.
// Sengaja tanpa library supaya bundle Worker tetap kecil.

type SmtpConfig = { host: string; port: number; user: string; pass: string };

export function smtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  return { host, port: Number(process.env.SMTP_PORT || 465), user, pass };
}

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

// Header non-ASCII (mis. subjek dengan nama ber-aksen) dikodekan ala RFC 2047.
const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);

// "Weltgakko <admin@weltgakko.com>" -> admin@weltgakko.com
const addressOf = (s: string) => (s.match(/<([^>]+)>/)?.[1] ?? s).trim();

function buildMessage(from: string, to: string[], subject: string, text: string) {
  const name = from.match(/^(.*)<[^>]+>/)?.[1].trim().replace(/^"|"$/g, "");
  const fromHeader = name ? `${encodeHeader(name)} <${addressOf(from)}>` : addressOf(from);
  const body = b64(text.replace(/\r?\n/g, "\r\n"))
    .match(/.{1,76}/g)!
    .join("\r\n");
  return [
    `From: ${fromHeader}`,
    `To: ${to.join(", ")}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${addressOf(from).split("@")[1] ?? "weltgakko.com"}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    body,
  ].join("\r\n");
}

// Percakapan SMTP di atas koneksi yang sudah terbuka (dipisah supaya bisa diuji tanpa TLS).
export async function smtpDialog(
  io: { read: () => Promise<string | null>; write: (s: string) => Promise<void> },
  cfg: Pick<SmtpConfig, "user" | "pass">,
  from: string,
  to: string[],
  subject: string,
  text: string,
) {
  let buffer = "";
  // Baca satu balasan SMTP utuh (baris terakhir berformat "250 ...", bukan "250-...").
  async function reply(expect: number) {
    for (;;) {
      const lines = buffer.split("\r\n");
      const done = lines.slice(0, -1).find((l) => /^\d{3} /.test(l));
      if (done) {
        const idx = buffer.indexOf(done) + done.length + 2;
        const answer = buffer.slice(0, idx);
        buffer = buffer.slice(idx);
        const code = Number(done.slice(0, 3));
        if (Math.floor(code / 100) !== Math.floor(expect / 100)) throw new Error(`SMTP ${code}: ${answer.trim()}`);
        return answer;
      }
      const chunk = await io.read();
      if (chunk === null) throw new Error("SMTP: koneksi ditutup server");
      buffer += chunk;
    }
  }
  const send = (line: string) => io.write(line + "\r\n");

  await reply(220);
  await send("EHLO weltgakko.com");
  await reply(250);
  await send("AUTH LOGIN");
  await reply(334);
  await send(b64(cfg.user));
  await reply(334);
  await send(b64(cfg.pass));
  await reply(235);
  await send(`MAIL FROM:<${addressOf(from)}>`);
  await reply(250);
  for (const rcpt of to) {
    await send(`RCPT TO:<${rcpt}>`);
    await reply(250);
  }
  await send("DATA");
  await reply(354);
  // Titik di awal baris digandakan (dot-stuffing), lalu akhiri dengan baris ".".
  await send(buildMessage(from, to, subject, text).replace(/^\./gm, "..") + "\r\n.");
  await reply(250);
  await send("QUIT");
}

export async function sendSmtp(cfg: SmtpConfig, from: string, to: string[], subject: string, text: string): Promise<void> {
  // node:tls tersedia di Workers lewat flag nodejs_compat (TLS langsung, port 465).
  const tls = await import("node:tls");
  const socket = tls.connect({ host: cfg.host, port: cfg.port, servername: cfg.host });
  socket.setEncoding("utf8");
  const queue: (string | null)[] = [];
  let wake: (() => void) | null = null;
  let failure: Error | null = null;
  const push = (v: string | null) => {
    queue.push(v);
    wake?.();
  };
  socket.on("data", (d: string) => push(d));
  socket.on("end", () => push(null));
  socket.on("close", () => push(null));
  socket.on("error", (e: Error) => {
    failure = e;
    push(null);
  });
  const read = async () => {
    while (queue.length === 0) await new Promise<void>((r) => (wake = r));
    wake = null;
    const v = queue.shift()!;
    if (v === null && failure) throw failure;
    return v;
  };
  const write = (s: string) => new Promise<void>((resolve, reject) => socket.write(s, (err) => (err ? reject(err) : resolve())));

  const timer = setTimeout(() => socket.destroy(new Error("SMTP: waktu habis")), 15_000);
  try {
    await smtpDialog({ read, write }, cfg, from, to, subject, text);
  } finally {
    clearTimeout(timer);
    socket.end();
  }
}
