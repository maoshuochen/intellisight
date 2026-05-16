import { Button, Card, Form, Input, Message, Space, Typography } from "@arco-design/web-react";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Message.error(error.message);
    setLoading(false);
  }

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Message.error(error.message);
    else Message.success("Account created. Confirm email if your Supabase project requires it.");
    setLoading(false);
  }

  if (loading) return <div className="center-screen">Loading...</div>;
  if (session) return children;

  return (
    <div className="login-screen">
      <Card className="login-card">
        <Space direction="vertical" size={20} className="full-width-space">
          <div>
            <Typography.Title heading={3}>IntelliSight</Typography.Title>
            <Typography.Text type="secondary">Sign in with your Supabase account to open the research workspace.</Typography.Text>
          </div>
          <Form layout="vertical">
            <Form.Item label="Email">
              <Input value={email} onChange={setEmail} placeholder="you@example.com" />
            </Form.Item>
            <Form.Item label="Password">
              <Input.Password value={password} onChange={setPassword} placeholder="Password" />
            </Form.Item>
          </Form>
          <Space>
            <Button type="primary" loading={loading} onClick={signIn}>
              Sign in
            </Button>
            <Button loading={loading} onClick={signUp}>
              Create account
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}
