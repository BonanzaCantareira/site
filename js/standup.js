/* Formulário de ingressos (stand-up) e páginas de retorno do pagamento */
(function () {
  // Modo de teste: /eventos/?teste=ingressos mostra a seção mesmo oculta
  var sec = document.getElementById("stand-up");
  if (sec && /(^|[?&])teste=ingressos(&|$)/.test(window.location.search)) sec.hidden = false;

  var form = document.getElementById("form-ingresso");
  if (form) {
    var status = document.getElementById("ticket-status");
    var btn = form.querySelector("button[type=submit]");
    var tel = form.elements.telefone;
    btn.dataset.label = btn.textContent;

    // Total exibido (o valor cobrado é sempre o definido no servidor)
    var qtd = form.elements.quantidade, totalEl = document.getElementById("ing-total");
    function total() {
      var v = (parseFloat(form.dataset.preco) || 0) * (parseInt(qtd.value, 10) || 1);
      totalEl.textContent = v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    qtd.addEventListener("change", total); total();

    tel.addEventListener("input", function () {
      var d = tel.value.replace(/\D/g, "").slice(0, 11), o = d;
      if (d.length > 10) o = "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
      else if (d.length > 6) o = "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
      else if (d.length > 2) o = "(" + d.slice(0, 2) + ") " + d.slice(2);
      tel.value = o;
    });

    function erro(msg, campo) {
      status.textContent = msg;
      var el = campo && form.elements[campo];
      if (el) { el.setAttribute("aria-invalid", "true"); el.focus(); }
    }
    function reset() { btn.disabled = false; btn.textContent = btn.dataset.label; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.textContent = "";
      Array.prototype.forEach.call(form.elements, function (el) { el.removeAttribute("aria-invalid"); });
      var f = form.elements;
      var dados = {
        nome: f.nome.value.trim(),
        email: f.email.value.trim(),
        telefone: f.telefone.value,
        quantidade: parseInt(f.quantidade.value, 10),
        consentimento: f.consentimento.checked,
        site: f.site.value
      };
      if (dados.nome.length < 3) return erro("Informe seu nome completo.", "nome");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dados.email)) return erro("Informe um e-mail válido.", "email");
      var d = dados.telefone.replace(/\D/g, "");
      if (d.length < 10 || d.length > 11) return erro("Informe o telefone com DDD.", "telefone");
      if (!dados.consentimento) return erro("É preciso concordar para continuar.", "consentimento");

      btn.disabled = true;
      btn.textContent = "Abrindo o pagamento…";
      fetch("/.netlify/functions/criar-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
        })
        .then(function (x) {
          if (!x.ok || !x.j.url) { reset(); return erro(x.j.erro || "Não foi possível iniciar o pagamento. Tente novamente.", x.j.campo); }
          var u;
          try { u = new URL(x.j.url); } catch (_) { u = null; }
          // só redireciona para o domínio do Mercado Pago
          if (!u || u.protocol !== "https:" || !/(^|\.)mercadopago\.com(\.br)?$/.test(u.hostname)) {
            reset(); return erro("Não foi possível iniciar o pagamento. Tente novamente.");
          }
          if (window.gtag) gtag("event", "begin_checkout", { currency: "BRL" });
          window.location.href = u.href;
        })
        .catch(function () { reset(); erro("Sem conexão. Verifique sua internet e tente novamente."); });
    });
    window.addEventListener("pageshow", function (ev) { if (ev.persisted) reset(); });
  }

  // Páginas de retorno: mostra o código do pagamento, se vier na URL
  var idEl = document.getElementById("pay-id");
  if (idEl) {
    var id = new URLSearchParams(window.location.search).get("payment_id");
    if (id && /^\d{5,20}$/.test(id)) { idEl.textContent = id; idEl.parentElement.hidden = false; }
  }
})();
