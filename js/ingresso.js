/* ==========================================================================
   BONANZA CANTAREIRA — Formulário de ingresso (stand-up)
   Valida os dados, chama a função serverless que cria o checkout na
   InfinitePay e redireciona o cliente para o pagamento.
   ========================================================================== */
document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("ticket-form");
  if (!form) return;

  var status = document.getElementById("ticket-status");
  var button = form.querySelector(".ticket-form__submit");
  var label = button.querySelector(".btn__label");
  var labelOriginal = label.textContent;

  /* ---------- Máscara de telefone: (11) 98906-2255 ---------- */
  var tel = form.elements["telefone"];
  tel.addEventListener("input", function () {
    var d = tel.value.replace(/\D/g, "").slice(0, 11);
    var out = d;
    if (d.length > 10) out = "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    else if (d.length > 6) out = "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    else if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2);
    else if (d.length > 0) out = "(" + d;
    tel.value = out;
  });

  /* ---------- Helpers de erro ---------- */
  function setError(name, msg) {
    var field = form.elements[name].closest(".field");
    var slot = form.querySelector('[data-error-for="' + name + '"]');
    field.classList.toggle("has-error", !!msg);
    form.elements[name].setAttribute("aria-invalid", msg ? "true" : "false");
    if (slot) slot.textContent = msg || "";
  }
  function clearErrors() {
    ["nome", "email", "telefone"].forEach(function (n) { setError(n, ""); });
    status.textContent = "";
    status.classList.remove("is-error");
  }
  function showStatus(msg, isError) {
    status.textContent = msg;
    status.classList.toggle("is-error", !!isError);
  }
  function setLoading(on) {
    button.disabled = on;
    label.textContent = on ? "Abrindo o pagamento…" : labelOriginal;
  }

  /* ---------- Validação no navegador (o servidor valida de novo) ---------- */
  function validate() {
    var ok = true, firstInvalid = null;
    var nome = form.elements["nome"].value.trim().replace(/\s+/g, " ");
    var email = form.elements["email"].value.trim();
    var telDigits = tel.value.replace(/\D/g, "");

    if (nome.length < 3 || nome.indexOf(" ") === -1) {
      setError("nome", "Informe seu nome completo."); ok = false; firstInvalid = firstInvalid || "nome";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError("email", "Informe um e-mail válido."); ok = false; firstInvalid = firstInvalid || "email";
    }
    if (telDigits.length < 10 || telDigits.length > 11) {
      setError("telefone", "Informe o telefone com DDD."); ok = false; firstInvalid = firstInvalid || "telefone";
    }
    if (firstInvalid) form.elements[firstInvalid].focus();
    return ok;
  }

  function track(name, params) {
    if (typeof window.gtag === "function") window.gtag("event", name, params || {});
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearErrors();
    if (!validate()) return;

    setLoading(true);
    track("begin_checkout", { currency: "BRL", value: 29.9, items: [{ item_name: "Stand Up — Bruno Henrique (casal)", price: 29.9, quantity: 1 }] });

    fetch(form.getAttribute("action"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.elements["nome"].value,
        email: form.elements["email"].value,
        telefone: tel.value,
        website: form.elements["website"].value
      })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (r) {
        if (r.ok && r.data.url) {
          showStatus("Redirecionando para o pagamento seguro…", false);
          window.location.href = r.data.url;
          return;
        }
        if (r.data && r.data.campo && form.elements[r.data.campo]) {
          setError(r.data.campo, r.data.erro);
          form.elements[r.data.campo].focus();
        } else {
          showStatus((r.data && r.data.erro) || "Não foi possível iniciar o pagamento. Tente novamente.", true);
        }
        setLoading(false);
      })
      .catch(function () {
        showStatus("Sem conexão. Verifique sua internet e tente novamente.", true);
        setLoading(false);
      });
  });

  /* Se o cliente voltar do checkout pelo botão "voltar" do navegador,
     o botão não pode ficar travado (bfcache). */
  window.addEventListener("pageshow", function (ev) { if (ev.persisted) setLoading(false); });
});
