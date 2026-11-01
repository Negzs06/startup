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
- Landing page em inglês, "a sala de evidências": cena 3D de objetos físicos guiada pela rolagem, explicador interativo de CE 3.0, veredito, envio, por que Gemini, metas, preços e chamada para o dashboard (detalhes abaixo).
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

### Avaliação repetível da análise com o modelo

`npm run eval` (`evals/`) roda a análise real nos seis casos de demonstração, várias vezes cada, e avalia cada resultado com verificações determinísticas, sem um segundo modelo como juiz: veredito, faixa de confiança, notas de fundamentação, coerência com a auditoria CE 3.0 calculada em código, idioma das cartas, ausência de IDs internos e timestamps ISO crus nas cartas, identificação do caso nas cartas, coerência da carta com o veredito, presença da cobrança na linha do tempo e sinalização do texto de injeção plantado. As expectativas (`evals/cases.ts`) são julgamentos sobre os casos, não saídas do modelo.

- Os limites mínimos valem **por caso**, para que uma média não esconda um caso que sempre falha.
- Tentativas que caem no dossiê por regras (limite de taxa, erro 5xx, recusa) são contadas à parte e não como resultado do modelo; uma execução com mais de 25% delas, ou interrompida, reprova.
- `--baseline` compara com um resumo salvo e reprova se alguma verificação cair mais de 10 pontos; `--update-baseline` grava `evals/baseline.json` só a partir de uma execução sem falhas. **Ainda não há linha de base commitada**, e a gravação da linha de base não foi exercitada contra a API real.
- Custo: casos x repetições requisições (12 por padrão). No plano gratuito da chave usada, o limite foi de 20 requisições por dia **por modelo**; a execução para sozinha quando a cota diária acaba.
- Os avaliadores têm testes offline (`tests/evals.test.ts`): aceitam os dossiês de referência por regras e rejeitam dossiês deliberadamente defeituosos.

**Primeiras execuções (2026-10-31), com a chave gratuita:**

| Modelo | Tentativas avaliadas | Resultado |
| --- | --- | --- |
| `gemini-3.5-flash` (padrão) | 3 de 18 | A cota diária acabou durante a execução; só o CG-1041 foi avaliado (passou em tudo). Não vale como avaliação do modelo padrão |
| `gemini-3-flash-preview` | 12 + 4 | Reprovou duas verificações: cartas sem identificação do caso (corrigido com o prompt) e citações de cláusulas dos Termos removidas pela fundamentação (corrigido na regra, ver abaixo) |
| `gemini-3.1-flash-lite` | 12 de 12 | Com a regra final por caso: **reprovado**, confiança *alta* nas duas tentativas do CG-1045 (caso sem CE 3.0, esperado baixa ou média). O resto passou |

Mudanças feitas por causa dessas execuções: o prompt passou a exigir ID da disputa, ID da transação e valor na carta; a fundamentação passou a aceitar IDs de cláusulas dos Termos nas citações dos requisitos (são registros reais; a linha do tempo continua exigindo evidências com data) e a nota de fundamentação passou a listar quais citações foram removidas. O prompt e a regra foram ajustados com os mesmos seis casos que os avaliam, então não há avaliação independente dessas duas mudanças.

### Servidor MCP de geração de imagens (Microsoft Foundry)

`tools/foundry-image-mcp/` é um servidor MCP (stdio) que permite a um cliente MCP, como o Claude Code, gerar imagens com um modelo de imagem da OpenAI implantado no Microsoft Foundry. Ele é independente do app do ChargeGuard e só divide o repositório; pode ir para um repositório próprio. Ferramenta: `generate_image` (prompt, n de 1 a 4, size, quality, output_format, background). Configuração por variáveis de ambiente (`FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY`, `FOUNDRY_IMAGE_DEPLOYMENT`, opcionalmente `FOUNDRY_API_VERSION`); o `.mcp.json` da raiz registra o servidor, e ele só aparece a partir de uma sessão nova.

- **Verificado contra um stand-in local:** por MCP stdio de verdade (rotas, cabeçalhos, corpo, decodificação e gravação das imagens, mapeamento de erros, validação de argumentos, ausência de configuração).
- **Verificado uma vez contra o Foundry real (2026-11-01):** com o deployment `gpt-image-2.5-sunburst`, a rota `/openai/v1/images/generations`, `size: "1024x1024"` e `quality: "low"`, o servidor devolveu um PNG 1024x1024 (cerca de 320 KB) em 12 segundos, e a imagem correspondia ao prompt. É uma chamada, em um deployment, no host `*.services.ai.azure.com`.
- **Não verificado:** a rota versionada com `api-version`, `n` maior que 1, `output_format` diferente de png, `background`, outros valores de `size` e `quality`, outros deployments, e os mapeamentos de erro contra corpos de erro reais do Foundry.
- **Limites:** só gera imagens (sem edição), só autenticação por chave (sem Microsoft Entra) e é stdio: roda onde o cliente o inicia, não é um serviço de rede. Em sessões na nuvem, o ambiente precisa ter as variáveis e liberar o host do Foundry na política de rede. As dependências do servidor são instaladas por um launcher `sh` no `.mcp.json` na primeira partida (3 s, medido num clone limpo), então não é preciso Setup script. Isso foi necessário depois que uma sessão nova falhou ao conectar o servidor por falta de `node_modules`.

### Landing page (v2, 2026-11-01)

A primeira versão (partículas azul-marinho e verde-azulado) foi rejeitada por parecer uma landing genérica de IA. A v2, "a sala de evidências" (`docs/landing-concept.md`), é clara e física: papel, tinta preta e um vermelhão de carimbo para a ameaça; um verde de livro-razão só onde algo foi verificado.

- **Como funciona:** a página continua estática (Server Component pré-renderizado). A cena 3D (`src/components/landing/scene/`) usa `three` puro, carregado por `import()` dinâmico no ócio: folhas, recibos e etiquetas com os registros do caso CG-1041 desenhados em código, envelope de papel glassine, pasta manila com capa articulada e um sinete de latão; materiais físicos com as texturas geradas, luz principal e de recorte, `RoomEnvironment` (sem HDRI baixado) e sombras. A câmera percorre sete estados ligados à rolagem (disputa, webhook, registros, CE 3.0, dossiê, veredito, arquivado); a marca do sinete aparece com um shader de tinta que penetra nas fibras. A rolagem usa GSAP (ScrollTrigger e SplitText, licença "Standard 'no charge'") ligado ao Lenis: a palavra gigante do topo dá zoom na haste do "I" até virar a sala vermelha, o pipeline fica fixo com a câmera, um formulário de progresso e um contador; a sala do CE 3.0 abre como porta e fica presa enquanto o veredito desliza por cima. O explicador de CE 3.0 roda `src/lib/ce3/audit.ts` no navegador com os casos CG-1041 e CG-1045. O botão principal recebe um carimbo e uma cortina vermelha antes de ir para `/dashboard`. Fontes: Archivo (largura variável) e Courier Prime. Os estilos ficam em `.landing` e `html[data-landing]`; o dashboard ficou idêntico pixel a pixel (claro e escuro, também após navegar a partir da landing).
- **Alternativas:** nada começa escondido no HTML do servidor. Com `prefers-reduced-motion`, nem GSAP, nem Lenis, nem a cena carregam, e a página vira uma composição estática com as fotos geradas (o explicador continua funcionando). Sem WebGL, com WebGL por software (SwiftShader/llvmpipe; `?webgl=force` força a cena para teste) ou se o chunk falhar, as mesmas fotos substituem a cena. Links internos mantêm o hash e o foco; rolagem por teclado e busca da página funcionam.
- **Imagens:** 11 geradas nesta rodada pela ferramenta MCP `foundry-image` (4 em qualidade baixa, 2 média, 5 alta), escritas como briefings de estúdio; 8 arquivos publicados (fotos, recortes com fundo transparente, texturas e a imagem de Open Graph). As imagens da v1 foram apagadas. Prompts e contagem em `public/images/landing/README.md`.
- **Medido** (build de produção, Chromium local, 1440×900): JS inicial de `/` com 151,5 KB transferidos (v1: 146,5 KB; página original: 139,6 KB); 210 KB depois do ócio com GSAP e Lenis; 356 KB quando a cena 3D carrega. CLS 0,004. Sem a cena, 60 fps rolando a página toda e nenhuma tarefa longa. A cena só rodou com SwiftShader (sem GPU no ambiente), onde desenha corretamente a 3–12 fps; prova numérica de que a cena muda com a rolagem: 8 capturas do canvas, todas com hash diferente e 15% a 45% dos pixels alterados entre posições vizinhas.
- **Corrigido na verificação:** um placeholder de imagem com desfoque em tela cheia causava uma tarefa longa de ~600 ms; âncoras para a sala presa caíam no lugar errado; etiquetas do CE 3.0 ficavam fora da ordem de tabulação antes de animar; a cortina do botão e o fundo da landing continuavam no dashboard porque o Next mantém a rota anterior montada (oculta) depois da navegação.
- **Não verificado:** GPU real e aparelhos reais, Safari, Firefox e uma execução real do Lighthouse.
- **Honestidade do conteúdo:** sem logos, depoimentos ou métricas ao vivo; metas marcadas como metas, números do setor como estimativas, envio como simulado, casos como fictícios.

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
src/components/        Landing (salas, cena 3D, coreografia de rolagem, explicador de CE 3.0), dashboard e componentes ui
docs/                  Conceito e capturas de tela da landing page
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

Conferido em 2026-11-01 no checkout local da branch, depois da nova landing: 109 de 109 testes passam; lint, `npm run typecheck` e `next build` passam (`/` continua estática). A análise com o Gemini foi exercitada à mão e pela avaliação, ver a seção 8 e a avaliação acima.

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
5. **Avaliação repetível** (2026-10-31): `npm run eval`, com avaliadores determinísticos, limites por caso e comparação com linha de base. Detalhes e primeiras execuções na seção 7.
6. **Servidor MCP de geração de imagens com o Microsoft Foundry** (2026-11-01): `tools/foundry-image-mcp/`, ver a seção 7.
7. **Nova landing page** (2026-11-01): cena 3D guiada pela rolagem e imagens geradas pelo Foundry, ver a seção 7.
8. **Landing v2, "a sala de evidências"** (2026-11-01): direção física e clara no lugar das partículas, cena 3D com objetos reais, GSAP e explicador de CE 3.0, ver a seção 7.

O histórico das versões está no git.

## 10. Próximos passos sugeridos

1. Quando a cota diária do modelo padrão voltar (ou com uma chave paga), rodar `npm run eval` no `gemini-3.5-flash`, corrigir o que reprovar (o `gemini-3.1-flash-lite` superestimou a confiança no CG-1045) e só então gravar a linha de base. Depois, revisar as cartas com falantes nativos.
2. Persistência (por exemplo Postgres) para que um webhook gere um caso armazenado.
3. Conectores reais de Auth0, PostHog, Zendesk e Stripe, depois Adyen e Braintree.
4. Envio real pela API de disputas do processador, com revisão humana opcional antes do primeiro envio.
5. Autenticação e escopo por comerciante nas rotas.
6. Revisão das regras de CE 3.0 e dos códigos de motivo contra os textos oficiais da Visa e da Mastercard, e revisão das cartas por falantes nativos.
7. Revisão de código e teste visual da interface reconstruída.
8. Testar a landing em GPUs e aparelhos reais, no Safari e no Firefox, e rodar o Lighthouse.
