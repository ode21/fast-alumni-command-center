import { request, escapeHtml } from "./client.js";
import { seed } from "./seed.js";
import {
  statuses,
  validateVoter,
  metrics,
  csvCell,
  validateBackup,
  validateTeam,
  picVoters,
  validateChair,
  validatePic,
  chairVoters,
} from "./domain.js";
const KEY = "fast-demo-v3";
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const uid = () => crypto.randomUUID();

const demo = new URL(location.href).searchParams.get("demo") === "1";
let data,
  revision = 0,
  registrations = [],
  saving = false;
if (demo) {
  try {
    data = validateBackup(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    data = seed();
  }
} else {
  try {
    const [current, inbox] = await Promise.all([
      request(),
      request(null, "registrations"),
    ]);
    data = validateBackup(current.payload);
    revision = current.revision;
    registrations = inbox;
  } catch (err) {
    if (err.status === 401) location.replace("/login");
    else
      document.querySelector("#main").innerHTML =
        '<section class="notice">' +
        escapeHtml(err.message) +
        ' <a href="/daftar">Buka formulir</a></section>';
    throw err;
  }
}
if (!demo) {
  document.querySelector(".demo-chip").textContent = "DATABASE BERSAMA";
  document.querySelector("footer span").textContent =
    "Tersinkron ke database bersama";
  document.querySelector(".profile small").textContent = "Pengelola · online";
}

let page = "dashboard",
  query = "",
  filter = "",
  picFilter = "",
  cityFilter = "";
const titles = {
  dashboard: "Ringkasan",
  voters: "Database alumni",
  pics: "Struktur & timses",
  orgs: "Perusahaan & komunitas",
  logs: "Aktivitas",
  settings: "Pengaturan & cadangan",
  inbox: "Pendaftaran masuk",
};
const main = document.querySelector("#main");
async function save(message) {
  saving = true;
  try {
    const next = {
      ...data,
      logs: [
        { at: new Date().toISOString(), text: message },
        ...data.logs,
      ].slice(0, 500),
    };
    if (demo) {
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        throw Error(
          "Penyimpanan browser penuh. Ekspor cadangan sebelum melanjutkan.",
        );
      }
    } else {
      const result = await request({ action: "save", data: next, revision });
      revision = result.revision;
    }
    data = next;
    toast(message);
  } finally {
    saving = false;
  }
}
async function refresh() {
  if (demo || saving || modal.open) return;
  const seen = revision;
  const [current, inbox] = await Promise.all([
    request(),
    request(null, "registrations"),
  ]);
  if (saving || modal.open || revision !== seen) return;
  data = validateBackup(current.payload);
  revision = current.revision;
  registrations = inbox;
  render();
}

function toast(s) {
  const t = document.querySelector("#toast");
  t.textContent = s;
  t.classList.add("visible");
  setTimeout(() => t.classList.remove("visible"), 3500);
}
function initials(n) {
  return n
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("");
}
const statusClass = (s) =>
  s === "Fix voter"
    ? "fix"
    : s === "Follow up"
      ? "follow"
      : s === "Sudah memilih"
        ? "voted"
        : "";
const badge = (s) => `<span class="badge ${statusClass(s)}">${esc(s)}</span>`;
const picName = (id) =>
  data.pics.find((p) => p.id === id)?.name || "Belum ada PIC";
const teamName = (id) =>
  data.teams.find((t) => t.id === id)?.name || "Belum ada timses";
const voterPic = (v) => data.teams.find((t) => t.id === v.team)?.pic;
let teamFilter = "",
  yearFilter = "",
  departmentFilter = "";
const chairForPic = (id) =>
  data.chairs.find((c) => c.id === data.pics.find((p) => p.id === id)?.chair);
const voterYear = (v) => chairForPic(voterPic(v))?.year || "";
const voterDepartment = (v) =>
  data.pics.find((p) => p.id === voterPic(v))?.department || "";
const picLabel = (p) =>
  p.name + " · " + (chairForPic(p.id)?.year || "") + " · " + p.department;
const options = (items, current = "", blank = "Semua") =>
  `<option value="">${blank}</option>` +
  items
    .map((x) => {
      const [v, l] = Array.isArray(x) ? x : [x, x];
      return `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(l)}</option>`;
    })
    .join("");
function heading(title, sub, actions = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p class="subtext">${sub}</p></div><div class="heading-actions">${actions}</div></div>`;
}
const shareButton =
  '<a class="button secondary" href="/daftar" target="_blank" rel="noopener">↗ Formulir alumni</a>';
const addButton =
  '<button class="button primary" data-action="add-voter">＋ Tambah alumni</button>';
function stat(label, value, caption, icon) {
  return `<div class="stat"><div class="stat-top">${label}<span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-caption">${caption}</div></div>`;
}
function voterRows(rows) {
  return (
    rows
      .map(
        (v) =>
          `<tr><td><div class="person"><span class="avatar">${esc(initials(v.name))}</span><div><strong>${esc(v.name)}</strong><small>${esc(v.alumniId)} · ${esc(voterYear(v) || "—")} · ${esc(voterDepartment(v))}</small></div></div></td><td>${esc(v.city)}</td><td>${esc(teamName(v.team))}<small class="cell-sub">PIC: ${esc(picName(voterPic(v)))}</small></td><td>${badge(v.status)}</td><td><span class="badge ${v.inGroup ? "fix" : ""}">${v.inGroup ? "Sudah masuk" : "Belum masuk"}</span></td><td><button class="text-button" data-action="edit-voter" data-id="${esc(v.id)}">Detail ↗</button></td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="6" class="empty">Belum ada alumni yang cocok. Ubah pencarian atau tambah data baru.</td></tr>'
  );
}
const voterTable = (rows) =>
  `<div class="table-wrap"><table><thead><tr><th>ALUMNI</th><th>WILAYAH</th><th>TIMSES / PIC</th><th>STATUS DUKUNGAN</th><th>GRUP</th><th>AKSI</th></tr></thead><tbody>${voterRows(rows)}</tbody></table></div>`;
function dashboard() {
  const m = metrics(data);
  const percent = Math.round((m.fix / data.target) * 100);
  return (
    heading(
      "Setiap koneksi, satu langkah maju.",
      "Pantau jejaring alumni dan progres dukungan untuk Mas Yanto.",
      `<button class="button secondary" data-action="export">↓ Ekspor data</button>${shareButton}${addButton}`,
    ) +
    `<section class="hero"><div><span class="eyebrow">BERSAMA MENGGERAKKAN FAST</span><h2>Jejaring kuat. Dukungan terukur.</h2><p>Rapikan data, hubungkan alumni, dan pastikan setiap dukungan terkonfirmasi.</p></div><div class="hero-aside"><div class="target-circle" style="--progress:${Math.min(percent, 100)}%"><span>${percent}%</span></div><div><strong>${m.fix} <span class="subtext">/ ${data.target}</span></strong><small>fix voters dari target</small></div></div></section><section class="stats">${stat("Total alumni", m.total, "Tercatat dalam database", "♧")}${stat("Fix voters", m.fix, `<em>${m.total ? Math.round((m.fix / m.total) * 100) : 0}%</em> dari alumni terdata`, "✓")}${stat("Timses aktif", data.teams.length, `${data.pics.length} PIC · 10 alumni / timses`, "⚑")}${stat("Perlu follow up", m.follow, "Menunggu konfirmasi dukungan", "↗")}</section><div class="grid-two"><section class="panel"><div class="panel-head"><div><h2>Perjalanan dukungan</h2><p>Dari kenalan menjadi dukungan yang terkonfirmasi</p></div><span class="page-tabs">PROGRES DUKUNGAN</span></div><div class="panel-content">${[
      ["Alumni terdata", m.total],
      [
        "Sudah dihubungi",
        data.voters.filter((v) => v.status !== "Belum dihubungi").length,
      ],
      ["Fix voter", m.fix],
      ["Sudah memilih", m.voted],
    ]
      .map(
        ([l, n]) =>
          `<div class="funnel-row"><span>${l}</span><div class="track"><span style="width:${m.total ? (n / m.total) * 100 : 0}%"></span></div><strong>${n}</strong></div>`,
      )
      .join(
        "",
      )}<p class="funnel-note">Fix voter mencakup alumni yang sudah memilih. Setiap orang dihitung satu kali.</p></div></section><section class="panel"><div class="panel-head"><div><h2>Sebaran wilayah</h2><p>Dukungan terkonfirmasi per kota</p></div><span>⌖</span></div><div class="panel-content">${
      [...new Set(data.voters.map((v) => v.city))]
        .map((city) => {
          const total = data.voters.filter((v) => v.city === city).length,
            n = data.voters.filter(
              (v) =>
                v.city === city &&
                ["Fix voter", "Sudah memilih"].includes(v.status),
            ).length;
          return `<div class="city-row"><span>${esc(city || "Belum diisi")}</span><strong>${n} <span class="subtext">/ ${total} alumni</span></strong></div><div class="city-track"><span style="width:${(n / total) * 100}%"></span></div>`;
        })
        .join("") || '<p class="subtext">Belum ada data wilayah.</p>'
    }</div></section></div><section class="panel"><div class="panel-head"><div><h2>Jejaring alumni terbaru</h2><p>Jendral → Ketua PIC Angkatan → PIC Jurusan → timses → alumni.</p></div><button class="text-button" data-page="voters">Lihat semua alumni →</button></div>${voterTable([...data.voters].reverse().slice(0, 5))}<div class="table-footer"><span>Menampilkan ${Math.min(data.voters.length, 5)} dari ${m.total} alumni</span><span>● Pemeriksaan duplikasi aktif</span></div></section>`
  );
}
function filtered() {
  return data.voters.filter(
    (v) =>
      (!query ||
        [v.name, v.phone, v.alumniId, v.company, v.community].some((x) =>
          String(x).toLowerCase().includes(query.toLowerCase()),
        )) &&
      (!filter || v.status === filter) &&
      (!picFilter || voterPic(v) === picFilter) &&
      (!cityFilter || v.city === cityFilter) &&
      (!teamFilter || v.team === teamFilter) &&
      (!yearFilter || voterYear(v) === yearFilter) &&
      (!departmentFilter || voterDepartment(v) === departmentFilter),
  );
}
function voters() {
  return (
    heading(
      "Database alumni",
      "Catat jejaring, verifikasi dukungan, dan tetapkan satu timses untuk setiap alumni.",
      `<button class="button secondary" data-action="export">↓ Ekspor CSV</button>${shareButton}${addButton}`,
    ) +
    `<section class="panel"><div class="toolbar"><input aria-label="Cari alumni" id="search" class="search" placeholder="Cari nama, NIM, WhatsApp, perusahaan…" value="${esc(query)}"><select id="year-filter" aria-label="Filter angkatan">${options(
      data.chairs.map((c) => c.year),
      yearFilter,
      "Semua angkatan",
    )}</select><select id="department-filter" aria-label="Filter jurusan">${options([...new Set(data.pics.map((p) => p.department))], departmentFilter, "Semua jurusan")}</select><select id="status-filter" aria-label="Filter status">${options(statuses, filter, "Semua status")}</select><select id="pic-filter" aria-label="Filter PIC">${options(
      data.pics.map((p) => [p.id, picLabel(p)]),
      picFilter,
      "Semua PIC",
    )}</select><select id="team-filter" aria-label="Filter timses">${options(
      data.teams.map((t) => [t.id, t.name]),
      teamFilter,
      "Semua timses",
    )}</select><select id="city-filter" aria-label="Filter wilayah">${options([...new Set(data.voters.map((v) => v.city))], cityFilter, "Semua wilayah")}</select></div>${voterTable(filtered())}<div class="table-footer"><span id="result-count">${filtered().length} alumni ditemukan</span><span>Nomor & ID alumni unik</span></div></section>`
  );
}
function pics() {
  return (
    heading(
      "Satu angkatan, gerak bersama.",
      "Jendral Pemenangan → Ketua PIC Angkatan → PIC Jurusan → timses → alumni.",
      '<button class="button secondary" data-action="add-chair">＋ Ketua angkatan</button><button class="button secondary" data-action="add-pic">＋ PIC jurusan</button><button class="button primary" data-action="add-team">＋ Timses</button>',
    ) +
    `<section class="hero"><div><span class="eyebrow">PUSAT LAPORAN PEMENANGAN</span><h2>${esc(data.chief)}</h2><p>${data.chairs.length} ketua angkatan → ${data.pics.length} PIC jurusan → ${data.teams.length} timses → ${data.voters.length} alumni</p></div><div class="hero-aside"><div><strong>50 × 10 = 500</strong><small>Kapasitas alumni per PIC jurusan</small></div></div></section><div class="panel-head"><div><h2>Ketua PIC Angkatan</h2><p>Laporan terkumpul dari seluruh PIC jurusan pada angkatan masing-masing.</p></div></div><div class="cards">${data.chairs
      .map((c) => {
        const ps = data.pics.filter((p) => p.chair === c.id),
          rows = chairVoters(data, c.id),
          ts = data.teams.filter((t) => ps.some((p) => p.id === t.pic));
        return `<section class="panel pic-card"><span class="eyebrow">ANGKATAN ${esc(c.year)}</span><h3 class="chair-name">${esc(c.name)}</h3><div class="pic-details"><span>PIC jurusan / timses</span><strong>${ps.length} / ${ts.length}</strong></div><div class="pic-details"><span>Alumni / fix voters</span><strong>${rows.length} / ${metrics({ voters: rows }).fix}</strong></div><p class="capacity">Laporan ke: ${esc(data.chief)}</p><button class="text-button" data-action="chair-voters" data-id="${esc(c.id)}">Lihat angkatan →</button><button class="text-button" data-action="edit-chair" data-id="${esc(c.id)}">Edit ketua</button></section>`;
      })
      .join(
        "",
      )}</div><div class="panel-head"><div><h2>PIC Jurusan per Angkatan</h2><p>Satu PIC untuk setiap pasangan angkatan dan jurusan.</p></div></div><div class="cards">${data.pics
      .map((p) => {
        const rows = picVoters(data, p.id),
          fix = metrics({ voters: rows }).fix,
          teams = data.teams.filter((t) => t.pic === p.id),
          c = chairForPic(p.id);
        return `<section class="panel pic-card"><div class="person"><span class="avatar">${esc(initials(p.name))}</span><div><strong>${esc(p.name)}</strong><small>${esc(c?.year)} · ${esc(p.department)}</small></div></div><div class="pic-details"><span>Timses ditangani</span><strong>${teams.length} / 50</strong></div><div class="track"><span style="width:${(teams.length / 50) * 100}%"></span></div><div class="pic-details"><span>Alumni / kapasitas</span><strong>${rows.length} / 500</strong></div><div class="pic-details"><span>Fix voters</span><strong>${fix} / 500</strong></div><p class="capacity">Laporan ke: ${esc(c?.name)} (${esc(c?.year)})</p><button class="text-button" data-action="pic-voters" data-id="${esc(p.id)}">Lihat alumni →</button> <button class="text-button" data-action="edit-pic" data-id="${esc(p.id)}">Edit PIC</button></section>`;
      })
      .join(
        "",
      )}</div><section class="panel team-panel"><div class="panel-head"><div><h2>Daftar timses</h2><p>Setiap timses bertanggung jawab atas 10 alumni unik.</p></div></div><div class="table-wrap"><table><thead><tr><th>TIMSES</th><th>PIC JURUSAN / ANGKATAN</th><th>WILAYAH</th><th>ALUMNI</th><th>FIX VOTERS</th><th>AKSI</th></tr></thead><tbody>${data.teams
      .map((t) => {
        const rows = data.voters.filter((v) => v.team === t.id);
        return `<tr><td><strong>${esc(t.name)}</strong></td><td>${esc(picName(t.pic))}<small class="cell-sub">${esc(chairForPic(t.pic)?.year)} · ${esc(data.pics.find((p) => p.id === t.pic)?.department)}</small></td><td>${esc(t.city)}</td><td>${rows.length} / 10</td><td>${metrics({ voters: rows }).fix}</td><td><button class="text-button" data-action="team-voters" data-id="${esc(t.id)}">Alumni →</button><button class="text-button" data-action="edit-team" data-id="${esc(t.id)}">Edit</button><button class="text-button" data-action="copy-form" data-id="${esc(t.id)}">Bagikan form ↗</button></td></tr>`;
      })
      .join("")}</tbody></table></div></section>`
  );
}
function orgs() {
  return (
    heading(
      "Peta jejaring alumni.",
      "Database perusahaan dan komunitas, terhubung dengan alumni yang terdaftar.",
      `<button class="button primary" data-action="add-org">＋ Tambah jejaring</button>`,
    ) +
    `<div class="notice">Jumlah alumni dihitung otomatis dari nama perusahaan atau komunitas yang sama di database alumni.</div><section class="panel"><div class="table-wrap"><table><thead><tr><th>PERUSAHAAN / KOMUNITAS</th><th>JENIS</th><th>WILAYAH</th><th>KONTAK PENGHUBUNG</th><th>ALUMNI</th><th>AKSI</th></tr></thead><tbody>${data.orgs.map((o) => `<tr><td><strong>${esc(o.name)}</strong></td><td><span class="badge">${o.type}</span></td><td>${esc(o.city)}</td><td>${esc(o.contact)}</td><td>${data.voters.filter((v) => (o.type === "Perusahaan" ? v.company : v.community) === o.name).length}</td><td><button class="text-button" data-action="edit-org" data-id="${esc(o.id)}">Edit ↗</button></td></tr>`).join("") || '<tr><td colspan="6" class="empty">Belum ada jejaring. Tambahkan perusahaan atau komunitas pertama.</td></tr>'}</tbody></table></div></section>`
  );
}
function logs() {
  return (
    heading(
      "Jejak kerja tim.",
      "Riwayat perubahan di browser ini. Maksimal 500 aktivitas terakhir.",
    ) +
    `<section class="panel">${data.logs.map((l) => `<div class="log"><span class="log-symbol">↗</span><div><p>${esc(l.text)}</p><small>${esc(new Date(l.at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }))} WIB</small></div></div>`).join("")}</section>`
  );
}
function settings() {
  return (
    heading(
      "Pengaturan workspace",
      "Atur target, bagikan formulir, dan kelola cadangan.",
    ) +
    `${demo ? '<div class="notice">MODE DEMO — Data fiktif, hanya tersimpan di browser ini.</div>' : '<div class="notice">DATABASE BERSAMA — Data tersimpan di server. Akses pengelola menggunakan kata sandi bersama. Formulir publik tidak menampilkan data kontak alumni.</div>'}<section class="panel settings-panel"><h2>Formulir untuk dibagikan</h2><p>Kirim tautan formulir umum atau gunakan tautan per timses dari halaman Struktur & timses.</p><div class="heading-actions"><a class="button primary" href="/daftar" target="_blank" rel="noopener">Buka formulir ↗</a><button class="button secondary" data-action="copy-form">Salin tautan</button><button class="button secondary" data-page="logs">Aktivitas</button>${demo ? "" : '<button class="button secondary" data-action="logout">Keluar</button>'}</div></section><section class="panel settings-panel"><h2>Target fix voters</h2><p>Target ini dipakai untuk progres di halaman ringkasan.</p><form id="target-form"><input class="target-input" type="number" aria-label="Target fix voters" name="target" min="1" max="1000000" required value="${data.target}"> <button class="button primary">Simpan target</button></form></section><section class="panel settings-panel"><h2>Cadangan & pemindahan data</h2><p>Unduh JSON untuk cadangan lengkap, atau CSV untuk dibuka di Excel. Impor menggantikan workspace bersama setelah validasi. Daftar pendaftaran tetap tersimpan terpisah di server.</p><div class="heading-actions"><button class="button secondary" data-action="backup">↓ Unduh cadangan JSON</button><button class="button secondary" data-action="import">↑ Impor cadangan</button><button class="button secondary" data-action="export">↓ Ekspor CSV</button></div></section>${demo ? '<section class="panel settings-panel"><h2>Mulai demonstrasi baru</h2>' : ""}${demo ? '<p>Kembalikan ke 24 data fiktif awal. Unduh cadangan sebelum mengatur ulang.</p><button class="button secondary" data-action="reset">Atur ulang data demo</button></section>' : ""}`
  );
}
function inbox() {
  return (
    heading(
      "Pendaftaran masuk",
      "Konfirmasi mandiri alumni menunggu verifikasi sebelum masuk hitungan fix voters.",
      '<button class="button secondary" data-action="refresh">↻ Perbarui</button>' +
        shareButton,
    ) +
    `<div class="notice">Tentukan timses pada angkatan dan jurusan yang sama, kemudian verifikasi data alumni. Pendaftaran yang belum diperiksa tidak dihitung sebagai fix voter.</div><div class="inbox-list">${
      registrations
        .map((r) => {
          const p = r.payload,
            teams = data.teams.filter((t) => {
              const pic = data.pics.find((x) => x.id === t.pic),
                chair = data.chairs.find((x) => x.id === pic?.chair);
              return (
                chair?.year === p.year &&
                pic?.department.toLowerCase() === p.department.toLowerCase()
              );
            });
          return `<section class="panel inbox-card"><div class="panel-head"><div><h2>${esc(p.name)}</h2><p>${esc(p.year)} · ${esc(p.department)} · ${esc(p.city)}</p></div><span class="badge ${r.status === "approved" ? "fix" : "follow"}">${r.status === "pending" ? "Perlu diperiksa" : r.status === "approved" ? "Terverifikasi" : "Ditolak"}</span></div><div class="panel-content"><p>WhatsApp: ${esc(p.phone)}<br>ID alumni: ${esc(p.alumniId)}</p><p class="subtext">Dikirim ${esc(new Date(r.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }))} WIB</p>${
            r.status === "pending"
              ? `<label class="inbox-team">Timses penanggung jawab<select aria-label="Timses untuk ${esc(p.name)}" data-registration-team="${esc(r.id)}">${options(
                  teams.map((t) => [t.id, t.name]),
                  p.team,
                  "Pilih timses…",
                )}</select></label>${teams.length ? "" : '<p class="warning">Buat PIC jurusan dan timses untuk angkatan ini terlebih dahulu di Struktur & timses.</p>'}<div class="heading-actions"><button class="button primary" data-action="approve" data-id="${esc(r.id)}">Verifikasi sebagai fix voter</button><button class="button secondary" data-action="reject" data-id="${esc(r.id)}">Tolak data</button></div>`
              : ""
          }</div></section>`;
        })
        .join("") ||
      '<section class="panel empty">Belum ada pendaftaran. Bagikan tautan formulir untuk mulai menerima isian.</section>'
    }</div>`
  );
}
function labelTables() {
  main.querySelectorAll("table").forEach((table) => {
    const labels = [...table.querySelectorAll("th")].map((h) => h.textContent);
    table
      .querySelectorAll("tbody tr")
      .forEach((row) =>
        [...row.children].forEach(
          (cell, i) => (cell.dataset.label = labels[i] || ""),
        ),
      );
  });
}
function render() {
  document.querySelector("#breadcrumb").textContent = titles[page];
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  document.querySelector("#nav-count").textContent = data.voters.length;
  main.innerHTML = { dashboard, voters, pics, orgs, logs, settings, inbox }[
    page
  ]();
  labelTables();
  document
    .querySelectorAll("[data-page]")
    .forEach((b) =>
      b.setAttribute(
        "aria-current",
        b.dataset.page === page ? "page" : "false",
      ),
    );
}
function navigate(p) {
  if (!titles[p]) p = "dashboard";
  page = p;
  query =
    filter =
    picFilter =
    cityFilter =
    teamFilter =
    yearFilter =
    departmentFilter =
      "";
  history.replaceState(null, "", "#" + p);
  render();
  window.scrollTo(0, 0);
}
let editing = null;
const modal = document.querySelector("#modal");
const field = (label, name, value = "", type = "text", extra = "") =>
  `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const selectField = (label, name, items, value, blank = "Pilih…") =>
  `<label>${label}<select name="${name}" required>${options(items, value, blank)}</select></label>`;
function openEditor(kind, id) {
  editing = { kind, id };
  document.querySelector("#form-error").textContent = "";
  let html = "";
  if (kind === "voter") {
    const v = data.voters.find((v) => v.id === id) || {
      status: "Belum dihubungi",
    };
    document.querySelector("#modal-title").textContent = id
      ? "Detail alumni"
      : "Tambah alumni";
    html =
      field(
        "Nama lengkap *",
        "name",
        v.name,
        "text",
        'required maxlength="100"',
      ) +
      field(
        "ID alumni / NIM *",
        "alumniId",
        v.alumniId,
        "text",
        'required maxlength="50"',
      ) +
      field(
        "WhatsApp *",
        "phone",
        v.phone,
        "tel",
        'required placeholder="08… atau +62…"',
      ) +
      field(
        "Kota / wilayah *",
        "city",
        v.city,
        "text",
        'required maxlength="80"',
      ) +
      selectField(
        "Timses penanggung jawab *",
        "team",
        data.teams.map((t) => [
          t.id,
          t.name + " · " + picLabel(data.pics.find((p) => p.id === t.pic)),
        ]),
        v.team,
      ) +
      `<label>Perusahaan<input name="company" list="companies" value="${esc(v.company)}" maxlength="120"></label><label>Komunitas<input name="community" list="communities" value="${esc(v.community)}" maxlength="120"></label><datalist id="companies">${data.orgs
        .filter((o) => o.type === "Perusahaan")
        .map((o) => `<option value="${esc(o.name)}">`)
        .join("")}</datalist><datalist id="communities">${data.orgs
        .filter((o) => o.type === "Komunitas")
        .map((o) => `<option value="${esc(o.name)}">`)
        .join("")}</datalist>` +
      selectField("Status dukungan *", "status", statuses, v.status) +
      field(
        "Tanggal konfirmasi langsung",
        "verifiedAt",
        v.verifiedAt,
        "date",
        `max="${today()}"`,
      ) +
      `<label class="check full"><input type="checkbox" name="consent" ${v.consent ? "checked" : ""}> Alumni menyetujui pendataan dan telah mengonfirmasi dukungannya secara langsung.</label><label class="check full"><input type="checkbox" name="inGroup" ${v.inGroup ? "checked" : ""}> Sudah bergabung dalam grup alumni.</label><label class="full">Catatan tindak lanjut<textarea name="notes" rows="3" maxlength="1000">${esc(v.notes)}</textarea></label>`;
  } else if (kind === "pic") {
    const p = data.pics.find((x) => x.id === id) || {};
    document.querySelector("#modal-title").textContent = id
      ? "Edit PIC jurusan"
      : "Tambah PIC jurusan";
    html =
      '<p class="subtext full">Plotting angkatan dan jurusan berlaku untuk seluruh timses serta alumni di bawah PIC ini.</p>' +
      field(
        "Nama PIC jurusan *",
        "name",
        p.name,
        "text",
        'required maxlength="100"',
      ) +
      selectField(
        "Ketua PIC Angkatan *",
        "chair",
        data.chairs.map((c) => [c.id, c.year + " · " + c.name]),
        p.chair,
      ) +
      field(
        "Jurusan *",
        "department",
        p.department,
        "text",
        'required maxlength="100" list="departments"',
      ) +
      '<datalist id="departments"><option value="Teknik Telekomunikasi"><option value="Teknik Informatika"><option value="Teknik Industri"><option value="Manajemen"><option value="Sistem Informasi"></datalist>' +
      field(
        "Kota / wilayah *",
        "city",
        p.city,
        "text",
        'required maxlength="80"',
      );
  } else if (kind === "chair") {
    const c = data.chairs.find((x) => x.id === id) || {};
    document.querySelector("#modal-title").textContent = id
      ? "Edit Ketua PIC Angkatan"
      : "Tambah Ketua PIC Angkatan";
    html =
      field(
        "Nama Ketua PIC Angkatan *",
        "name",
        c.name,
        "text",
        'required maxlength="100"',
      ) +
      field(
        "Angkatan *",
        "year",
        c.year,
        "number",
        'required min="1950" max="2100"',
      );
  } else if (kind === "team") {
    const t = data.teams.find((x) => x.id === id) || {};
    document.querySelector("#modal-title").textContent = id
      ? "Edit timses"
      : "Tambah timses";
    html =
      field(
        "Nama timses *",
        "name",
        t.name,
        "text",
        'required maxlength="100"',
      ) +
      field(
        "Kota / wilayah *",
        "city",
        t.city,
        "text",
        'required maxlength="80"',
      ) +
      selectField(
        "PIC atasan *",
        "pic",
        data.pics.map((p) => [p.id, picLabel(p)]),
        t.pic,
      );
  } else {
    const o = data.orgs.find((x) => x.id === id) || {};
    document.querySelector("#modal-title").textContent = id
      ? "Edit jejaring"
      : "Tambah jejaring";
    html =
      field(
        "Nama perusahaan / komunitas *",
        "name",
        o.name,
        "text",
        'required maxlength="120"',
      ) +
      selectField("Jenis *", "type", ["Perusahaan", "Komunitas"], o.type) +
      field(
        "Kota / wilayah *",
        "city",
        o.city,
        "text",
        'required maxlength="80"',
      ) +
      field(
        "Kontak penghubung",
        "contact",
        o.contact,
        "text",
        'maxlength="100"',
      );
  }
  document.querySelector("#fields").innerHTML = html;
  modal.showModal();
}
document.querySelector("#editor").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (saving) return;
  const submit = e.target.querySelector("[type=submit]");
  if (submit.disabled) return;
  submit.disabled = true;
  const before = structuredClone(data);
  try {
    const values = Object.fromEntries(new FormData(e.target));
    const { kind, id } = editing;
    if (kind === "voter") {
      const v = validateVoter(
        {
          ...values,
          year:
            chairForPic(data.teams.find((t) => t.id === values.team)?.pic)
              ?.year || "",
          id: id || uid(),
          consent: e.target.elements.consent.checked,
          inGroup: e.target.elements.inGroup.checked,
        },
        data,
      );
      if (id) data.voters = data.voters.map((x) => (x.id === id ? v : x));
      else data.voters.push(v);
      await save(`${id ? "Memperbarui" : "Menambahkan"} alumni ${v.name}.`);
    } else if (kind === "pic") {
      const p = validatePic({ ...values, id: id || uid() }, data);
      if (id) data.pics = data.pics.map((x) => (x.id === id ? p : x));
      else data.pics.push(p);
      await save(`${id ? "Memperbarui" : "Menambahkan"} PIC ${p.name}.`);
    } else if (kind === "chair") {
      const c = validateChair({ ...values, id: id || uid() }, data);
      if (id) data.chairs = data.chairs.map((x) => (x.id === id ? c : x));
      else data.chairs.push(c);
      await save(
        `${id ? "Memperbarui" : "Menambahkan"} Ketua PIC Angkatan ${c.year}: ${c.name}.`,
      );
    } else if (kind === "team") {
      const t = validateTeam({ ...values, id: id || uid() }, data);
      if (id) data.teams = data.teams.map((x) => (x.id === id ? t : x));
      else data.teams.push(t);
      await save(`${id ? "Memperbarui" : "Menambahkan"} timses ${t.name}.`);
    } else {
      const o = { ...values, name: values.name.trim(), id: id || uid() };
      if (
        data.orgs.some(
          (x) =>
            x.id !== id &&
            x.name.toLowerCase() === o.name.toLowerCase() &&
            x.type === o.type,
        )
      )
        throw Error("Jejaring ini sudah terdaftar.");
      const old = data.orgs.find((x) => x.id === id);
      if (old) {
        data.voters = data.voters.map((v) => ({
          ...v,
          company:
            old.type === "Perusahaan" && v.company === old.name
              ? o.type === "Perusahaan"
                ? o.name
                : ""
              : v.company,
          community:
            old.type === "Komunitas" && v.community === old.name
              ? o.type === "Komunitas"
                ? o.name
                : ""
              : v.community,
        }));
        data.orgs = data.orgs.map((x) => (x.id === id ? o : x));
      } else data.orgs.push(o);
      await save(`${id ? "Memperbarui" : "Menambahkan"} jejaring ${o.name}.`);
    }
    modal.close();
    render();
  } catch (err) {
    data = before;
    document.querySelector("#form-error").textContent = err.message;
  } finally {
    submit.disabled = false;
  }
});
for (const id of ["close-modal", "cancel-modal"])
  document.getElementById(id).onclick = () => modal.close();
function download(content, name, type) {
  const a = document.createElement("a"),
    url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.page) {
    navigate(b.dataset.page);
    return;
  }
  const { action, id } = b.dataset;
  if (!action) return;
  if (saving) {
    toast("Sedang menyimpan. Tunggu sebentar.");
    return;
  }
  try {
    if (action.startsWith("add-")) openEditor(action.slice(4));
    if (action.startsWith("edit-")) openEditor(action.slice(5), id);
    if (action === "pic-voters") {
      navigate("voters");
      picFilter = id;
      render();
    }
    if (action === "chair-voters") {
      navigate("voters");
      yearFilter = data.chairs.find((c) => c.id === id)?.year || "";
      render();
    }
    if (action === "team-voters") {
      navigate("voters");
      teamFilter = id;
      render();
    }
    if (action === "copy-form") {
      const link = new URL("/daftar", location.origin);
      if (id) link.searchParams.set("ref", id);
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Konfirmasi Dukungan Alumni FAST",
            url: link.href,
          });
        } catch (err) {
          if (err.name !== "AbortError") throw err;
        }
      } else {
        await navigator.clipboard.writeText(link.href);
        toast("Tautan formulir disalin.");
      }
    }
    if (action === "refresh") await refresh();
    if (action === "logout") {
      await request({ action: "logout" });
      location.replace("/login");
    }
    if (action === "approve") {
      const team = document.querySelector(
        '[data-registration-team="' + CSS.escape(id) + '"]',
      ).value;
      if (!team) throw Error("Pilih timses penanggung jawab terlebih dahulu.");
      b.disabled = true;
      await request({ action: "approve", id, team });
      await refresh();
      toast("Pendaftaran terverifikasi sebagai fix voter.");
    }
    if (action === "reject") {
      b.disabled = true;
      await request({ action: "reject", id });
      await refresh();
      toast("Pendaftaran ditandai ditolak.");
    }
    if (action === "export") {
      const rows = page === "voters" ? filtered() : data.voters;
      download(
        "\uFEFF" +
          [
            [
              "Nama",
              "ID Alumni",
              "WhatsApp",
              "Angkatan",
              "Jurusan",
              "Kota",
              "Perusahaan",
              "Komunitas",
              "Timses",
              "PIC Jurusan",
              "Ketua PIC Angkatan",
              "Jendral Pemenangan",
              "Status",
              "Konfirmasi",
              "Persetujuan",
              "Dalam Grup",
              "Catatan",
            ],
            ...rows.map((v) => [
              v.name,
              v.alumniId,
              v.phone,
              voterYear(v),
              voterDepartment(v),
              v.city,
              v.company,
              v.community,
              teamName(v.team),
              picName(voterPic(v)),
              chairForPic(voterPic(v))?.name,
              data.chief,
              v.status,
              v.verifiedAt,
              v.consent ? "Ya" : "Tidak",
              v.inGroup ? "Ya" : "Tidak",
              v.notes,
            ]),
          ]
            .map((r) => r.map(csvCell).join(","))
            .join("\r\n"),
        `fast-alumni-${today()}.csv`,
        "text/csv;charset=utf-8",
      );
      toast("CSV berhasil diekspor.");
    }
    if (action === "backup")
      download(
        JSON.stringify({ ...data, registrations }, null, 2),
        `fast-cadangan-${today()}.json`,
        "application/json",
      );
    if (action === "import") document.querySelector("#backup-file").click();
    if (
      action === "reset" &&
      demo &&
      confirm(
        "Kembalikan seluruh data browser ini ke contoh awal? Unduh cadangan jika diperlukan.",
      )
    ) {
      const before = data;
      data = seed();
      try {
        await save("Data dikembalikan ke simulasi awal.");
        render();
      } catch (err) {
        data = before;
        throw err;
      }
    }
  } catch (err) {
    b.disabled = false;
    toast(err.message);
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    query = e.target.value;
    document.querySelector("tbody").innerHTML = voterRows(filtered());
    document.querySelector("#result-count").textContent =
      filtered().length + " alumni ditemukan";
    labelTables();
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "status-filter") filter = e.target.value;
  else if (e.target.id === "pic-filter") picFilter = e.target.value;
  else if (e.target.id === "year-filter") yearFilter = e.target.value;
  else if (e.target.id === "department-filter")
    departmentFilter = e.target.value;
  else if (e.target.id === "team-filter") teamFilter = e.target.value;
  else if (e.target.id === "city-filter") cityFilter = e.target.value;
  else return;
  render();
});
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "target-form") return;
  e.preventDefault();
  if (saving) return;
  const old = data.target;
  try {
    data.target = Number(new FormData(e.target).get("target"));
    if (!Number.isInteger(data.target) || data.target < 1)
      throw Error("Target tidak valid.");
    await save("Target fix voters diperbarui.");
    render();
  } catch (err) {
    data.target = old;
    toast(err.message);
  }
});
document.querySelector("#backup-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || saving) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw Error("Cadangan maksimal 5 MB.");
    const incoming = validateBackup(JSON.parse(await file.text()));
    if (
      confirm(
        `Cadangan berisi ${incoming.voters.length} alumni dan ${incoming.pics.length} PIC. Ganti seluruh data browser ini?`,
      )
    ) {
      const before = data;
      data = incoming;
      try {
        await save("Cadangan berhasil diimpor.");
        render();
      } catch (err) {
        data = before;
        throw err;
      }
    }
  } catch (err) {
    toast("Impor gagal: " + err.message);
  }
  e.target.value = "";
});
document.querySelector(".date-display").textContent = new Intl.DateTimeFormat(
  "id-ID",
  { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" },
).format(new Date());
navigate(location.hash.slice(1) || "dashboard");

if (!demo)
  setInterval(() => {
    if (
      !modal.open &&
      !document.querySelector("button:disabled") &&
      !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)
    )
      refresh().catch(() => {});
  }, 30000);
