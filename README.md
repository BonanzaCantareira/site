# Bonanza Cantareira — Site Institucional

Site estático (HTML + CSS + JS puro, sem build) do Bonanza Cantareira — Bar & Restaurante, conforme o PRD do projeto. Não há CMS: todo o conteúdo é editado diretamente nos arquivos `.html`.

## Estrutura

```
/
├── index.html              → Home
├── cardapio/index.html     → bonanzacantareira.com.br/cardapio
├── eventos/index.html      → bonanzacantareira.com.br/eventos
├── bio-instagram/index.html→ bonanzacantareira.com.br/bio-instagram
├── 404.html                 → página de erro personalizada
├── css/style.css           → design system completo (cores, tipografia, componentes)
├── js/main.js              → menu mobile, animações, navegação do cardápio
├── images/
│   ├── icons/sprite.svg    → símbolo da marca + ícones (editar aqui afeta todas as páginas)
│   ├── og-image.jpg        → imagem de pré-visualização ao compartilhar links
├── favicon.svg / apple-touch-icon.png
├── robots.txt / sitemap.xml / netlify.toml
```

> ⚠️ Os caminhos de CSS/JS/imagens e a navegação usam links **raiz-relativos** (começam com `/`, ex: `/css/style.css`). Isso funciona perfeitamente quando o site está publicado (Netlify/Hostinger), mas **não funciona ao abrir o `index.html` direto no navegador (file://)**. Para testar localmente, use um servidor simples, por exemplo:
> ```bash
> npx serve .
> ```
> ou a extensão "Live Server" do VS Code.

## Conteúdo pendente (ver PRD, seção 8 e 12)

Este site foi entregue com **conteúdo placeholder** nos pontos abaixo — substitua antes de publicar definitivamente:

- **Fotos**: todos os blocos com fundo verde/marrom e um ícone no centro (`<div class="photo-placeholder">`) são placeholders. Substitua por uma `<img src="..." alt="...">` real quando houver fotografia profissional.
- **Cardápio** (`/cardapio/index.html`): os itens de cada categoria são **exemplos ilustrativos**. Edite nome, descrição e categorias conforme o cardápio real (sem preços, como definido no PRD).
- **Eventos** (`/eventos/index.html`): a página está no "estado vazio" (sem eventos cadastrados). Há um modelo comentado no próprio arquivo (`<!-- MODELO ... -->`) para duplicar quando houver um evento confirmado.
- **Texto "Sobre nós"** (`index.html`, seção `#sobre`): redigido com base no Brand Book — revisar/ajustar conforme desejado.

## Como adicionar um item ao cardápio

Dentro de `cardapio/index.html`, localize a categoria desejada (ex: `<section class="menu-category" id="principais">`) e duplique um bloco `<article class="menu-item">...</article>`, alterando título, descrição e o texto do `<span>` dentro do placeholder de foto (ou substituindo o placeholder por uma imagem real).

## Como adicionar um evento

Em `eventos/index.html`, copie o bloco comentado `<!-- MODELO ... -->`, remova os comentários `<!--` `-->`, preencha data/título/descrição e cole acima ou abaixo do estado vazio. Quando houver pelo menos um evento, remova o bloco `.eventos-empty`.

## Deploy (GitHub → Netlify → domínio Hostinger)

1. Crie um repositório no GitHub e suba esta pasta (`git init`, `git add .`, `git commit`, `git push`).
2. Em [netlify.com](https://app.netlify.com), clique em **Add new site → Import an existing project** e conecte ao repositório.
3. Build command: **deixe vazio**. Publish directory: `.` (raiz). Esse repositório já inclui `netlify.toml` com essas configurações.
4. Após o primeiro deploy, vá em **Domain settings → Add a domain** e adicione `bonanzacantareira.com.br` e `www.bonanzacantareira.com.br`.
5. O Netlify mostrará os registros DNS exatos a configurar (geralmente um registro `A`/`ALIAS` para o domínio raiz e um `CNAME` para `www`). Copie esses valores.
6. No painel da Hostinger, acesse a **Zona DNS** do domínio `bonanzacantareira.com.br` e cadastre os registros indicados pelo Netlify.
7. Aguarde a propagação (geralmente minutos a poucas horas) — o Netlify emite automaticamente o certificado SSL (HTTPS) via Let's Encrypt quando o domínio é validado.
8. Repita o deploy a cada novo `git push` na branch principal — é automático.

## Analytics e Search Console

- O **Google Analytics 4** já está configurado em todas as páginas com o Measurement ID real (`G-4Y4GLZ8PND`).
- O mapa incorporado e o botão "Abrir no Google Maps" (em `index.html`) já apontam para o perfil real e verificado do Bonanza Cantareira no Google Maps (via CID), em vez de uma busca genérica por endereço.
- Já há rastreamento de cliques (eventos GA4 `click_whatsapp`, `click_maps`, `click_instagram`) implementado em `js/main.js` — funciona automaticamente assim que o ID real for configurado.
- Falta apenas: submeter `sitemap.xml` no Google Search Console após o lançamento, e confirmar que nome/endereço/telefone coincidem exatamente com o Google Business Profile (consistência de NAP).
