import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

export const PAGE: [number, number] = [595.28, 841.89];
export const ML = 54;
const MR = 54;
const MT = 72;
const MB = 64;

export const C = {
  ink: rgb(0.06, 0.09, 0.16),
  body: rgb(0.2, 0.25, 0.33),
  muted: rgb(0.45, 0.5, 0.58),
  line: rgb(0.86, 0.88, 0.92),
  zebra: rgb(0.965, 0.972, 0.984),
  indigo: rgb(0.31, 0.27, 0.9),
  indigoSoft: rgb(0.93, 0.93, 1),
  indigoLight: rgb(0.65, 0.66, 1),
  codeBg: rgb(0.07, 0.09, 0.15),
  code: rgb(0.78, 0.93, 0.84),
  white: rgb(1, 1, 1),
  red: rgb(0.86, 0.15, 0.15),
  redSoft: rgb(0.996, 0.95, 0.95),
  amber: rgb(0.85, 0.55, 0.05),
  amberSoft: rgb(1, 0.97, 0.9),
  green: rgb(0.02, 0.59, 0.41),
  greenSoft: rgb(0.93, 0.99, 0.96),
  sky: rgb(0.05, 0.55, 0.85),
  violet: rgb(0.49, 0.23, 0.93),
  slate: rgb(0.58, 0.64, 0.72),
};

const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const REPLACE: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "↔": "<->",
  "≤": "<=",
  "≥": ">=",
  "✓": "v",
  "★": "*",
  "─": "-",
  "│": "|",
  "├": "|",
  "└": "`",
  "┌": "+",
  "≈": "~",
  "ı": "i",
  "\t": "  ",
};

/** Make any string encodable with the standard (WinAnsi) PDF fonts. */
export function sanitize(input: string): string {
  let out = "";
  for (const ch of input) {
    if (REPLACE[ch] !== undefined) {
      out += REPLACE[ch];
      continue;
    }
    const code = ch.codePointAt(0) ?? 63;
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255) || WIN_ANSI_EXTRA.includes(ch) || ch === "\n") out += ch;
    else out += "?";
  }
  return out;
}

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont; mono: PDFFont; monoBold: PDFFont };
export type Column = { header: string; width: number; mono?: boolean; bold?: boolean };

export class PdfBuilder {
  page!: PDFPage;
  y = 0;
  readonly width = PAGE[0] - ML - MR;
  headings: { level: 1 | 2; text: string; page: number }[] = [];

  private constructor(
    readonly doc: PDFDocument,
    readonly f: Fonts,
    private meta: { title: string; short: string; docId: string; classification: string },
  ) {}

  static async create(meta: { title: string; short: string; docId: string; classification: string; subject: string }) {
    const doc = await PDFDocument.create();
    doc.setTitle(meta.title);
    doc.setSubject(meta.subject);
    doc.setAuthor("Marina Heights Facility Management");
    doc.setCreator("Building Service Desk");
    doc.setProducer("Building Service Desk PDF engine (pdf-lib)");
    doc.setKeywords(["service desk", "SLA", "facility management", meta.docId]);
    doc.setCreationDate(new Date());
    const f: Fonts = {
      regular: await doc.embedFont(StandardFonts.Helvetica),
      bold: await doc.embedFont(StandardFonts.HelveticaBold),
      italic: await doc.embedFont(StandardFonts.HelveticaOblique),
      mono: await doc.embedFont(StandardFonts.Courier),
      monoBold: await doc.embedFont(StandardFonts.CourierBold),
    };
    return new PdfBuilder(doc, f, meta);
  }

  newPage() {
    this.page = this.doc.addPage(PAGE);
    this.y = PAGE[1] - MT;
    return this.page;
  }

  ensure(h: number) {
    if (!this.page || this.y - h < MB) this.newPage();
  }

  space(h = 8) {
    this.y -= h;
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const out: string[] = [];
    for (const para of sanitize(text).split("\n")) {
      const words = para.split(/ +/);
      let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(test, size) <= maxWidth) {
          line = test;
          continue;
        }
        if (line) out.push(line);
        if (font.widthOfTextAtSize(w, size) > maxWidth) {
          let chunk = "";
          for (const ch of w) {
            if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
              out.push(chunk);
              chunk = ch;
            } else chunk += ch;
          }
          line = chunk;
        } else line = w;
      }
      out.push(line);
    }
    return out;
  }

  private drawLines(lines: string[], x: number, size: number, font: PDFFont, color: RGB, lineHeight: number) {
    for (const l of lines) {
      this.ensure(lineHeight);
      if (l) this.page.drawText(l, { x, y: this.y - size, size, font, color });
      this.y -= lineHeight;
    }
  }

  titlePage(opts: { kicker: string; title: string; subtitle: string; meta: [string, string][]; footer: string }) {
    const p = this.newPage();
    const [W, H] = PAGE;
    p.drawRectangle({ x: 0, y: H - 330, width: W, height: 330, color: C.ink });
    p.drawRectangle({ x: 0, y: H - 334, width: W, height: 4, color: C.indigo });
    p.drawRectangle({ x: ML, y: H - 96, width: 44, height: 4, color: C.indigo });
    p.drawText(sanitize(opts.kicker.toUpperCase()), { x: ML, y: H - 118, size: 9, font: this.f.bold, color: C.indigoLight });
    let y = H - 158;
    for (const l of this.wrap(opts.title, this.f.bold, 27, this.width)) {
      p.drawText(l, { x: ML, y, size: 27, font: this.f.bold, color: C.white });
      y -= 33;
    }
    y -= 4;
    for (const l of this.wrap(opts.subtitle, this.f.regular, 12, this.width)) {
      p.drawText(l, { x: ML, y, size: 12, font: this.f.regular, color: rgb(0.8, 0.83, 0.9) });
      y -= 17;
    }
    y = H - 390;
    for (const [k, v] of opts.meta) {
      p.drawText(sanitize(k), { x: ML, y, size: 8.5, font: this.f.bold, color: C.muted });
      const lines = this.wrap(v, this.f.regular, 10, this.width - 150);
      lines.forEach((l, i) => p.drawText(l, { x: ML + 150, y: y - i * 13, size: 10, font: this.f.regular, color: C.ink }));
      y -= Math.max(1, lines.length) * 13 + 9;
      p.drawLine({ start: { x: ML, y: y + 4 }, end: { x: W - MR, y: y + 4 }, thickness: 0.4, color: C.line });
    }
    p.drawText(sanitize(opts.footer), { x: ML, y: 70, size: 8, font: this.f.italic, color: C.muted });
  }

  h1(text: string, newPage = true) {
    if (newPage) this.newPage();
    else this.ensure(70);
    this.headings.push({ level: 1, text, page: this.doc.getPageCount() - 1 });
    this.page.drawRectangle({ x: ML, y: this.y - 2, width: 34, height: 3, color: C.indigo });
    this.y -= 14;
    this.drawLines(this.wrap(text, this.f.bold, 17, this.width), ML, 17, this.f.bold, C.ink, 22);
    this.y -= 6;
  }

  h2(text: string) {
    this.ensure(48);
    this.y -= 8;
    this.headings.push({ level: 2, text, page: this.doc.getPageCount() - 1 });
    this.drawLines(this.wrap(text, this.f.bold, 12.5, this.width), ML, 12.5, this.f.bold, C.ink, 17);
    this.y -= 3;
  }

  h3(text: string) {
    this.ensure(34);
    this.y -= 4;
    this.drawLines(this.wrap(text, this.f.bold, 10.5, this.width), ML, 10.5, this.f.bold, C.indigo, 14);
    this.y -= 2;
  }

  p(text: string, opts: { size?: number; color?: RGB; italic?: boolean; indent?: number } = {}) {
    const size = opts.size ?? 9.5;
    const font = opts.italic ? this.f.italic : this.f.regular;
    const indent = opts.indent ?? 0;
    this.drawLines(this.wrap(text, font, size, this.width - indent), ML + indent, size, font, opts.color ?? C.body, size * 1.45);
    this.y -= 5;
  }

  bullets(items: string[], opts: { size?: number; numbered?: boolean } = {}) {
    const size = opts.size ?? 9.5;
    const lh = size * 1.45;
    items.forEach((item, idx) => {
      const lines = this.wrap(item, this.f.regular, size, this.width - 16);
      this.ensure(lh * Math.min(lines.length, 2));
      const marker = opts.numbered ? `${idx + 1}.` : "•";
      this.page.drawText(marker, { x: ML + 3, y: this.y - size, size, font: opts.numbered ? this.f.bold : this.f.regular, color: C.indigo });
      this.drawLines(lines, ML + 16, size, this.f.regular, C.body, lh);
      this.y -= 1.5;
    });
    this.y -= 5;
  }

  table(columns: Column[], rows: string[][], opts: { size?: number; header?: RGB } = {}) {
    const size = opts.size ?? 8;
    const lh = size * 1.38;
    const padX = 4.5;
    const padY = 4;
    const total = columns.reduce((a, c) => a + c.width, 0);
    const widths = columns.map((c) => (c.width / total) * this.width);
    const fontFor = (c: Column) => (c.mono ? this.f.mono : c.bold ? this.f.bold : this.f.regular);

    const drawHeader = () => {
      const hl = columns.map((c, i) => this.wrap(c.header, this.f.bold, size, widths[i] - padX * 2));
      const h = Math.max(...hl.map((l) => l.length)) * lh + padY * 2;
      this.ensure(h + lh * 3);
      this.page.drawRectangle({ x: ML, y: this.y - h, width: this.width, height: h, color: opts.header ?? C.ink });
      let x = ML;
      hl.forEach((lines, i) => {
        lines.forEach((l, j) => this.page.drawText(l, { x: x + padX, y: this.y - padY - size - j * lh + 1.2, size, font: this.f.bold, color: C.white }));
        x += widths[i];
      });
      this.y -= h;
    };

    drawHeader();
    rows.forEach((row, ri) => {
      const cells = columns.map((c, i) => this.wrap(row[i] ?? "", fontFor(c), size, widths[i] - padX * 2));
      const h = Math.max(1, ...cells.map((l) => l.length)) * lh + padY * 2;
      if (this.y - h < MB) {
        this.newPage();
        drawHeader();
      }
      if (ri % 2 === 1) this.page.drawRectangle({ x: ML, y: this.y - h, width: this.width, height: h, color: C.zebra });
      let x = ML;
      cells.forEach((lines, i) => {
        const font = fontFor(columns[i]);
        lines.forEach((l, j) => {
          if (l) this.page.drawText(l, { x: x + padX, y: this.y - padY - size - j * lh + 1.2, size, font, color: columns[i].bold ? C.ink : C.body });
        });
        x += widths[i];
      });
      this.page.drawLine({ start: { x: ML, y: this.y - h }, end: { x: ML + this.width, y: this.y - h }, thickness: 0.4, color: C.line });
      this.y -= h;
    });
    this.y -= 10;
  }

  code(text: string, opts: { size?: number; title?: string } = {}) {
    const size = opts.size ?? 7.4;
    const lh = size * 1.42;
    const pad = 8;
    const maxChars = Math.floor((this.width - pad * 2) / (size * 0.6));
    const lines: string[] = [];
    for (const raw of sanitize(text).split("\n")) {
      if (raw.length <= maxChars) lines.push(raw);
      else for (let i = 0; i < raw.length; i += maxChars) lines.push(raw.slice(i, i + maxChars));
    }
    if (opts.title) {
      this.ensure(14 + lh * 3);
      this.page.drawText(sanitize(opts.title), { x: ML, y: this.y - 8, size: 8, font: this.f.bold, color: C.muted });
      this.y -= 13;
    }
    let i = 0;
    while (i < lines.length) {
      let n = Math.floor((this.y - MB - pad * 2) / lh);
      if (n < 3) {
        this.newPage();
        continue;
      }
      n = Math.min(n, lines.length - i);
      const h = n * lh + pad * 2;
      this.page.drawRectangle({ x: ML, y: this.y - h, width: this.width, height: h, color: C.codeBg });
      for (let k = 0; k < n; k++) {
        const l = lines[i + k];
        if (l) this.page.drawText(l, { x: ML + pad, y: this.y - pad - size - k * lh + 1.5, size, font: this.f.mono, color: C.code });
      }
      this.y -= h;
      i += n;
      if (i < lines.length) this.newPage();
    }
    this.y -= 10;
  }

  callout(text: string, tone: "info" | "warn" | "ok" | "danger" = "info", title?: string) {
    const bg = tone === "warn" ? C.amberSoft : tone === "ok" ? C.greenSoft : tone === "danger" ? C.redSoft : C.indigoSoft;
    const bar = tone === "warn" ? C.amber : tone === "ok" ? C.green : tone === "danger" ? C.red : C.indigo;
    const size = 9;
    const lh = size * 1.45;
    const lines = this.wrap(text, this.f.regular, size, this.width - 26);
    const h = lines.length * lh + (title ? 14 : 0) + 14;
    this.ensure(h);
    this.page.drawRectangle({ x: ML, y: this.y - h, width: this.width, height: h, color: bg });
    this.page.drawRectangle({ x: ML, y: this.y - h, width: 3, height: h, color: bar });
    let y = this.y - 7;
    if (title) {
      this.page.drawText(sanitize(title), { x: ML + 14, y: y - 9, size: 9, font: this.f.bold, color: C.ink });
      y -= 14;
    }
    lines.forEach((l) => {
      this.page.drawText(l, { x: ML + 14, y: y - size, size, font: this.f.regular, color: C.body });
      y -= lh;
    });
    this.y -= h + 10;
  }

  /* ----------------------------- drawing helpers ---------------------------- */

  rect(x: number, yTop: number, w: number, h: number, fill?: RGB, stroke?: RGB, borderWidth = 0.8) {
    this.page.drawRectangle({ x, y: yTop - h, width: w, height: h, color: fill, borderColor: stroke, borderWidth: stroke ? borderWidth : 0 });
  }

  textAt(str: string, x: number, y: number, opts: { size?: number; font?: PDFFont; color?: RGB; align?: "left" | "center" | "right" } = {}) {
    const size = opts.size ?? 8;
    const font = opts.font ?? this.f.regular;
    const s = sanitize(str);
    const w = font.widthOfTextAtSize(s, size);
    const dx = opts.align === "center" ? -w / 2 : opts.align === "right" ? -w : 0;
    this.page.drawText(s, { x: x + dx, y, size, font, color: opts.color ?? C.body });
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB = C.slate, thickness = 0.9, dash?: number[]) {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color, dashArray: dash });
  }

  arrowHead(tipX: number, tipY: number, fromX: number, fromY: number, color: RGB = C.slate, size = 5.5) {
    const H = PAGE[1];
    const ang = Math.atan2(tipY - fromY, tipX - fromX);
    const p1 = [tipX - size * Math.cos(ang - 0.42), tipY - size * Math.sin(ang - 0.42)];
    const p2 = [tipX - size * Math.cos(ang + 0.42), tipY - size * Math.sin(ang + 0.42)];
    this.page.drawSvgPath(`M ${tipX} ${H - tipY} L ${p1[0]} ${H - p1[1]} L ${p2[0]} ${H - p2[1]} Z`, { x: 0, y: H, color });
  }

  arrow(x1: number, y1: number, x2: number, y2: number, color: RGB = C.slate, thickness = 0.9) {
    this.line(x1, y1, x2, y2, color, thickness);
    this.arrowHead(x2, y2, x1, y1, color);
  }

  curveArrow(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, color: RGB = C.slate, thickness = 0.9) {
    const H = PAGE[1];
    this.page.drawSvgPath(`M ${x1} ${H - y1} Q ${cx} ${H - cy} ${x2} ${H - y2}`, { x: 0, y: H, borderColor: color, borderWidth: thickness });
    this.arrowHead(x2, y2, cx, cy, color);
  }

  insertToc() {
    const all = this.headings;
    const entries = all.length > 46 ? all.filter((h) => h.level === 1) : all;
    const page = this.doc.insertPage(1, PAGE);
    let y = PAGE[1] - MT;
    page.drawRectangle({ x: ML, y: y - 2, width: 34, height: 3, color: C.indigo });
    y -= 14;
    page.drawText("Table of Contents", { x: ML, y: y - 17, size: 17, font: this.f.bold, color: C.ink });
    y -= 40;
    for (const h of entries) {
      if (y < MB) break;
      const size = h.level === 1 ? 10 : 9;
      const font = h.level === 1 ? this.f.bold : this.f.regular;
      const indent = h.level === 1 ? 0 : 16;
      const num = String(h.page + 2);
      const numW = this.f.regular.widthOfTextAtSize(num, size);
      let label = sanitize(h.text);
      while (font.widthOfTextAtSize(label, size) > this.width - indent - 40 && label.length > 4) label = `${label.slice(0, -4)}...`;
      const labelW = font.widthOfTextAtSize(label, size);
      page.drawText(label, { x: ML + indent, y, size, font, color: h.level === 1 ? C.ink : C.body });
      page.drawText(num, { x: ML + this.width - numW, y, size, font: this.f.regular, color: C.muted });
      page.drawLine({
        start: { x: ML + indent + labelW + 6, y: y + 2 },
        end: { x: ML + this.width - numW - 6, y: y + 2 },
        thickness: 0.6,
        color: C.line,
        dashArray: [1, 2.5],
      });
      y -= h.level === 1 ? 18 : 14.5;
    }
  }

  async finalize(): Promise<Uint8Array> {
    const pages = this.doc.getPages();
    const total = pages.length;
    const [W, H] = PAGE;
    pages.forEach((p, i) => {
      if (i === 0) return;
      p.drawText(sanitize(this.meta.short), { x: ML, y: H - 42, size: 7.5, font: this.f.bold, color: C.muted });
      const idW = this.f.regular.widthOfTextAtSize(this.meta.docId, 7.5);
      p.drawText(this.meta.docId, { x: W - MR - idW, y: H - 42, size: 7.5, font: this.f.regular, color: C.muted });
      p.drawLine({ start: { x: ML, y: H - 48 }, end: { x: W - MR, y: H - 48 }, thickness: 0.5, color: C.line });
      p.drawLine({ start: { x: ML, y: 46 }, end: { x: W - MR, y: 46 }, thickness: 0.5, color: C.line });
      p.drawText(sanitize(this.meta.classification), { x: ML, y: 34, size: 7, font: this.f.regular, color: C.muted });
      const label = `Page ${i + 1} of ${total}`;
      const lw = this.f.regular.widthOfTextAtSize(label, 7.5);
      p.drawText(label, { x: W - MR - lw, y: 34, size: 7.5, font: this.f.regular, color: C.muted });
    });
    return this.doc.save();
  }
}
