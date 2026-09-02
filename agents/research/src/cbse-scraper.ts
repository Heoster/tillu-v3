import pdf from "pdf-parse";

export interface CbseDocument {
  url: string;
  title: string;
  text: string;
  pages: number;
}

const CBSE_HOSTS = new Set(["cbseacademic.nic.in", "www.cbseacademic.nic.in"]);

function assertCbseUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || !CBSE_HOSTS.has(url.hostname)) {
    throw new Error("CBSE scraper only accepts HTTPS URLs hosted on cbseacademic.nic.in");
  }
  return url;
}

export async function downloadCbsePdf(urlValue: string, title = "CBSE document"): Promise<CbseDocument> {
  const url = assertCbseUrl(urlValue);
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`CBSE PDF download failed with status ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("pdf") && !url.pathname.toLowerCase().endsWith(".pdf")) {
    throw new Error("CBSE source did not return a PDF");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > 25 * 1024 * 1024) throw new Error("CBSE PDF exceeds the 25MB processing limit");
  const parsed = await pdf(bytes);
  return { url: url.toString(), title, text: parsed.text.trim(), pages: parsed.numpages };
}

export function buildCbseQuery(query: string, subject: string): string {
  return `site:cbseacademic.nic.in ${subject} ${query} CBSE curriculum PDF`;
}
