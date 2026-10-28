import { request } from "./client.js";
document.querySelector("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = e.target.querySelector("button"),
    error = document.querySelector("#login-error");
  button.disabled = true;
  error.textContent = "";
  try {
    await request({
      action: "login",
      password: e.target.elements.password.value,
    });
    e.target.reset();
    location.replace("/");
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
  }
});
