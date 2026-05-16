import { Alert, Button, Card, Descriptions, Form, Input, Message, Space, Switch, Typography } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { AiStatus, UpdateAiSettings } from "@intellisight/shared";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { env } from "../lib/env";

export function Settings() {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(true);
  const [apiBase, setApiBase] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const aiStatus = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => api.get<AiStatus>("/ai/status")
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
        apiBase,
        model,
        apiKey: apiKey.trim() || undefined
      } satisfies UpdateAiSettings),
    onSuccess: () => {
      Message.success("AI provider settings saved");
      setApiKey("");
      void queryClient.invalidateQueries({ queryKey: ["ai-status"] });
    },
    onError: (error) => Message.error(error.message)
  });

  return (
    <div className="page">
      <Typography.Title heading={3}>Settings</Typography.Title>
      <Card bordered={false}>
        <Space direction="vertical" className="full-width-space">
          {aiStatus.data && !aiStatus.data.configured && (
            <Alert type="warning" content="AI API key is not configured. IntelliSight will use rule-based fallback recommendations." />
          )}
          <Descriptions
            column={1}
            data={[
              { label: "API base URL", value: env.apiBaseUrl },
              { label: "Supabase URL", value: env.supabaseUrl ? "Configured" : "Missing" },
              { label: "Supabase anon key", value: env.supabaseAnonKey ? "Configured" : "Missing" },
              { label: "AI enabled", value: aiStatus.data?.enabled ? "Yes" : "No" },
              { label: "AI provider", value: aiStatus.data?.provider ?? "Loading" },
              { label: "AI endpoint", value: aiStatus.data?.apiBase ?? "Loading" },
              { label: "AI model", value: aiStatus.data?.model ?? "Fallback rules" },
              { label: "AI API key", value: aiStatus.data?.apiKeyConfigured ? "Configured" : "Missing" },
              { label: "AI config source", value: aiStatus.data?.source ?? "Loading" }
            ]}
          />
          <Card bordered className="settings-section">
            <Space direction="vertical" className="full-width-space" size={16}>
              <div>
                <Typography.Title heading={4}>AI Provider</Typography.Title>
                <Typography.Text type="secondary">
                  Use any OpenAI-compatible chat completions endpoint. The API key is sent to the Fastify server and kept only in server memory.
                </Typography.Text>
              </div>
              <Form layout="vertical">
                <Form.Item label="Enabled">
                  <Switch checked={enabled} onChange={setEnabled} />
                </Form.Item>
                <Form.Item label="Endpoint">
                  <Input value={apiBase} onChange={setApiBase} placeholder="https://api.openai.com/v1" />
                </Form.Item>
                <Form.Item label="Model">
                  <Input value={model} onChange={setModel} placeholder="gpt-4o-mini / deepseek-chat / qwen-plus" />
                </Form.Item>
                <Form.Item label={aiStatus.data?.apiKeyConfigured ? "API key (leave blank to keep current key)" : "API key"}>
                  <Input.Password value={apiKey} onChange={setApiKey} placeholder={aiStatus.data?.apiKeyConfigured ? "Already configured" : "sk-..."} />
                </Form.Item>
              </Form>
              <Button type="primary" loading={saveAiSettings.isPending} onClick={() => saveAiSettings.mutate()}>
                Save AI provider
              </Button>
            </Space>
          </Card>
          <Button status="danger" onClick={() => void supabase.auth.signOut()}>
            Sign out
          </Button>
        </Space>
      </Card>
    </div>
  );
}
