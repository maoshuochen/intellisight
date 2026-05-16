import { Button, Card, Descriptions, Typography } from "@arco-design/web-react";
import { supabase } from "../lib/supabase";
import { env } from "../lib/env";

export function Settings() {
  return (
    <div className="page">
      <Typography.Title heading={3}>Settings</Typography.Title>
      <Card bordered={false}>
        <Descriptions
          column={1}
          data={[
            { label: "API base URL", value: env.apiBaseUrl },
            { label: "Supabase URL", value: env.supabaseUrl ? "Configured" : "Missing" },
            { label: "Supabase anon key", value: env.supabaseAnonKey ? "Configured" : "Missing" }
          ]}
        />
        <Button status="danger" onClick={() => void supabase.auth.signOut()}>
          Sign out
        </Button>
      </Card>
    </div>
  );
}
