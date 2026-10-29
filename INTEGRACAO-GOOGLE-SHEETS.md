# Leads do Stand-Up → Google Sheets

Planilha: Transações - Leads - Ingresso Stand Up
Aba: Leads (colunas A:D: Data e Hora, Nome, Email, Telefone)

## Configurar
1. **Revogue a chave privada enviada na conversa** no Google Cloud IAM e gere uma nova chave da conta de serviço. Não envie a nova chave por chat nem faça commit do JSON.
2. Compartilhe a planilha com `bonanza-cantareira@n8n-pessoal-463022.iam.gserviceaccount.com` como **Editor**.
3. Ative a **Google Sheets API** no projeto Google Cloud `n8n-pessoal-463022`.
4. Em Netlify → Site configuration → Environment variables, adicione:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = email da conta de serviço acima.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` = campo `private_key` do **novo** JSON (incluindo BEGIN/END PRIVATE KEY). Use valor protegido, disponível para Functions.
5. Faça novo deploy. Confirme que a aba se chama exatamente `Leads` e que a primeira linha contém os quatro títulos.
6. Envie um cadastro de teste e confirme uma nova linha. Verifique também o redirecionamento ao checkout InfinitePay.

## Comportamento
O servidor valida nome, email e telefone e tenta gravar uma linha no Sheets **antes** de criar o checkout. A data é gerada em America/Sao_Paulo. Se a integração falhar, o erro aparece nos logs Netlify, mas não bloqueia o checkout. Cada nova tentativa válida pode criar uma nova linha (sem deduplicação). Uma linha registrada **não confirma pagamento**.

## Segurança e privacidade
Nunca publique o JSON da conta de serviço nem a chave privada em GitHub, HTML ou JS do navegador. Para uso de CRM e mensagens promocionais, implemente consentimento/base legal adequada e disponibilize aviso de privacidade (LGPD). Restrinja o acesso à planilha.
