import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AiStatus, UpdateAiSettings } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { InlineAlert, PageTitle } from "@/components/ui/app-kit";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { env } from "../lib/env";
import { useAppStore } from "../lib/store";

export function Settings() {
  const queryClient = useQueryClient();
  const projectId = useAppStore((state) => state.projectId);
  const [enabled, setEnabled] = useState(true);
  const [apiBase, setApiBase] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const aiStatus = useQuery({
    queryKey: ["ai-status", projectId],
    queryFn: () => api.get<AiStatus>(`/ai/status${projectId ? `?projectId=${projectId}` : ""}`)
  });

  useEffect(() => {
    if (!aiStatus.data) return;
    setEnabled(aiStatus.data.enabled);
    setApiBase(aiStatus.data.apiBase);
    setModel(aiStatus.data.model ?? "gpt-4o-mini");
    setApiKey("");
  }, [aiStatus.data]);

  const saveAiSettings = useMutation({
    mutationFn: () =>
      api.put<AiStatus>("/ai/settings", {
        enabled,
        projectId: projectId ?? undefined,
        apiBase,
        model,
        apiKey: apiKey.trim() || undefined
      } satisfies UpdateAiSettings),
    onSuccess: () => {
      toast.success("AI provider settings saved");
      setApiKey("");
      void queryClient.invalidateQueries({ queryKey: ["ai-status", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });

  return (
    <div className="page">
      <PageTitle
        title="Settings"
        description="Runtime configuration for local development and external AI providers."
        action={
          <Button variant="outline" onClick={() => void supabase.auth.signOut()}>
            Sign out
          </Button>
        }
      />
      <Card>
        <CardContent className="flex flex-col gap-6">
          {aiStatus.data && !aiStatus.data.configured && (
            <InlineAlert>AI API key is not configured. IntelliSight will use rule-based fallback recommendations.</InlineAlert>
          )}
          <div className="settings-grid">
            <SettingItem label="API base URL" value={env.apiBaseUrl} />
            <SettingItem label="Supabase URL" value={env.supabaseUrl ? "Configured" : "Missing"} />
            <SettingItem label="Supabase anon key" value={env.supabaseAnonKey ? "Configured" : "Missing"} />
            <SettingItem label="AI enabled" value={aiStatus.data?.enabled ? "Yes" : "No"} />
            <SettingItem label="AI provider" value={aiStatus.data?.provider ?? "Loading"} />
            <SettingItem label="AI endpoint" value={aiStatus.data?.apiBase ?? "Loading"} />
            <SettingItem label="AI model" value={aiStatus.data?.model ?? "Fallback rules"} />
            <SettingItem label="AI API key" value={aiStatus.data?.apiKeyConfigured ? "Configured" : "Missing"} />
            <SettingItem label="AI config source" value={aiStatus.data?.source ?? "Loading"} />
          </div>
          <Card className="settings-section">
            <CardHeader>
              <CardTitle>AI Provider</CardTitle>
              <CardDescription>Use any OpenAI-compatible chat completions endpoint. When a project is selected, settings are saved for that project on the server.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <FieldGroup>
                <Field orientation="horizontal">
                  <FieldLabel>Enabled</FieldLabel>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ai-endpoint">Endpoint</FieldLabel>
                  <Input id="ai-endpoint" value={apiBase} onChange={(event) => setApiBase(event.target.value)} placeholder="https://api.openai.com/v1" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ai-model">Model</FieldLabel>
                  <Input id="ai-model" value={model} onChange={(event) => setModel(event.target.value)} placeholder="gpt-4o-mini / deepseek-chat / qwen-plus" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="ai-key">{aiStatus.data?.apiKeyConfigured ? "API key (leave blank to keep current key)" : "API key"}</FieldLabel>
                  <Input id="ai-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={aiStatus.data?.apiKeyConfigured ? "Already configured" : "sk-..."} />
                </Field>
              </FieldGroup>
              <Button disabled={saveAiSettings.isPending} onClick={() => saveAiSettings.mutate()}>
                Save AI provider
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="setting-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
