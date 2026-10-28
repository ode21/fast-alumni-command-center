import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRegistration, publicCatalog } from "../registration.js";
import { seed } from "../seed.js";
import {
  token,
  authenticated,
  checkPassword,
  sessionCookie,
} from "../lib/auth.js";
const payload = {
  name: "Alumni Uji",
  alumniId: "DEMO-TEST",
  phone: "081234567890",
  city: "Bandung",
  year: "2010",
  department: "Teknik Telekomunikasi",
  team: "t0",
  support: true,
  consent: true,
};
test("public form normalizes identifiers and requires explicit consent", () => {
  assert.equal(normalizeRegistration(payload, seed()).phone, "6281234567890");
  assert.throws(
    () => normalizeRegistration({ ...payload, consent: false }, seed()),
    /Persetujuan/,
  );
  assert.throws(
    () => normalizeRegistration({ ...payload, support: "true" }, seed()),
    /Persetujuan/,
  );
});
test("referral must match cohort and department, never silently assigns wrong PIC", () => {
  assert.throws(
    () => normalizeRegistration({ ...payload, year: "2011" }, seed()),
    /tidak sesuai/,
  );
  assert.throws(
    () =>
      normalizeRegistration({ ...payload, department: "Manajemen" }, seed()),
    /tidak sesuai/,
  );
  assert.equal(
    normalizeRegistration({ ...payload, team: "" }, seed()).team,
    "",
  );
});
test("catalog exposes no voters, contact numbers, IDs or private notes", () => {
  const catalog = publicCatalog(seed());
  assert.deepEqual(Object.keys(catalog).sort(), [
    "departments",
    "teams",
    "years",
  ]);
  assert.equal(JSON.stringify(catalog).includes("62800000"), false);
  assert.deepEqual(Object.keys(catalog.teams[0]).sort(), [
    "department",
    "id",
    "name",
    "year",
  ]);
});
test("signed admin sessions reject tampering, expiration and password rotation", () => {
  process.env.ADMIN_PASSWORD = "test-only-long-password-not-a-real-secret";
  const now = Date.now(),
    value = token(now),
    req = (cookie) =>
      new Request("https://example.test", {
        headers: { cookie: "fast_session=" + cookie },
      });
  assert.equal(authenticated(req(value), now), true);
  assert.equal(authenticated(req(value + "tampered"), now), false);
  assert.equal(authenticated(req(value), now + 9 * 3600000), false);
  assert.equal(checkPassword("wrong"), false);
  assert.match(sessionCookie(value), /HttpOnly; SameSite=Strict/);
  process.env.ADMIN_PASSWORD = "test-only-new-password-rotation";
  assert.equal(authenticated(req(value), now), false);
  delete process.env.ADMIN_PASSWORD;
});
