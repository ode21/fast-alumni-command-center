import { phoneKey } from "./domain.js";
export function normalizeRegistration(input, state) {
  const clean = (k, max) => {
    if (
      typeof input[k] !== "string" ||
      !input[k].trim() ||
      input[k].length > max
    )
      throw Error("Lengkapi semua kolom wajib dengan benar.");
    return input[k].trim();
  };
  const result = {
    name: clean("name", 100),
    phone: phoneKey(clean("phone", 30)),
    alumniId: clean("alumniId", 50),
    city: clean("city", 80),
    year: clean("year", 4),
    department: clean("department", 100),
    team: typeof input.team === "string" ? input.team : "",
    consent: input.consent === true,
    support: input.support === true,
  };
  if (!/^62\d{8,13}$/.test(result.phone))
    throw Error("Periksa nomor WhatsApp. Gunakan 08… atau +62…");
  if (
    !/^\d{4}$/.test(result.year) ||
    +result.year < 1950 ||
    +result.year > 2100
  )
    throw Error("Periksa tahun angkatan Anda.");
  if (!result.consent || !result.support)
    throw Error(
      "Persetujuan pendataan dan konfirmasi dukungan perlu dicentang sendiri.",
    );
  if (result.team) {
    const t = state.teams.find((t) => t.id === result.team),
      p = state.pics.find((p) => p.id === t?.pic),
      c = state.chairs.find((c) => c.id === p?.chair);
    if (!t || c?.year !== result.year || p?.department !== result.department)
      throw Error(
        "Angkatan atau jurusan tidak sesuai dengan timses pada tautan. Hubungi pengirim tautan.",
      );
  }
  return result;
}
export function publicCatalog(state) {
  return {
    years: state.chairs.map((c) => c.year),
    departments: [...new Set(state.pics.map((p) => p.department))],
    teams: state.teams.map((t) => {
      const p = state.pics.find((p) => p.id === t.pic),
        c = state.chairs.find((c) => c.id === p?.chair);
      return {
        id: t.id,
        name: t.name,
        year: c?.year,
        department: p?.department,
      };
    }),
  };
}
