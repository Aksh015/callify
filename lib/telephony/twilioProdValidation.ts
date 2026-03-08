import { createHmac, timingSafeEqual } from "node:crypto";

function normalizePhone(value: string) {
  return value.replace(/[^+\d]/g, "").trim();
}

function getExpectedProdNumber() {
  return normalizePhone(
    process.env.TWILIO_PROD_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER || "",
  );
}

function getExpectedProdAccountSid() {
  return (
    process.env.TWILIO_PROD_ACCOUNT_SID?.trim() ||
    process.env.TWILIO_ACCOUNT_SID?.trim() ||
    ""
  );
}

function getExternalUrl(request: Request) {
  const fallback = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || fallback.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || fallback.host;
  return `${proto}://${host}${fallback.pathname}${fallback.search}`;
}

function buildSignaturePayload(url: string, form: FormData) {
  const valuesByKey = new Map<string, string[]>();

  for (const [key, value] of form.entries()) {
    const current = valuesByKey.get(key) || [];
    current.push(String(value));
    valuesByKey.set(key, current);
  }

  const keys = Array.from(valuesByKey.keys()).sort();
  let payload = url;
  for (const key of keys) {
    const values = (valuesByKey.get(key) || []).sort();
    for (const value of values) {
      payload += `${key}${value}`;
    }
  }

  return payload;
}

function isValidTwilioSignature(input: { signature: string; payload: string; authToken: string }) {
  const expected = createHmac("sha1", input.authToken).update(input.payload).digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(input.signature);
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function isAllowedProdTwilioSource(form: FormData) {
  const expectedAccountSid = getExpectedProdAccountSid();
  const expectedNumber = getExpectedProdNumber();

  const accountSid = String(form.get("AccountSid") || "").trim();
  const toNumber = normalizePhone(String(form.get("To") || ""));

  if (expectedAccountSid && accountSid && expectedAccountSid !== accountSid) {
    return false;
  }

  if (expectedNumber && toNumber && expectedNumber !== toNumber) {
    return false;
  }

  return true;
}

export function isProdTwilioSignatureValid(request: Request, form: FormData) {
  const authToken = (process.env.TWILIO_PROD_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || "").trim();
  if (!authToken) {
    return true;
  }

  const signature = request.headers.get("x-twilio-signature")?.trim() || "";
  if (!signature) {
    return false;
  }

  const url = getExternalUrl(request);
  const payload = buildSignaturePayload(url, form);
  return isValidTwilioSignature({ signature, payload, authToken });
}

export function getNormalizedInboundNumber(form: FormData) {
  return normalizePhone(String(form.get("To") || ""));
}
