(function () {
  "use strict";
  const params = new URLSearchParams(location.hash.slice(1));
  let token = params.get("admin") || "";
  const key = "htmltopptx-admin";
  try {
    if (token) sessionStorage.setItem(key, token);
    else token = sessionStorage.getItem(key) || "";
  } catch (_) { /* The current page can still administer without browser storage. */ }
  if (params.has("admin")) history.replaceState(null, "", location.pathname + location.search);
  const section = document.getElementById("startup-settings");
  if (!section || !token) return;
  const form = document.getElementById("startup-form");
  const byID = id => document.getElementById(id);
  const result = byID("startup-result");
  const currentMode = () => form.querySelector('input[name="startup-mode"]:checked').value;
  function showResult(text, error = false) {
    result.textContent = text;
    result.dataset.error = String(error);
  }
  async function api(method, body) {
    const response = await fetch("/api/startup", {
      method, cache: "no-store", headers: { "X-App-Token": token, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!response.ok) throw new Error((await response.text()).trim());
    return response.json();
  }
  function updateFields() {
    const web = currentMode() === "web";
    byID("web-fields").hidden = !web;
    byID("web-fields").disabled = !web;
    byID("standalone-fields").hidden = web;
    byID("standalone-fields").disabled = web;
    byID("standalone-port").disabled = byID("standalone-auto").checked;
    byID("web-ip").disabled = byID("web-auto-ip").checked;
  }
  let loaded = false;
  async function loadSettings() {
    try {
      const data = await api("GET");
      const c = data.saved;
      form.querySelector(`input[name="startup-mode"][value="${c.mode}"]`).checked = true;
      byID("standalone-auto").checked = c.standalonePort === 0;
      byID("standalone-port").value = c.standalonePort || 8080;
      byID("web-auto-ip").checked = c.webIP === "auto";
      byID("web-ip").value = c.webIP === "auto" ? "" : c.webIP;
      byID("web-port").value = c.webPort;
      byID("machine-addresses").replaceChildren(...data.addresses.map(address => {
        const option = document.createElement("option"); option.value = address.address; option.label = address.interface; return option;
      }));
      byID("machine-address-hint").textContent = data.addresses.length
        ? `自動選択の候補：${data.addresses.map(a => `${a.address}（${a.interface}）`).join("、")}。複数ある場合は庁内接続用のIPを指定してください。`
        : "現在、利用できるIPv4アドレスがありません。ネットワーク接続を確認してください。";
      byID("startup-current").textContent = `現在：${data.active.mode === "web" ? "Web" : "スタンドアロン"} ／ ${data.url}`;
      byID("startup-config-path").textContent = data.configPath;
      if (data.active.mode === "web") byID("startup-restart-hint").textContent = "保存後、サーバーのアプリを停止・再起動すると反映されます。このブラウザを閉じてもサーバーは停止しません。";
      section.hidden = false;
      loaded = true;
      updateFields();
    } catch (error) {
      // A stale capability after a process restart is not an admin session.
      section.hidden = false;
      form.hidden = true;
      showResult(`起動設定を読み込めません。端末でアプリの設定画面を開き直してください。${error.message}`, true);
    }
  }
  form.addEventListener("change", updateFields);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!loaded) return;
    const button = byID("save-startup");
    const config = {
      mode: currentMode(),
      standalonePort: byID("standalone-auto").checked ? 0 : Number(byID("standalone-port").value),
      webIP: byID("web-auto-ip").checked ? "auto" : byID("web-ip").value.trim(),
      webPort: Number(byID("web-port").value)
    };
    button.disabled = true;
    try {
      await api("POST", config);
      showResult("保存しました。現在の起動状態は変わりません。アプリの次回起動から反映されます。");
    } catch (error) { showResult(`保存できませんでした：${error.message}`, true); }
    finally { button.disabled = false; }
  });
  loadSettings();
})();
