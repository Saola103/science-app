/**
 * Reads a JSON request body with a hard size cap. Content-Length is
 * client-supplied (and absent for chunked bodies), so the actual text length
 * is checked too. Returns { status } (null = success) instead of throwing.
 */
export const MAX_JSON_BODY_BYTES = 32 * 1024;

export async function readJsonLimited(
  req: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES
): Promise<{ status: 400 | 413 | null; body: unknown }> {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > maxBytes) return { status: 413, body: null };
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { status: 400, body: null };
  }
  if (text.length > maxBytes) return { status: 413, body: null };
  try {
    return { status: null, body: JSON.parse(text) };
  } catch {
    return { status: 400, body: null };
  }
}
