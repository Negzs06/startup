"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, GitBranch, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RepoSource } from "@/lib/types";
import { cn } from "@/lib/utils";

const MOCK_REPOS = [
  { name: "negzs06/legacy-billing-service", branch: "main", fileCount: 412 },
  { name: "negzs06/inventory-monolith", branch: "main", fileCount: 918 },
  { name: "negzs06/customer-portal-py2", branch: "legacy", fileCount: 276 },
];

export function Step1Source({
  onContinue,
}: {
  onContinue: (source: RepoSource) => void;
}) {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const canContinueGithub = isConnected && selectedRepo !== null;
  const canContinueUpload = uploadedFile !== null;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Conecte seu código legado</CardTitle>
        <CardDescription>
          Escolha um repositório via GitHub ou envie um arquivo ZIP com o código-fonte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="github">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="github" className="gap-2">
              <GitBranch className="h-4 w-4" />
              GitHub
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <UploadCloud className="h-4 w-4" />
              Upload ZIP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="github" className="mt-6 space-y-4">
            {!isConnected ? (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-10 text-center">
                <GitBranch className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Autorize o acesso ao GitHub</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Usamos uma GitHub App com permissão de leitura e abertura de PRs.
                  </p>
                </div>
                <Button onClick={() => setIsConnected(true)} className="gap-2">
                  <GitBranch className="h-4 w-4" />
                  Conectar com GitHub
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Conectado como <span className="font-medium">negzs06</span>
                </div>
                <div className="space-y-2">
                  {MOCK_REPOS.map((repo) => (
                    <button
                      key={repo.name}
                      onClick={() => setSelectedRepo(repo.name)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                        selectedRepo === repo.name
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <div>
                        <p className="font-medium">{repo.name}</p>
                        <p className="text-xs text-muted-foreground">
                          branch: {repo.branch} • {repo.fileCount} arquivos
                        </p>
                      </div>
                      {selectedRepo === repo.name && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                disabled={!canContinueGithub}
                className="gap-2"
                onClick={() =>
                  selectedRepo &&
                  onContinue({
                    mode: "github",
                    name: selectedRepo,
                    branch: MOCK_REPOS.find((r) => r.name === selectedRepo)?.branch,
                    fileCount: MOCK_REPOS.find((r) => r.name === selectedRepo)?.fileCount,
                  })
                }
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-6 space-y-4">
            <label
              htmlFor="zip-upload"
              className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed border-border py-10 text-center transition-colors hover:bg-muted/40"
            >
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              {uploadedFile ? (
                <div>
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(1)} KB • pronto para análise
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Arraste um arquivo .zip ou clique para selecionar</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tamanho máximo recomendado: 200MB
                  </p>
                </div>
              )}
              <input
                id="zip-upload"
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex justify-end pt-2">
              <Button
                disabled={!canContinueUpload}
                className="gap-2"
                onClick={() =>
                  uploadedFile &&
                  onContinue({ mode: "upload", name: uploadedFile.name })
                }
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
