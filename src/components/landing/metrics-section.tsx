import { CheckCircle2, Lock, ShieldCheck, TestTube2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const METRICS = [
  {
    icon: ShieldCheck,
    value: "0%",
    label: "Regressão garantida",
    description: "Testes de caracterização bloqueiam qualquer mudança de comportamento.",
  },
  {
    icon: TestTube2,
    value: "94%+",
    label: "Cobertura média gerada",
    description: "Suítes geradas automaticamente a partir do comportamento real observado.",
  },
  {
    icon: CheckCircle2,
    value: "3x",
    label: "Ciclos de auto-correção",
    description: "O loop de self-healing corrige falhas de build e assert antes da entrega.",
  },
  {
    icon: Lock,
    value: "SOC2-ready",
    label: "Execução isolada",
    description: "Todo código roda em sandboxes efêmeras, sem persistência de dados sensíveis.",
  },
];

export function MetricsSection() {
  return (
    <section id="seguranca" className="border-t border-border/60 bg-muted/30 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Segurança não é um recurso. É a base do produto.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Equipes de engenharia enterprise não arriscam código de produção. Por isso toda
            refatoração é validada contra uma rede de testes antes de chegar ao PR.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((metric) => (
            <Card key={metric.label} className="border-border/60 text-center">
              <CardContent className="flex flex-col items-center pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <metric.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight">{metric.value}</p>
                <p className="mt-1 text-sm font-medium">{metric.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{metric.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
