import { Alert, Button, Card, Descriptions, Space, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import type { AiStatus } from "@intellisight/shared";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { env } from "../lib/env";

export function Settings() {
  const aiStatus = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => api.get<AiStatus>("/ai/status")
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
              { label: "AI model", value: aiStatus.data?.model ?? "Fallback rules" }
            ]}
          />
          <Button status="danger" onClick={() => void supabase.auth.signOut()}>
            Sign out
          </Button>
        </Space>
      </Card>
    </div>
  );
}
