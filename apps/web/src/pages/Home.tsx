import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { Annotation, Code, Interview } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, InlineAlert, PageTitle } from "@/components/ui/app-kit";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

export function Home() {
  const projectId = useAppStore((state) => state.projectId);
  const enabled = Boolean(projectId);
  const interviews = useQuery({
    queryKey: ["interviews", projectId],
    enabled,
    queryFn: () => api.get<Interview[]>(`/interviews?projectId=${projectId}`)
  });
  const codes = useQuery({
    queryKey: ["codes", projectId],
    enabled,
    queryFn: () => api.get<Code[]>(`/codes?projectId=${projectId}`)
  });
  const annotations = useQuery({
    queryKey: ["annotations", projectId],
    enabled,
    queryFn: () => api.get<Annotation[]>(`/annotations?projectId=${projectId}`)
  });

  if (!projectId) {
    return (
      <div className="page">
        <EmptyState description="Create or select a project from the sidebar to begin." />
      </div>
    );
  }

  const error = interviews.error ?? codes.error ?? annotations.error;

  return (
    <div className="page">
      <PageTitle
        title="Research workspace"
        description="A compact overview of interviews, codes, and saved evidence."
        action={
          <Button render={<Link to="/workspace" />}>
            Open Analysis Workspace
          </Button>
        }
      />
      {error && <InlineAlert variant="destructive">{error.message}</InlineAlert>}
      <div className="stat-grid">
        <StatCard title="Interviews" value={interviews.data?.length ?? 0} />
        <StatCard title="Codes" value={codes.data?.length ?? 0} />
        <StatCard title="Highlights" value={annotations.data?.length ?? 0} />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="stat-value">{value}</div>
      </CardContent>
    </Card>
  );
}
