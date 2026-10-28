export async function request(body, view = "") {
  const response = await fetch(
    "/api/workspace" + (view ? "?view=" + encodeURIComponent(view) : ""),
    {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      credentials: "same-origin",
    },
  );
  const result = await response
    .json()
    .catch(() => ({ error: "Server belum siap. Coba lagi nanti." }));
  if (!response.ok) {
    const error = Error(result.error || "Permintaan gagal.");
    error.status = response.status;
    throw error;
  }
  return result;
}
export const escapeHtml = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
