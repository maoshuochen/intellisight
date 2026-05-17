import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/app-kit";
import { env } from "../lib/env";
import { supabase } from "../lib/supabase";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (env.demoMode) {
      setLoading(false);
      return;
    }
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
    if (error) toast.error(error.message);
    setLoading(false);
  }

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) toast.error(error.message);
    else toast.success("Account created. Confirm email if your Supabase project requires it.");
    setLoading(false);
  }

  if (loading) return <LoadingBlock />;
  if (env.demoMode) return children;
  if (session) return children;

  return (
    <div className="login-screen">
      <Card className="login-card">
        <CardHeader>
          <CardTitle>IntelliSight</CardTitle>
          <CardDescription>AI-assisted qualitative coding for interviews, highlights, and research synthesis.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
            </Field>
          </FieldGroup>
          <div className="flex gap-2">
            <Button disabled={loading} onClick={signIn}>
              Sign in
            </Button>
            <Button variant="outline" disabled={loading} onClick={signUp}>
              Create account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
