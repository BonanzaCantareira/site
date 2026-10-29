// Cria uma preferência de pagamento no Mercado Pago (Checkout Pro) e devolve o link do checkout.
// O Access Token fica só na variável de ambiente MP_ACCESS_TOKEN (Netlify). Nunca coloque o token neste arquivo.
import { randomUUID } from "node:crypto";
import { MercadoPagoConfig, Preference } from "mercadopago";

const SITE = "https://bonanzacantareira.com.br";

// ================= DADOS DO EVENTO =================
// Se "titulo" ficar vazio ou "preco" for 0, a função recusa vendas (erro 503).
const EVENTO = {
  id: "standup-bonanza",
  titulo: "Stand Up Comedy com Bruno Henrique — 21/11, 20h (ingresso para casal)",
  preco: 29.9, // valor de CADA ingresso (um casal), em reais
  maxPorCompra: 4, // máximo de ingressos por compra
};
// ========================================================================================

const json = (status, corpo) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const limpar = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export default async (req) => {
  if (req.method !== "POST") return json(405, { erro: "Método não permitido." });

  // Só aceita chamadas vindas do próprio site (e dos deploys do Netlify).
  const permitidas = [SITE, "https://www.bonanzacantareira.com.br", process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean);
  const origem = req.headers.get("origin");
  if (origem && !permitidas.includes(origem)) return json(403, { erro: "Origem não permitida." });

  let dados;
  try {
    const texto = await req.text();
    if (texto.length > 4000) return json(413, { erro: "Requisição muito grande." });
    dados = JSON.parse(texto);
  } catch {
    return json(400, { erro: "Dados inválidos." });
  }

  // Campo-armadilha para robôs: pessoas não o veem nem o preenchem.
  if (limpar(dados.site, 50)) return json(400, { erro: "Dados inválidos." });

  const nome = limpar(dados.nome, 80);
  const email = limpar(dados.email, 120).toLowerCase();
  let fone = String(dados.telefone ?? "").replace(/\D/g, "");
  if (fone.length > 11 && fone.startsWith("55")) fone = fone.slice(2);
  const quantidade = Number.parseInt(dados.quantidade, 10);

  if (nome.length < 3) return json(400, { erro: "Informe seu nome completo.", campo: "nome" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(400, { erro: "Informe um e-mail válido.", campo: "email" });
  if (fone.length < 10 || fone.length > 11) return json(400, { erro: "Informe o telefone com DDD.", campo: "telefone" });
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > EVENTO.maxPorCompra)
    return json(400, { erro: `Escolha de 1 a ${EVENTO.maxPorCompra} ingressos.`, campo: "quantidade" });
  if (dados.consentimento !== true) return json(400, { erro: "É preciso concordar com o uso dos seus dados.", campo: "consentimento" });

  if (!EVENTO.titulo || !(EVENTO.preco > 0)) return json(503, { erro: "As vendas ainda não foram abertas." });
  if (!process.env.MP_ACCESS_TOKEN) {
    console.error("MP_ACCESS_TOKEN não configurada no Netlify.");
    return json(500, { erro: "Pagamento indisponível no momento." });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN, options: { timeout: 8000 } });
    const resultado = await new Preference(client).create({
      body: {
        items: [{ id: EVENTO.id, title: EVENTO.titulo, quantity: quantidade, unit_price: EVENTO.preco, currency_id: "BRL" }],
        payer: { name: nome, email, phone: { area_code: fone.slice(0, 2), number: fone.slice(2) } },
        back_urls: {
          success: `${SITE}/eventos/stand-up/aprovado/`,
          pending: `${SITE}/eventos/stand-up/pendente/`,
          failure: `${SITE}/eventos/stand-up/recusado/`,
        },
        auto_return: "approved",
        external_reference: `${EVENTO.id}-${randomUUID()}`,
        metadata: { evento: EVENTO.id, nome, email, telefone: fone, quantidade },
        statement_descriptor: "BONANZA",
      },
    });

    // Com credenciais de teste, defina MP_SANDBOX=true no Netlify para usar o link de teste.
    const url = process.env.MP_SANDBOX === "true" ? resultado.sandbox_init_point : resultado.init_point;
    if (!url) throw new Error("Resposta sem link de checkout.");
    return json(200, { url });
  } catch (erro) {
    console.error("Falha ao criar preferência:", erro?.message || erro);
    return json(502, { erro: "Não foi possível iniciar o pagamento. Tente novamente em instantes." });
  }
};
