# ChargeGuard AI — Contexto do projeto

Documento de referência com objetivo, problema, produto, estado atual do código, decisões e próximos passos. Foi escrito em 2026-10-30 e atualizado em 2026-10-31, a partir do one-pager original e do código na branch `claude/chargeguard-ai-platform-rb7vog`.

> **Decisão de 2026-10-31:** não será possível vincular a API da Anthropic ao projeto, então a análise com LLM passou a usar a **API do Gemini** (`@google/genai`). O one-pager original foi escrito para o programa Anthropic / Claude for Startups; as seções 1 a 6 preservam esse texto original, e o que vale para o código atual está nas seções 7 em diante.

---

## 1. Visão geral

ChargeGuard AI é uma infraestrutura de resolução autônoma de chargebacks (disputas de cartão) para plataformas SaaS e de comércio digital globais. Ela pega telemetria de produto, registros de suporte e os Termos de Serviço do comerciante, e monta um dossiê de evidências no padrão exigido pelos bancos para reverter **fraude de primeira parte** ("friendly fraud"), sem intervenção humana.

O pitch original era voltado ao programa **Anthropic / Claude for Startups**, com o Claude como motor central. Na implementação atual o motor é o Gemini (ver a decisão no topo); o pitch precisa ser reescrito se o encaixe com a Anthropic deixar de valer.

## 2. Problema

- Fraude de primeira parte responde por mais de 70% dos chargebacks digitais, algo como US$ 48 bilhões por ano para comerciantes online.
- Taxas altas de disputa colocam o comerciante em programas de monitoramento da Visa e da Mastercard (VDMP/ECP, limite de 0,9%), com multas mensais e risco de encerramento da conta.
- O Visa Compelling Evidence 3.0 (CE 3.0) permite reversão automática de disputa, mas exige reconciliar 120+ dias de histórico (IP, impressão digital de dispositivo, credenciais de login).
- Soluções existentes usam templates estáticos que geram PDFs rígidos, com recuperação abaixo de 45% em disputas internacionais.

## 3. Solução

Funciona como um departamento de disputas autônomo, em três etapas:

1. **Gatilho e ingestão.** Recebe webhooks de disputa dos gateways (Stripe, Adyen, Braintree) e consulta os sistemas conectados (Auth0, PostHog, Zendesk, API da Stripe).
2. **Síntese forense com LLM (no pitch: Claude; no código atual: Gemini).** Lê logs de sessão, transcrições de suporte e os Termos de Serviço completos. Avalia a disputa contra as regras de cada rede (Visa 10.4 e 13.1; Mastercard 4837 e 4853), verifica a conformidade com CE 3.0 auditando transações históricas e produz um dossiê cronológico com carta de apresentação, cláusulas contratuais destacadas e a carta no idioma nativo do banco emissor.
3. **Representação automática.** Envia o pacote final pela API de disputas do processador em horas, bem antes dos prazos usuais de 7 a 21 dias.

Um ponto de design importante: o produto sabe **quando não contestar**. Se a evidência mostra que o comerciante falhou com os próprios termos (por exemplo, um pedido de reembolso sem resposta dentro da janela de reembolso), a recomendação é aceitar a disputa, protegendo a taxa de disputa.

## 4. Por que um LLM de contexto longo (pitch original: Claude)

- **Raciocínio complexo:** separar disputa legítima de friendly fraud exige cruzar contexto de conversa com logs de uso do produto.
- **Contexto longo:** auditar contratos SaaS de várias páginas junto com milhares de linhas de logs JSON exige 200k+ tokens.
- **ROI mensurável:** o valor recuperado aparece de forma transparente no balanço do comerciante.

## 5. Modelo de negócio e go-to-market

- **Monetização:** contingência pura (15% a 20% dos fundos recuperados) ou híbrido (US$ 199/mês + 12% de taxa de sucesso). Risco financeiro zero para quem adota.
- **Distribuição:** integração em 1 clique via Stripe App Marketplace e Shopify App Store, mais webhooks de API diretos para plataformas SaaS enterprise.
- **Vantagem regulatória:** risco de custódia zero. A plataforma é só uma camada de orquestração de software, sem necessidade de licença bancária nem registro de transmissor de dinheiro.
- **Segmento inicial:** SaaS B2B com US$ 1M a 20M de ARR e volume relevante de portadores de cartão internacionais.

## 6. Metas (MVP a 12 meses)

| Métrica | Meta | Referência de mercado |
| --- | --- | --- |
| Taxa de vitória em disputas | > 70% | 40–45% |
| Tempo até o envio | < 60 min após o webhook | 7–21 dias de prazo |

---

## 7. Estado atual do código

Repositório: `github.com/Negzs06/startup`, branch `claude/chargeguard-ai-platform-rb7vog`. É um protótipo funcional rodando sobre dados de demonstração.

### Stack

Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4, componentes no estilo shadcn/ui sobre `radix-ui`, SDK Google Gen AI (`@google/genai`) e zod. Testes com `node:test` via `tsx`.

> `AGENTS.md` avisa que esta versão do Next.js tem mudanças incompatíveis. Antes de escrever código, leia o guia relevante em `node_modules/next/dist/docs/`.

### Funcionalidades

**Páginas**
- Landing page em inglês: problema, como funciona, por que Gemini, preços e metas.
- Dashboard em `/dashboard`: fila de disputas e faixa de KPIs (taxa de vitória, tempo mediano até o envio, valor recuperado, taxa de disputa frente ao limite de 0,9%).
- Visão de cada caso em `/dashboard/disputes/[id]`: veredito, auditoria CE 3.0, linha do tempo, cláusulas dos Termos destacadas e carta de apresentação no idioma do emissor.

**Motor de auditoria CE 3.0** (`src/lib/ce3/audit.ts`), determinístico e testado. É uma leitura **simplificada** das regras e deve ser conferida contra as regras atuais da Visa antes de qualquer envio real:
- só vale para Visa 10.4;
- exige pelo menos duas transações anteriores nunca disputadas, de 120 a 365 dias antes da transação disputada (limites inclusivos);
- cada uma deve compartilhar ao menos dois entre IP, ID de dispositivo, ID de conta e endereço de entrega com a transação disputada, sendo um deles o IP ou o ID de dispositivo.

**Webhook da Stripe** (`src/lib/stripe/webhook.ts`, `src/app/api/webhooks/stripe`):
- verificação real do `Stripe-Signature` (HMAC-SHA256 sobre `t.payload`, tolerância de 300 s, comparação em tempo constante, várias assinaturas `v1` aceitas para rotação de segredo);
- normalização de `charge.dispute.created` em um registro de disputa;
- responde 503 se `STRIPE_WEBHOOK_SECRET` não estiver configurado.

**Análise com Gemini** (`src/lib/analysis/`, rota `POST /api/disputes/[id]/analyze`):
- uma chamada `generateContent` em modo JSON, com o schema de resposta derivado do mesmo schema zod que valida a saída; modelo padrão `gemini-3.5-flash`, configurável por `GEMINI_MODEL` (os IDs de modelo do Gemini mudam com frequência; a API reportou `gemini-3.6-flash` como versão servida); erros transitórios 503/429/500/504 são repetidos até 3 vezes antes do fallback;
- sinais determinísticos (CE 3.0, pedidos de reembolso versus janela de reembolso, uso após a cobrança, logins de dispositivo conhecido e autenticação forte) são calculados no código e entregues ao modelo como fatos;
- a alegação do portador e os tickets de suporte vão em um bloco separado `<untrusted_customer_content>`, com `<` e `>` escapados, e o prompt manda tratar como dado e reportar texto que pareça instrução. O caso CG-1046 contém uma tentativa de injeção de prompt para testar isso;
- o motivo de parada é checado antes de ler a saída: prompt bloqueado e finalização por segurança contam como recusa, truncamento por limite de tokens gera erro, assim como saída ausente, que não seja JSON ou que não passe no schema;
- a saída passa por uma etapa de **fundamentação** (`ground.ts`): entradas da linha do tempo e citações precisam apontar para registros reais (os timestamps vêm do registro, não do modelo), as cláusulas precisam existir, os trechos destacados precisam ser citações literais, e um veredito "contestar" é revertido para "aceitar" quando a regra de culpa do comerciante dispara;
- qualquer falha, ou ausência de chave de API, cai para o dossiê baseado em regras, e a interface indica isso e o motivo.

### Dados de demonstração

Seis disputas abertas de um comerciante SaaS fictício, a Lumen Analytics, na data de 28/10/2026. Todas as pessoas, bancos e empresas são fictícios.

| Caso | Rede / código | Idioma do emissor | Veredito esperado |
| --- | --- | --- | --- |
| CG-1041 | Visa 10.4 | Alemão | Contestar: CE 3.0 elegível, login com MFA em dispositivo conhecido |
| CG-1042 | Visa 13.1 | Português (BR) | Contestar: uso intenso após a compra |
| CG-1043 | Mastercard 4837 | Japonês | Contestar: login com passkey em dispositivo registrado |
| CG-1044 | Mastercard 4853 | Francês | **Aceitar:** reembolso pedido 3 dias após a renovação e nunca respondido |
| CG-1045 | Visa 10.4 | Francês | Contestar com baixa confiança: CE 3.0 não atendido (só uma transação qualificada) |
| CG-1046 | Mastercard 4853 | Alemão | Contestar: sem cancelamento, reembolso pedido fora da janela; o ticket traz uma tentativa de injeção de prompt |

Os KPIs são calculados a partir do histórico de demonstração em `src/lib/demo/history.ts`.

### Estrutura de pastas

```
src/lib/domain/        Tipos e catálogo de códigos de motivo
src/lib/ce3/           Motor de auditoria Visa CE 3.0
src/lib/stripe/        Verificação de assinatura do webhook e normalização
src/lib/analysis/      Sinais, prompt, chamada ao Gemini, fundamentação, dossiê por regras, cartas
src/lib/demo/          Casos de demonstração, Termos de Serviço, histórico de KPIs
src/app/api/           Rotas: analyze e webhook da Stripe
src/app/dashboard/     Fila + KPIs e visão do caso
src/components/        Landing, dashboard e componentes ui
tests/                 Testes de CE 3.0, webhook, análise e métricas
```

### Como rodar

```bash
npm install
npm run dev          # http://localhost:3000 (landing); /dashboard para o app
npm test             # testes unitários
npm run typecheck    # next typegen + tsc
npm run lint
npm run build
```

Sem configuração, o app roda com dados de demonstração e dossiê por regras. Copie `.env.example` para `.env.local` para habilitar o resto:

| Variável | Para que serve |
| --- | --- |
| `GEMINI_API_KEY` | Habilita a análise com Gemini na rota de análise (a chave é criada no Google AI Studio). Sem ela, a rota devolve o dossiê por regras e informa o motivo. |
| `GEMINI_MODEL` | Sobrescreve o modelo. Padrão: `gemini-3.5-flash`. |
| `STRIPE_WEBHOOK_SECRET` | Segredo de assinatura do `POST /api/webhooks/stripe`. |

### Verificação mais recente

Conferido em 2026-10-30 no checkout local da branch: 45 de 45 testes passam; lint, `npm run typecheck` e `next build` passam; landing e `/dashboard` respondem 200. A rota de análise respondeu pelo caminho de regras (`source: rule-based`) por não haver chave de API.

---

## 8. O que é real e o que é simulado

**Real e testado:** auditoria CE 3.0, verificação de assinatura do webhook da Stripe, estrutura da análise com Gemini (interpretação da resposta, repetição de erros transitórios, fundamentação e fallback cobertos por testes; a requisição foi conferida com o SDK real contra um servidor local de teste, e a chamada ao Gemini de verdade foi feita à mão, ver abaixo).

**Simulado ou não construído:**
- **Sem banco de dados.** Webhooks verificados são normalizados e devolvidos (`persisted: false`), mas não armazenados nem criam casos no dashboard.
- **Sem conectores reais.** Auth0, PostHog, Zendesk e o histórico de cobranças da Stripe são representados por registros fixos nos casos de demonstração. Adyen e Braintree não estão implementados.
- **O envio é simulado.** Os botões de enviar ou aceitar só mostram um aviso; nenhuma API de processador é chamada.
- **A rota de análise não tem autenticação** e só aceita IDs de casos de demonstração. É preciso autenticação e escopo por comerciante antes de tocar dados reais.
- **A chamada real ao Gemini foi executada uma vez, à mão, em 2026-10-31**, nos seis casos de demonstração: o ID de modelo padrão e o schema foram aceitos, os vereditos bateram com a tabela da seção 7 (CG-1044 aceito; o texto de injeção plantado no CG-1046 foi sinalizado e ignorado) e nenhuma salvaguarda de fundamentação disparou. Essa execução não faz parte da suíte de testes, não foi repetida com outras chaves ou modelos nem com dados reais, e a qualidade das cartas não foi revisada por falantes nativos. O modelo às vezes responde 503 por alta demanda.
- **As cartas por regras são templates** em alemão, português (Brasil), japonês, francês e inglês, sem revisão por falantes nativos.
- Os resumos das regras de rede em `src/lib/domain/reason-codes.ts` são paráfrases, não os textos oficiais das redes.
- URLs de caso desconhecidas renderizam a página de não encontrado, mas com HTTP 200, porque o Cache Components transmite o shell da página.
- Os componentes de `src/components/ui` foram escritos à mão seguindo o código do shadcn (o registro não estava acessível no ambiente de build).

## 9. Histórico do projeto

1. A branch partiu de um scaffold de outro projeto (RefactorPulse, uma plataforma de modernização de código legado). Esse código continua na branch `claude/refactorpulse-mvp-b0gvxy`.
2. **Primeira versão do ChargeGuard** (commit `51359f8`): landing, dashboard com fila e visão do caso, motor CE 3.0, rota de análise com LLM (na época, Claude) e fallback, webhook da Stripe, 11 testes.
3. **Reconstrução do zero** (commit `3c78c94`), pedida pelo usuário e executada pelo Opus 5.5 em uma sessão separada: nova estrutura modular, fundamentação das saídas do modelo, defesa contra injeção de prompt, páginas por caso, 45 testes. Na reconstrução, a versão do Next.js subiu de 16.4.0 para 16.4.3, e a causa dessa mudança não foi confirmada.

4. **Troca do provedor de LLM para o Gemini** (2026-10-31): a API da Anthropic não pôde ser vinculada ao projeto. A camada de análise ficou independente de provedor (`DossierOutputSchema`, `source: "ai"`), o cliente passou a `src/lib/analysis/gemini.ts`, o SDK da Anthropic foi removido, os textos da interface e da landing passaram a dizer Gemini e os testes foram ampliados para 57. A chamada real foi testada nos seis casos; o prompt foi ajustado para as cartas não citarem IDs internos de evidência.

O histórico das versões está no git.

## 10. Próximos passos sugeridos

1. Transformar a execução manual com o Gemini em uma avaliação repetível (casos com veredito esperado) para detectar regressões ao trocar de modelo ou de prompt, e fazer a revisão das cartas por falantes nativos.
2. Persistência (por exemplo Postgres) para que um webhook gere um caso armazenado.
3. Conectores reais de Auth0, PostHog, Zendesk e Stripe, depois Adyen e Braintree.
4. Envio real pela API de disputas do processador, com revisão humana opcional antes do primeiro envio.
5. Autenticação e escopo por comerciante nas rotas.
6. Revisão das regras de CE 3.0 e dos códigos de motivo contra os textos oficiais da Visa e da Mastercard, e revisão das cartas por falantes nativos.
7. Revisão de código e teste visual da interface reconstruída.
