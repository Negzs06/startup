"use client";

import { Languages } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Dossier } from "@/lib/analysis/schema";
import { LANGUAGE_NAMES } from "@/lib/format";

export function CoverLetterCard({ letter, templated }: { letter: Dossier["coverLetter"]; templated: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="size-4 text-primary" aria-hidden /> Cover letter
        </CardTitle>
        <CardDescription>
          {templated
            ? "Rule-based template. Have a fluent reviewer check wording before relying on it."
            : "Written by Gemini for the issuing bank, with an English version for your records."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="localized">
          <TabsList>
            <TabsTrigger value="localized">{LANGUAGE_NAMES[letter.language] ?? letter.language} (issuer)</TabsTrigger>
            <TabsTrigger value="english">English</TabsTrigger>
          </TabsList>
          <TabsContent value="localized">
            <pre lang={letter.language} className="rounded-lg border bg-muted/40 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {letter.localized}
            </pre>
          </TabsContent>
          <TabsContent value="english">
            <pre lang="en" className="rounded-lg border bg-muted/40 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {letter.english}
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
