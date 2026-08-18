const crypto = require("crypto");

const COOKIE_NAME = "sf_auth";

function getKey() {
  return crypto
    .createHash("sha256")
    .update(process.env.SESSION_SECRET)
    .digest();
}

function encryptAuth(data) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptAuth(value) {
  try {
    const buffer = Buffer.from(value, "base64url");

    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getKey(),
      iv
    );

    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

function getAuthCookie(req) {
  const cookies = req.headers.cookie || "";

  const match = cookies
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));

  if (!match) return null;

  const value = decodeURIComponent(
    match.substring(COOKIE_NAME.length + 1)
  );

  return decryptAuth(value);
}

function setAuthCookie(res, data) {
  const value = encryptAuth(data);

  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=7200",
  ].join("; ");

  const existing = res.getHeader("Set-Cookie");

  if (existing) {
    res.setHeader("Set-Cookie", [
      ...(Array.isArray(existing) ? existing : [existing]),
      cookie,
    ]);
  } else {
    res.setHeader("Set-Cookie", cookie);
  }
}

function clearAuthCookie(res) {
  const cookie = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");

  const existing = res.getHeader("Set-Cookie");

  if (existing) {
    res.setHeader("Set-Cookie", [
      ...(Array.isArray(existing) ? existing : [existing]),
      cookie,
    ]);
  } else {
    res.setHeader("Set-Cookie", cookie);
  }
}

module.exports = {
  getAuthCookie,
  setAuthCookie,
  clearAuthCookie,
};
