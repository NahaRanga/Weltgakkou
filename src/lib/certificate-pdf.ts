import "server-only";
import { LOGO_JPEG, WIDTHS } from "@/lib/certificate-assets";

// Sertifikat dibuat sebagai PDF mentah dengan font standar (Helvetica/Times) dan logo JPEG,
// tanpa library PDF, supaya bundle Worker tetap kecil.

export type CertificateData = {
  number: string;
  name: string;
  programName: string;
  batchName: string;
  period: string; // "16 November 2026 s.d. 5 Februari 2027"
  detail: string; // "60 pertemuan kelas online"
  issuedOn: string; // "5 Februari 2027"
  verifyUrl: string; // "weltgakko.com/sertifikat/WG-26-ABC234"
};

type Font = keyof typeof WIDTHS;
type Rgb = [number, number, number];

const PAGE_W = 841.89;
const PAGE_H = 595.28;
const BLUE: Rgb = [73, 144, 226];
const RED: Rgb = [229, 57, 69];
const YELLOW: Rgb = [245, 194, 77];
const INK: Rgb = [28, 25, 23];
const GREY: Rgb = [120, 113, 108];

// Font standar hanya mengenal huruf Latin: aksen dibuang, huruf lain jadi "?".
export function toPdfText(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e]/g, "?");
}

function textWidth(text: string, font: Font, size: number, spacing = 0) {
  let units = 0;
  for (const ch of text) units += WIDTHS[font][ch.charCodeAt(0) - 32] ?? 500;
  return (units * size) / 1000 + spacing * text.length;
}

const color = ([r, g, b]: Rgb, op: "rg" | "RG") => `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} ${op}`;
const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);

class Canvas {
  ops: string[] = [];

  text(raw: string, x: number, y: number, font: Font, size: number, fill: Rgb, align: "left" | "center" = "left", spacing = 0) {
    const text = toPdfText(raw);
    // Spasi huruf juga ditambahkan setelah huruf terakhir; dikurangi supaya tetap di tengah.
    const left = align === "center" ? x - (textWidth(text, font, size, spacing) - spacing) / 2 : x;
    this.ops.push(`BT /${font} ${size} Tf ${spacing} Tc ${color(fill, "rg")} ${left.toFixed(2)} ${y.toFixed(2)} Td (${escape(text)}) Tj ET`);
  }

  // Ukuran font dikecilkan bila teks lebih lebar dari maxWidth (nama panjang).
  fitText(raw: string, x: number, y: number, font: Font, size: number, min: number, maxWidth: number, fill: Rgb) {
    let s = size;
    while (s > min && textWidth(toPdfText(raw), font, s) > maxWidth) s -= 1;
    this.text(raw, x, y, font, s, fill, "center");
  }

  rect(x: number, y: number, w: number, h: number, stroke: Rgb, width: number) {
    this.ops.push(`${color(stroke, "RG")} ${width} w ${x} ${y} ${w} ${h} re S`);
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: Rgb, width: number) {
    this.ops.push(`${color(stroke, "RG")} ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  poly(points: [number, number][], fill: Rgb) {
    const [first, ...rest] = points;
    this.ops.push(`${color(fill, "rg")} ${first.join(" ")} m ${rest.map((p) => `${p.join(" ")} l`).join(" ")} h f`);
  }

  image(name: string, x: number, y: number, w: number, h: number) {
    this.ops.push(`q ${w} 0 0 ${h} ${x} ${y} cm /${name} Do Q`);
  }
}

function drawCertificate(d: CertificateData) {
  const c = new Canvas();
  const mid = PAGE_W / 2;

  // Hiasan sudut warna logo + bingkai.
  c.poly([[0, PAGE_H], [150, PAGE_H], [0, PAGE_H - 150]], BLUE);
  c.poly([[0, PAGE_H - 165], [0, PAGE_H - 190], [190, PAGE_H], [165, PAGE_H]], YELLOW);
  c.poly([[PAGE_W, 0], [PAGE_W - 150, 0], [PAGE_W, 150]], RED);
  c.poly([[PAGE_W, 165], [PAGE_W, 190], [PAGE_W - 190, 0], [PAGE_W - 165, 0]], YELLOW);
  c.rect(28, 28, PAGE_W - 56, PAGE_H - 56, BLUE, 2);
  c.rect(36, 36, PAGE_W - 72, PAGE_H - 72, YELLOW, 0.8);

  const logoW = 92;
  const logoH = (logoW * LOGO_JPEG.height) / LOGO_JPEG.width;
  c.image("Logo", mid - logoW / 2, 478, logoW, logoH);
  c.text("WELTGAKKO", mid, 456, "F2", 13, BLUE, "center", 4);

  c.text("SERTIFIKAT", mid, 398, "F2", 42, INK, "center", 6);
  c.text("Certificate of Completion", mid, 374, "F1", 13, GREY, "center", 1);

  c.text("Diberikan kepada", mid, 332, "F1", 13, GREY, "center");
  c.fitText(d.name, mid, 284, "F3", 38, 22, 600, INK);
  c.line(mid - 210, 270, mid + 210, 270, RED, 1);

  c.text("atas keberhasilannya menyelesaikan program", mid, 242, "F1", 13, GREY, "center");
  c.fitText(`${d.programName} - ${d.batchName}`, mid, 212, "F2", 21, 14, 640, BLUE);
  c.text(`${d.period}  |  ${d.detail}`, mid, 190, "F1", 11.5, GREY, "center");

  // Kiri bawah: nomor dan tanggal. Kanan bawah: tanda tangan.
  c.text("Nomor sertifikat", 96, 118, "F1", 9, GREY);
  c.text(d.number, 96, 102, "F2", 13, INK, "left", 1);
  c.text(`Diterbitkan ${d.issuedOn}`, 96, 86, "F1", 9.5, GREY);

  const sig = PAGE_W - 196;
  c.line(sig - 90, 112, sig + 90, 112, INK, 0.8);
  c.text("Tim Weltgakko", sig, 97, "F2", 12, INK, "center");
  c.text("Kursus Bahasa Jepang Online", sig, 83, "F1", 9.5, GREY, "center");

  c.text(`Cek keaslian sertifikat di ${d.verifyUrl}`, mid, 52, "F1", 8.5, GREY, "center");
  return c.ops.join("\n");
}

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function certificatePdf(d: CertificateData): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const logo = base64ToBytes(LOGO_JPEG.base64);
  const content = enc.encode(drawCertificate(d));
  const font = (base: string) => `<< /Type /Font /Subtype /Type1 /BaseFont /${base} /Encoding /WinAnsiEncoding >>`;

  const objects: (string | Uint8Array)[][] = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents 4 0 R ` +
        "/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> /XObject << /Logo 8 0 R >> >> >>",
    ],
    [`<< /Length ${content.length} >>\nstream\n`, content, "\nendstream"],
    [font("Helvetica")],
    [font("Helvetica-Bold")],
    [font("Times-BoldItalic")],
    [
      `<< /Type /XObject /Subtype /Image /Width ${LOGO_JPEG.width} /Height ${LOGO_JPEG.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.length} >>\nstream\n`,
      logo,
      "\nendstream",
    ],
    [`<< /Title (${escape(toPdfText(`Sertifikat ${d.name}`))}) /Producer (Weltgakko) >>`],
  ];

  const chunks: Uint8Array[] = [];
  let size = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? enc.encode(part) : part;
    chunks.push(bytes);
    size += bytes.length;
  };

  push("%PDF-1.4\n");
  const offsets: number[] = [];
  objects.forEach((parts, i) => {
    offsets.push(size);
    push(`${i + 1} 0 obj\n`);
    parts.forEach(push);
    push("\nendobj\n");
  });
  const xref = size;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const off of offsets) push(`${String(off).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(size);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}
