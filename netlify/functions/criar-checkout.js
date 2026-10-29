/* ==========================================================================
   Bonanza Cantareira — Criação de checkout (InfinitePay) para ingressos

   Fluxo:
   1. O formulário em /eventos envia nome, e-mail e telefone para esta função.
   2. A função valida os dados e cria o link de pagamento na InfinitePay
      (a API Key NUNCA vai para o navegador, só existe aqui, no servidor).
   3. Devolve a URL do checkout; o navegador redireciona o cliente para ela.
   4. Quando o pagamento é aprovado, a InfinitePay chama o webhook do Make.

   Variáveis de ambiente (Netlify → Site configuration → Environment variables):
   - INFINITEPAY_API_KEY      (obrigatória) chave inchk_...
   - INFINITEPAY_WEBHOOK_URL  (opcional) padrão: webhook do Make abaixo
   - LEAD_WEBHOOK_URL         (opcional) recebe os dados do comprador assim que
                              o checkout é criado (ver README)
   - SITE_URL                 (opcional) padrão: https://bonanzacantareira.com.br
   ========================================================================== */

const crypto = require("crypto");

/* ----------------------- Configuração do evento ----------------------- */
/* Preço e descrição ficam AQUI, no servidor: o navegador nunca decide o valor. */
const EVENTO = {
  slug: "standup-bruno-henrique",
  descricao: "Ingresso (casal) — Bruno Henrique | Stand Up Comedy — 21/11 às 20h — Bonanza Cantareira",
  precoCentavos: 2990, // R$ 29,90 por casal
  quantidade: 1,
  // O link deixa de aceitar pagamento no horário de início do show.
  validoAte: "2026-11-21T20:00:00-03:00",
};

const DEFAULT_WEBHOOK = "https://hook.us2.make.com/k7b4fhn264d84825m1qr9ol89idxdtk8";
const DEFAULT_SITE = "https://bonanzacantareira.com.br";
const INFINITEPAY_URL = "https://api.checkout.infinitepay.io/links";

/* ------------------------------- Helpers ------------------------------- */
function resposta(statusCode, corpo) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body: JSON.stringify(corpo),
  };
}

function normalizarTelefone(bruto) {
  let digitos = String(bruto || "").replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length > 11) digitos = digitos.slice(2);
  // DDD (2) + celular (9) ou fixo (8)
  if (digitos.length !== 10 && digitos.length !== 11) return null;
  if (digitos.startsWith("0")) return null;
  return "+55" + digitos;
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 120;
}

/* ------------------------------- Handler ------------------------------- */
exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return resposta(405, { erro: "Método não permitido." });
  }

  const apiKey = process.env.INFINITEPAY_API_KEY;
  if (!apiKey) {
    console.error("INFINITEPAY_API_KEY não configurada.");
    return resposta(500, { erro: "Venda temporariamente indisponível. Fale conosco pelo WhatsApp." });
  }

  // Encerra as vendas depois do início do show
  if (Date.now() >= new Date(EVENTO.validoAte).getTime()) {
    return resposta(410, { erro: "As vendas para este evento foram encerradas." });
  }

  let dados;
  try {
    dados = JSON.parse(event.body || "{}");
  } catch (e) {
    return resposta(400, { erro: "Requisição inválida." });
  }

  // Honeypot: robôs preenchem este campo escondido; humanos não.
  // Respondemos "sucesso" falso para não dar pista ao robô.
  if (dados.website) {
    return resposta(200, { url: DEFAULT_SITE + "/eventos" });
  }

  const nome = String(dados.nome || "").trim().replace(/\s+/g, " ");
  const email = String(dados.email || "").trim().toLowerCase();
  const telefone = normalizarTelefone(dados.telefone);

  if (nome.length < 3 || nome.length > 100 || !nome.includes(" ")) {
    return resposta(400, { erro: "Informe seu nome completo.", campo: "nome" });
  }
  if (!emailValido(email)) {
    return resposta(400, { erro: "Informe um e-mail válido.", campo: "email" });
  }
  if (!telefone) {
    return resposta(400, { erro: "Informe um telefone com DDD, ex.: (11) 98906-2255.", campo: "telefone" });
  }

  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE).replace(/\/+$/, "");
  // Identificador único do pedido, gerado no servidor
  const orderNsu = EVENTO.slug + "-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");

  const payload = {
    order_nsu: orderNsu,
    redirect_url: siteUrl + "/eventos/obrigado/",
    items: [
      { quantity: EVENTO.quantidade, price: EVENTO.precoCentavos, description: EVENTO.descricao },
    ],
    customer: { name: nome, email: email, phone_number: telefone },
    options: {
      single_payment: true,
      valid_until: EVENTO.validoAte,
      payment_methods_enabled: ["pix", "credit_card"],
      assured_installments: 0,
      require_delivery_address: false,
    },
    webhook: {
      url: process.env.INFINITEPAY_WEBHOOK_URL || DEFAULT_WEBHOOK,
      events: ["paid"],
    },
  };

  let checkoutUrl;
  try {
    const r = await fetch(INFINITEPAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify(payload),
    });
    const texto = await r.text();
    let json = {};
    try { json = JSON.parse(texto); } catch (e) { /* resposta não-JSON */ }

    if (!r.ok) {
      console.error("InfinitePay respondeu " + r.status + ": " + texto.slice(0, 500));
      return resposta(502, { erro: "Não foi possível iniciar o pagamento. Tente novamente em instantes." });
    }
    // A documentação mostra "url" em um lugar e "checkout_url" em outro: aceitamos os dois.
    checkoutUrl = json.url || json.checkout_url;
  } catch (e) {
    console.error("Falha ao chamar a InfinitePay:", e);
    return resposta(502, { erro: "Não foi possível iniciar o pagamento. Tente novamente em instantes." });
  }

  if (!checkoutUrl || !/^https:\/\//.test(checkoutUrl)) {
    console.error("InfinitePay não devolveu a URL do checkout.");
    return resposta(502, { erro: "Não foi possível iniciar o pagamento. Tente novamente em instantes." });
  }

  // Opcional: registra o lead (nome/e-mail/telefone ↔ order_nsu) no Make.
  // Falha aqui NÃO impede a venda.
  if (process.env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(process.env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento: "checkout_criado",
          order_nsu: orderNsu,
          ingresso: EVENTO.descricao,
          valor_centavos: EVENTO.precoCentavos,
          nome: nome,
          email: email,
          telefone: telefone,
          checkout_url: checkoutUrl,
          criado_em: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error("Falha ao enviar lead:", e);
    }
  }

  return resposta(200, { url: checkoutUrl, order_nsu: orderNsu });
};
