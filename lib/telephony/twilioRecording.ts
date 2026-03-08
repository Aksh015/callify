type RecordingFetchInput = {
  recordingUrl: string;
  accountSid?: string;
  authToken?: string;
};

function ensureWavUrl(url: string) {
  if (url.endsWith(".wav") || url.endsWith(".mp3")) return url;
  return `${url}.wav`;
}

export async function fetchTwilioRecordingBase64(input: RecordingFetchInput) {
  const targetUrl = ensureWavUrl(input.recordingUrl);
  const headers: Record<string, string> = {};

  if (input.accountSid && input.authToken) {
    const basic = Buffer.from(`${input.accountSid}:${input.authToken}`).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  }

  const response = await fetch(targetUrl, { headers });
  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw new Error(`Failed to fetch Twilio recording (${response.status}): ${raw}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    audioBase64: Buffer.from(arrayBuffer).toString("base64"),
    contentType: response.headers.get("content-type") || "audio/wav",
  };
}
