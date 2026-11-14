(() => {
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  const API = local ? "http://localhost:3001" : "/api";
  const $ = id => document.getElementById(id);
  const request = (path, options = {}) => fetch(API + path, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", ...(options.headers || {}) }
  });

  async function refreshProfile() {
    try {
      const response = await request("/auth/me");
      if (!response.ok) throw new Error("Sessão ausente");
      const data = await response.json();
      renderUser(data.user, data.authenticatedAt);
    } catch {
      $("guest-state").classList.remove("hidden");
      $("profile-state").classList.add("hidden");
      $("auth-status").textContent = "Não autenticado";
      $("auth-status").className = "pill pill-muted";
    }
  }

  function renderUser(user, time) {
    $("guest-state").classList.add("hidden");
    $("profile-state").classList.remove("hidden");
    $("auth-status").textContent = "Autenticado";
    $("auth-status").className = "pill pill-green";
    $("profile-name").textContent = user.name || "Usuário";
    $("profile-email").textContent = user.email || "";
    $("profile-sub").textContent = user.googleId || "Não informado";
    $("profile-time").textContent = time ? new Date(time).toLocaleString("pt-BR") : "—";
    $("profile-picture").src = user.picture || "https://www.gravatar.com/avatar/?d=mp";
  }

  async function handleCredential(response) {
    $("login-message").textContent = "Validando sua identidade no servidor…";
    try {
      const result = await request("/auth/google", {
        method: "POST", body: JSON.stringify({ credential: response.credential })
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || "Não foi possível autenticar.");
      renderUser(data.user, new Date().toISOString());
      $("login-message").textContent = "Login realizado e sessão criada com segurança.";
    } catch (error) {
      $("login-message").textContent = error.message;
    }
  }

  async function init() {
    await refreshProfile();
    try {
      const response = await request("/config");
      const config = await response.json();
      if (!config.googleClientId) {
        $("google-button").innerHTML = '<div class="skeleton">Configure GOOGLE_CLIENT_ID nas variáveis de ambiente para ativar o login.</div>';
        return;
      }
      const waitForGoogle = () => {
        if (window.google?.accounts?.id) {
          google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: handleCredential,
            auto_select: false
          });
          google.accounts.id.renderButton($("google-button"), {
            theme: "outline", size: "large", shape: "pill",
            text: "signin_with", width: 260
          });
        } else setTimeout(waitForGoogle, 150);
      };
      waitForGoogle();
    } catch {
      $("google-button").innerHTML = '<div class="skeleton">Não foi possível conectar ao backend.</div>';
    }
  }

  $("logout-button").addEventListener("click", async () => {
    try {
      const response = await request("/auth/logout", { method: "POST", body: "{}" });
      if (!response.ok) throw new Error("Não foi possível encerrar a sessão.");
      await refreshProfile();
      $("login-message").textContent = "Sessão encerrada no servidor.";
    } catch (error) { $("login-message").textContent = error.message; }
  });

  $("oauth-start").addEventListener("click", event => {
    if (local) {
      event.preventDefault();
      location.href = API + "/oauth/start";
    }
  });
  window.addEventListener("DOMContentLoaded", init);
})();
