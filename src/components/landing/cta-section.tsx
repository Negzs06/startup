import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section id="enterprise" className="px-6 py-24">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-10 text-center sm:p-16">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Pronto para modernizar seu próximo monolito?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Conecte um repositório, escolha o stack de destino e veja os agentes trabalharem
          em tempo real — do mapeamento ao Pull Request.
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            className="gap-2"
            nativeButton={false}
            render={
              <Link href="/dashboard">
                Abrir Workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
