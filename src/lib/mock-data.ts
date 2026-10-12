import type {
  AgentId,
  AgentLogLine,
  AgentStepDefinition,
  AuditReport,
  DiffFile,
  MigrationTarget,
} from "@/lib/types";

export const MIGRATION_TARGETS: MigrationTarget[] = [
  {
    id: "js-to-ts-strict",
    label: "JavaScript Legado → TypeScript Estrito",
    from: "JavaScript (ES5/CommonJS)",
    to: "TypeScript 5 (strict mode)",
    description:
      "Infere tipos a partir do uso real, elimina `any` implícito e isola módulos com contratos explícitos.",
  },
  {
    id: "java8-to-java21-spring",
    label: "Java 8 → Java 21 + Spring Boot",
    from: "Java 8 (EJB / Servlets)",
    to: "Java 21 + Spring Boot 3",
    description:
      "Migra para records, virtual threads e injeção de dependência moderna, preservando contratos de API.",
  },
  {
    id: "py2-to-py312",
    label: "Python 2 / Legado → Python 3.12",
    from: "Python 2.7",
    to: "Python 3.12",
    description:
      "Atualiza sintaxe, tipagem gradual com type hints e substitui bibliotecas descontinuadas.",
  },
];

export const AGENT_STEPS: AgentStepDefinition[] = [
  {
    id: "mapper",
    icon: "search",
    title: "Mapeamento de AST",
    subtitle: "Grafo de dependências do repositório",
  },
  {
    id: "tester",
    icon: "flask",
    title: "Testes de Caracterização",
    subtitle: "Travando o comportamento original",
  },
  {
    id: "refactor",
    icon: "zap",
    title: "Refatoração",
    subtitle: "Aplicando padrões modernos",
  },
  {
    id: "healer",
    icon: "refresh",
    title: "Self-Healing Loop",
    subtitle: "Executando e corrigindo testes",
  },
  {
    id: "done",
    icon: "rocket",
    title: "Pull Request",
    subtitle: "Entrega finalizada",
  },
];

let logIdCounter = 0;
function log(agentId: AgentId, level: AgentLogLine["level"], message: string): AgentLogLine {
  logIdCounter += 1;
  return {
    id: `log-${logIdCounter}`,
    agentId,
    level,
    message,
    timestamp: new Date(Date.now() + logIdCounter * 1200).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

export const AGENT_LOG_SCRIPT: AgentLogLine[] = [
  log("mapper", "command", "$ refactor-pulse scan ./legacy-billing-service"),
  log("mapper", "info", "Clonando repositório via GitHub App… 412 arquivos encontrados."),
  log("mapper", "info", "Construindo AST para 412 arquivos (.js, .jsx)."),
  log("mapper", "info", "Resolvendo grafo de dependências entre módulos internos."),
  log("mapper", "warning", "3 ciclos de dependência circular detectados em /services/invoice."),
  log("mapper", "success", "Mapeamento completo: 28 módulos, 7 pontos de entrada públicos."),

  log("tester", "command", "$ claude agent run --tool generate_characterization_tests"),
  log("tester", "info", "Analisando comportamento observável de InvoiceCalculator.js…"),
  log("tester", "info", "Gerando casos de teste a partir de 184 chamadas registradas em produção."),
  log("tester", "success", "62 testes de caracterização gerados para /services/invoice."),
  log("tester", "info", "Gerando testes para /services/billing/TaxEngine.js…"),
  log("tester", "success", "41 testes de caracterização gerados para TaxEngine."),
  log("tester", "success", "Suíte completa: 187 testes • cobertura estimada 94%."),

  log("refactor", "command", "$ claude agent run --tool refactor_module"),
  log("refactor", "info", "Isolando InvoiceCalculator em módulo puro sem efeitos colaterais."),
  log("refactor", "info", "Convertendo callbacks aninhados para async/await tipado."),
  log("refactor", "info", "Extraindo TaxEngine.js → tax-engine/ (strict types, zero `any`)."),
  log("refactor", "success", "14 arquivos refatorados • 3 módulos novos isolados."),

  log("healer", "command", "$ run_test_suite --target ./dist"),
  log("healer", "info", "Compilando TypeScript estrito…"),
  log("healer", "error", "TS2345: Argument of type 'string' is not assignable to parameter of type 'number' em tax-engine/index.ts:42."),
  log("healer", "warning", "Iteração de correção 1/3: enviando log de erro ao Claude Sonnet…"),
  log("healer", "info", "Aplicando correção: normalização de entrada numérica em parseRate()."),
  log("healer", "info", "Recompilando e reexecutando suíte de 187 testes…"),
  log("healer", "error", "2 testes falharam: arredondamento de ponto flutuante em calculateTax()."),
  log("healer", "warning", "Iteração de correção 2/3: ajustando precisão decimal com Big.js…"),
  log("healer", "success", "187/187 testes passaram • build limpo • 0 regressões."),

  log("done", "command", "$ create_github_pr --branch refactor/invoice-service-ts"),
  log("done", "info", "Gerando relatório de auditoria arquitetural em Markdown…"),
  log("done", "success", "Pull Request #482 aberto em negzs06/legacy-billing-service."),
  log("done", "success", "✅ Modernização concluída com 0% de regressão detectada."),
];

export const DIFF_FILES: DiffFile[] = [
  {
    path: "services/invoice/InvoiceCalculator.js → .ts",
    language: "typescript",
    linesAdded: 48,
    linesRemoved: 31,
    oldCode: `function calculateInvoice(items, taxRate, discount) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total += items[i].price * items[i].qty;
  }
  if (discount) {
    total = total - (total * discount);
  }
  var tax = total * taxRate;
  return total + tax;
}

module.exports = { calculateInvoice };`,
    newCode: `interface InvoiceItem {
  price: number;
  qty: number;
}

export function calculateInvoice(
  items: InvoiceItem[],
  taxRate: number,
  discount = 0,
): number {
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.qty,
    0,
  );

  const discounted = subtotal * (1 - discount);
  const tax = discounted * taxRate;

  return Number((discounted + tax).toFixed(2));
}`,
    hunks: [
      { type: "removed", oldLine: 1, content: "function calculateInvoice(items, taxRate, discount) {" },
      { type: "removed", oldLine: 2, content: "  var total = 0;" },
      { type: "removed", oldLine: 3, content: "  for (var i = 0; i < items.length; i++) {" },
      { type: "removed", oldLine: 4, content: "    total += items[i].price * items[i].qty;" },
      { type: "removed", oldLine: 5, content: "  }" },
      { type: "added", newLine: 1, content: "interface InvoiceItem {" },
      { type: "added", newLine: 2, content: "  price: number;" },
      { type: "added", newLine: 3, content: "  qty: number;" },
      { type: "added", newLine: 4, content: "}" },
      { type: "added", newLine: 5, content: "" },
      { type: "added", newLine: 6, content: "export function calculateInvoice(" },
      { type: "added", newLine: 7, content: "  items: InvoiceItem[]," },
      { type: "added", newLine: 8, content: "  taxRate: number," },
      { type: "added", newLine: 9, content: "  discount = 0," },
      { type: "added", newLine: 10, content: "): number {" },
      { type: "context", oldLine: 6, newLine: 11, content: "  ..." },
      { type: "removed", oldLine: 9, content: "  var tax = total * taxRate;" },
      { type: "added", newLine: 15, content: "  const tax = discounted * taxRate;" },
    ],
  },
  {
    path: "services/billing/TaxEngine.js → tax-engine/index.ts",
    language: "typescript",
    linesAdded: 63,
    linesRemoved: 22,
    oldCode: `var Big = require('big.js');

function parseRate(rate) {
  return rate.replace('%', '') / 100;
}

exports.applyTax = function(amount, rate) {
  var r = parseRate(rate);
  return amount + (amount * r);
};`,
    newCode: `import Big from "big.js";

export function parseRate(rate: string | number): number {
  const normalized =
    typeof rate === "string" ? rate.replace("%", "") : rate.toString();
  return Number(normalized) / 100;
}

export function applyTax(amount: number, rate: string | number): number {
  const r = new Big(parseRate(rate));
  const base = new Big(amount);
  return base.plus(base.times(r)).toNumber();
}`,
    hunks: [
      { type: "removed", oldLine: 1, content: "var Big = require('big.js');" },
      { type: "added", newLine: 1, content: "import Big from \"big.js\";" },
      { type: "context", oldLine: 2, newLine: 2, content: "" },
      { type: "removed", oldLine: 3, content: "function parseRate(rate) {" },
      { type: "removed", oldLine: 4, content: "  return rate.replace('%', '') / 100;" },
      { type: "added", newLine: 3, content: "export function parseRate(rate: string | number): number {" },
      { type: "added", newLine: 4, content: "  const normalized =" },
      { type: "added", newLine: 5, content: "    typeof rate === \"string\" ? rate.replace(\"%\", \"\") : rate.toString();" },
      { type: "added", newLine: 6, content: "  return Number(normalized) / 100;" },
    ],
  },
];

export const AUDIT_REPORT: AuditReport = {
  summaryMarkdown:
    "O serviço `legacy-billing-service` foi modernizado de JavaScript ES5 para TypeScript estrito. A refatoração isolou 3 módulos com efeitos colaterais, removeu mutação de estado global em `InvoiceCalculator` e introduziu tipagem de ponta a ponta nas rotas de faturamento.",
  decisions: [
    {
      kind: "architecture",
      title: "Extração de TaxEngine como módulo puro",
      detail:
        "A lógica de cálculo de impostos estava acoplada ao controller HTTP. Foi extraída para `tax-engine/`, sem I/O e com funções determinísticas, permitindo teste unitário isolado.",
    },
    {
      kind: "safety",
      title: "Precisão decimal com Big.js",
      detail:
        "Operações de ponto flutuante nativo causavam diferenças de arredondamento em centavos. O agente de self-healing introduziu Big.js após detectar falhas nos testes de caracterização.",
    },
    {
      kind: "dependency",
      title: "Remoção de lodash para operações simples",
      detail:
        "`_.reduce` e `_.get` foram substituídos por equivalentes nativos tipados, reduzindo o bundle em 12kb sem alterar comportamento.",
    },
    {
      kind: "test",
      title: "187 testes de caracterização como rede de segurança",
      detail:
        "Gerados a partir de chamadas reais observadas em produção antes da refatoração, garantindo que o comportamento externo permaneça idêntico.",
    },
  ],
  testsAdded: 187,
  coveragePercent: 94,
  dependenciesRemoved: ["lodash", "moment"],
  dependenciesAdded: ["big.js"],
  pullRequestUrl: "https://github.com/negzs06/legacy-billing-service/pull/482",
  pullRequestNumber: 482,
};
