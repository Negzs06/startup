# RefactorPulse

MVP de uma plataforma SaaS B2B de modernização autônoma de código legado,
construída com Next.js (App Router), TypeScript, Tailwind CSS e shadcn/UI.

O produto analisa repositórios legados, gera testes de caracterização,
refatora o código com agentes de IA (Claude) em um loop de self-healing e
abre um Pull Request limpo com relatório de auditoria arquitetural.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) para a landing page, ou
[http://localhost:3000/dashboard](http://localhost:3000/dashboard) para o
workspace de migração.

## Estrutura do projeto

```
src/
  app/
    page.tsx                 # Landing page B2B
    dashboard/page.tsx        # Workspace (orquestra os 4 steps)
  components/
    landing/                  # Seções da landing page
    dashboard/                 # Step 1-4, pipeline de agentes, terminal, diff viewer
    ui/                        # Componentes shadcn/UI
  hooks/
    use-agent-simulation.ts   # Simula o stream de logs dos agentes (SSE-like)
  lib/
    types.ts                  # Tipos de domínio
    mock-data.ts               # Dados de demonstração (alvo de migração, logs, diffs, auditoria)
    diff.ts                    # Diff de linhas (LCS) para o visualizador side-by-side
```

## Fluxo do Dashboard

1. **Fonte** — conectar repositório via GitHub (mock) ou enviar um ZIP.
2. **Configuração** — escolher o stack de destino da migração.
3. **Execução** — acompanhar em tempo real os agentes (mapeamento de AST,
   testes de caracterização, refatoração e o loop de self-healing).
4. **Resultados** — visualizador de diff lado a lado e relatório de
   auditoria arquitetural, com link para o Pull Request.

> Os dados de execução (logs, diffs, relatório) são mockados em
> `src/lib/mock-data.ts` para fins de demonstração. A integração real com o
> Anthropic SDK, GitHub API e a sandbox de testes fica no backend
> (API Routes / Server Actions), consumindo o mesmo contrato de tipos
> definido em `src/lib/types.ts`.
