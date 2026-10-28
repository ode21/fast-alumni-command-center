import { randomUUID } from "node:crypto";
import { database, workspace } from "../lib/store.js";
import {
  authenticated,
  checkPassword,
  token,
  sessionCookie,
  rateKey,
} from "../lib/auth.js";
import { validateBackup, validateVoter, phoneKey } from "../domain.js";
import { normalizeRegistration, publicCatalog } from "../registration.js";
const json = (body, status = 200, headers = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
async function rate(sql, req, action, max) {
  const ip =
    req.headers.get("x-vercel-forwarded-for") ||
    req.headers.get("x-forwarded-for") ||
    "local";
  const key = rateKey(ip, action);
  const [r] =
    await sql`INSERT INTO fast_rate_limits (key,expires_at) VALUES (${key},now()+interval '2 hours') ON CONFLICT (key) DO UPDATE SET attempts=fast_rate_limits.attempts+1 RETURNING attempts`;
  if (r.attempts > max)
    throw Object.assign(
      Error("Terlalu banyak percobaan. Silakan coba lagi nanti."),
      { status: 429 },
    );
}
export default {
  async fetch(req) {
    try {
      const url = new URL(req.url),
        view = url.searchParams.get("view");
      if (req.method === "GET" && view === "session")
        return json({ authenticated: authenticated(req) });
      const sql = await database();
      if (req.method === "GET" && view === "catalog")
        return json(publicCatalog((await workspace(sql)).payload));
      if (req.method === "GET") {
        if (!authenticated(req))
          return json({ error: "Silakan masuk sebagai pengelola." }, 401);
        if (view === "registrations")
          return json(
            await sql`SELECT id,payload,status,created_at FROM fast_registrations ORDER BY created_at DESC LIMIT 2000`,
          );
        return json(await workspace(sql));
      }
      if (req.method !== "POST")
        return json({ error: "Metode tidak didukung." }, 405);
      if (
        req.headers.get("origin") !== url.origin ||
        !req.headers.get("content-type")?.startsWith("application/json")
      )
        return json({ error: "Permintaan tidak valid." }, 403);
      if (+(req.headers.get("content-length") || 0) > 2_000_000)
        return json({ error: "Data terlalu besar." }, 413);
      const raw = await req.text();
      if (raw.length > 2_000_000)
        return json({ error: "Data terlalu besar." }, 413);
      const body = JSON.parse(raw);
      const secure = url.protocol === "https:";
      if (body.action === "login") {
        await rate(sql, req, "login", 10);
        if (!checkPassword(body.password))
          return json({ error: "Kata sandi tidak sesuai." }, 401);
        return json({ ok: true }, 200, {
          "Set-Cookie": sessionCookie(token(), secure),
        });
      }
      if (body.action === "logout")
        return json({ ok: true }, 200, {
          "Set-Cookie": sessionCookie("", secure),
        });
      if (body.action === "register") {
        await rate(sql, req, "register", 20);
        if (
          body.website ||
          typeof body.startedAt !== "number" ||
          Date.now() - body.startedAt < 2000
        )
          throw Error("Formulir tidak valid. Muat ulang dan coba kembali.");
        const { payload } = await workspace(sql),
          input = normalizeRegistration(body, payload);
        if (
          payload.voters.some(
            (v) =>
              phoneKey(v.phone) === input.phone ||
              v.alumniId.toLowerCase() === input.alumniId.toLowerCase(),
          )
        )
          return json(
            {
              error:
                "Data sudah terdaftar. Hubungi penghubung Anda untuk pembaruan.",
            },
            409,
          );
        const id = randomUUID();
        await sql`INSERT INTO fast_registrations (id,phone,alumni_key,payload) VALUES (${id},${input.phone},${input.alumniId.toLowerCase()},${JSON.stringify({ ...input, submittedAt: new Date().toISOString() })}::jsonb)`;
        return json({ ok: true, receipt: id }, 201);
      }
      if (!authenticated(req))
        return json({ error: "Sesi berakhir. Silakan masuk kembali." }, 401);
      if (body.action === "save") {
        const next = validateBackup(body.data);
        if (!Number.isInteger(body.revision))
          throw Error("Versi data tidak valid.");
        const rows =
          await sql`UPDATE fast_workspace SET payload=${JSON.stringify(next)}::jsonb,revision=revision+1 WHERE id=1 AND revision=${body.revision} RETURNING revision`;
        if (!rows.length)
          return json(
            {
              error:
                "Data telah diperbarui pengelola lain. Muat ulang lalu ulangi perubahan Anda.",
            },
            409,
          );
        return json(rows[0]);
      }
      if (body.action === "approve") {
        const row = (
          await sql`SELECT * FROM fast_registrations WHERE id=${body.id} AND status='pending'`
        )[0];
        if (!row)
          return json(
            { error: "Pendaftaran sudah diproses atau tidak ditemukan." },
            409,
          );
        const current = await workspace(sql),
          state = current.payload,
          r = row.payload;
        const t = state.teams.find((t) => t.id === body.team),
          p = state.pics.find((p) => p.id === t?.pic),
          c = state.chairs.find((c) => c.id === p?.chair);
        if (
          !t ||
          c?.year !== r.year ||
          p?.department.toLowerCase() !== r.department.toLowerCase()
        )
          throw Error(
            "Pilih timses pada angkatan dan jurusan yang sesuai. Buat struktur yang sesuai terlebih dahulu.",
          );
        const voter = validateVoter(
          {
            id: randomUUID(),
            name: r.name,
            alumniId: r.alumniId,
            phone: r.phone,
            city: r.city,
            team: t.id,
            status: "Fix voter",
            consent: true,
            verifiedAt: new Date(r.submittedAt).toLocaleDateString("en-CA", {
              timeZone: "Asia/Jakarta",
            }),
            company: "",
            community: "",
            notes:
              "Konfirmasi mandiri melalui formulir, diverifikasi pengelola.",
            inGroup: false,
          },
          state,
        );
        state.voters.push(voter);
        state.logs.unshift({
          at: new Date().toISOString(),
          text: "Memverifikasi pendaftaran " + r.name,
        });
        state.logs = state.logs.slice(0, 500);
        const rows =
          await sql`WITH locked AS MATERIALIZED (SELECT revision FROM fast_workspace WHERE id=1 AND revision=${current.revision} FOR UPDATE), claimed AS (UPDATE fast_registrations SET status='approved' WHERE id=${body.id} AND status='pending' AND EXISTS (SELECT 1 FROM locked) RETURNING id), changed AS (UPDATE fast_workspace SET payload=${JSON.stringify(state)}::jsonb,revision=revision+1 WHERE id=1 AND revision=${current.revision} AND EXISTS(SELECT 1 FROM claimed) RETURNING revision) SELECT revision FROM changed`;
        if (!rows.length)
          return json(
            { error: "Data berubah saat diproses. Muat ulang lalu coba lagi." },
            409,
          );
        return json({ ok: true });
      }
      if (body.action === "reject") {
        await sql`UPDATE fast_registrations SET status='rejected' WHERE id=${body.id} AND status='pending'`;
        return json({ ok: true });
      }
      return json({ error: "Aksi tidak dikenal." }, 400);
    } catch (err) {
      if (err.code === "23505")
        return json(
          {
            error:
              "Data sudah terdaftar. Hubungi penghubung Anda untuk pembaruan.",
          },
          409,
        );
      if (err.status) return json({ error: err.message }, err.status);
      if (err instanceof SyntaxError)
        return json({ error: "Format data tidak valid." }, 400);
      if (err.code || err.name === "NeonDbError") {
        console.error("Database operation failed", err.code || err.name);
        return json(
          { error: "Database sedang tidak tersedia. Coba lagi nanti." },
          503,
        );
      }
      return json({ error: err.message || "Permintaan gagal." }, 400);
    }
  },
};
