import { FlaskConical, GitPullRequest, RefreshCw, Search, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const FLOW_STEPS = [
  {
    icon: Search,
    title: "1. Mapeamento",
    description:
      "Agentes analisam a AST e o grafo de dependências do repositório legado em minutos.",
  },
  {
    icon: FlaskConical,
    title: "2. Testes de Caracterização",
    description:
      "O Claude gera uma suíte de testes que trava o comportamento atual antes de qualquer mudança.",
  },
  {
    icon: Zap,
    title: "3. Refatoração",
    description:
      "Código é reescrito em módulos isolados, aplicando os padrões modernos do stack de destino.",
  },
  {
    icon: RefreshCw,
    title: "4. Self-Healing Loop",
    description:
      "Testes são executados; falhas de compilação ou assert voltam ao Claude até passarem (máx. 3 ciclos).",
  },
  {
    icon: GitPullRequest,
    title: "5. Pull Request",
    description:
      "Um PR limpo é aberto no GitHub com relatório de auditoria arquitetural completo.",
  },
];

export function FlowSection() {
  return (
    <section id="fluxo" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Um pipeline de agentes, do código legado ao Pull Request
          </h2>
          <p className="mt-4 text-muted-foreground">
            Cada etapa é executada por um agente especializado com ferramentas próprias,
            visível em tempo real no seu workspace.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FLOW_STEPS.map((step, i) => (
            <Card key={step.title} className="relative overflow-hidden border-border/60">
              <CardContent className="pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-medium">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
              {i < FLOW_STEPS.length - 1 && (
                <div className="absolute top-1/2 right-0 hidden h-px w-4 translate-x-full bg-border lg:block" />
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
