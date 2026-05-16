import { Card, Grid, Statistic, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import type { Annotation, Code, Interview } from "@intellisight/shared";
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

  return (
    <div className="page">
      <Typography.Title heading={3}>Research workspace</Typography.Title>
      <Grid.Row gutter={16}>
        <Grid.Col span={8}>
          <Card bordered={false}>
            <Statistic title="Interviews" value={interviews.data?.length ?? 0} />
          </Card>
        </Grid.Col>
        <Grid.Col span={8}>
          <Card bordered={false}>
            <Statistic title="Codes" value={codes.data?.length ?? 0} />
          </Card>
        </Grid.Col>
        <Grid.Col span={8}>
          <Card bordered={false}>
            <Statistic title="Highlights" value={annotations.data?.length ?? 0} />
          </Card>
        </Grid.Col>
      </Grid.Row>
    </div>
  );
}
