export async function safeJson(response: Response, fallback: any = null) {
  if (!response) return fallback;
  try {
    // Read as text first to avoid throwing on empty body
    const text = await response.text();
    if (!text) return fallback;
    try {
      return JSON.parse(text);
    } catch (err) {
      // If JSON.parse fails, return fallback
      return fallback;
    }
  } catch (err) {
    return fallback;
  }
}

export default safeJson;
