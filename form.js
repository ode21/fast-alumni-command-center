import { request } from "./client.js";
const form = document.querySelector("#registration-form"),
  button = document.querySelector("#submit-registration"),
  error = document.querySelector("#registration-error");
const startedAt = Date.now();
let catalog, linked;
function fillTeams() {
  const year = form.elements.year.value,
    department = form.elements.department.value,
    selected = form.elements.team.value;
  form.elements.team.replaceChildren(new Option("Belum punya penghubung", ""));
  for (const t of catalog.teams.filter(
    (t) => t.year === year && t.department === department,
  ))
    form.elements.team.add(new Option(t.name, t.id));
  if ([...form.elements.team.options].some((o) => o.value === selected))
    form.elements.team.value = selected;
}
try {
  catalog = await request(null, "catalog");
  for (const d of catalog.departments) {
    const o = document.createElement("option");
    o.value = d;
    document.querySelector("#department-list").append(o);
  }
  const ref = new URL(location.href).searchParams.get("ref");
  if (ref) {
    linked = catalog.teams.find((t) => t.id === ref);
    if (!linked)
      throw Error(
        "Tautan penghubung tidak ditemukan. Minta tautan terbaru dari pengirim.",
      );
    form.elements.year.value = linked.year;
    form.elements.department.value = linked.department;
    form.elements.year.readOnly = form.elements.department.readOnly = true;
    fillTeams();
    form.elements.team.value = linked.id;
    document.querySelector("#team-label").hidden = true;
    const context = document.querySelector("#ref-context");
    context.hidden = false;
    context.textContent = `Penghubung: ${linked.name} · ${linked.year} · ${linked.department}`;
  }
  button.disabled = false;
} catch (err) {
  error.textContent = err.message;
  button.textContent = "Formulir belum tersedia";
}
for (const name of ["year", "department"])
  form.elements[name].addEventListener("input", () => {
    if (catalog && !linked) fillTeams();
  });
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  error.textContent = "";
  if (!catalog || !form.reportValidity()) return;
  button.disabled = true;
  button.textContent = "Sedang mengirim…";
  try {
    const values = Object.fromEntries(new FormData(form)),
      result = await request({
        ...values,
        action: "register",
        startedAt,
        support: form.elements.support.checked,
        consent: form.elements.consent.checked,
      });
    document.querySelector("#form-card").hidden = true;
    document.querySelector(".form-intro").hidden = true;
    document.querySelector("#receipt").textContent = result.receipt;
    const success = document.querySelector("#success-card");
    success.hidden = false;
    success.focus();
    success.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    error.textContent = err.message;
    error.scrollIntoView({ behavior: "smooth", block: "center" });
    button.disabled = false;
    button.textContent = "Kirim konfirmasi ↗";
  }
});
