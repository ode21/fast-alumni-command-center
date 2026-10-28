import { createHmac, createHash, timingSafeEqual } from "node:crypto";
function secret() {
  const key = process.env.ADMIN_PASSWORD;
  if (!key || key.length < 16)
    throw Object.assign(Error("Login pengelola belum disiapkan."), {
      status: 503,
    });
  return key;
}
export function safeEqual(a, b) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}
export function sign(value) {
  return createHmac("sha256", secret())
    .update("fast-session:" + value)
    .digest("base64url");
}
export function token(now = Date.now()) {
  const expiry = String(now + 8 * 60 * 60 * 1000);
  return expiry + "." + sign(expiry);
}
export function authenticated(request, now = Date.now()) {
  const cookie = request.headers.get("cookie") || "",
    value = cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("fast_session="))
      ?.slice(13);
  if (!value) return false;
  const [expiry, sig] = value.split(".");
  return (
    /^\d+$/.test(expiry) &&
    +expiry > now &&
    +expiry <= now + 8 * 60 * 60 * 1000 &&
    safeEqual(sig || "", sign(expiry))
  );
}
export function checkPassword(password) {
  return typeof password === "string" && safeEqual(password, secret());
}
export function sessionCookie(value, secure = true) {
  return `fast_session=${value}; HttpOnly; SameSite=Strict; Path=/; ${secure ? "Secure; " : ""}Max-Age=${value ? 28800 : 0}`;
}
export function rateKey(ip, action) {
  return createHmac("sha256", secret())
    .update(action + ":" + ip + ":" + Math.floor(Date.now() / 3600000))
    .digest("hex");
}
