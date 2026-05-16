import { Button, Card, Empty, Input, List, Message, Space, Tag, Typography } from "@arco-design/web-react";
import { IconDownload, IconSave } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { Annotation, Code, Project, Report } from "@intellisight/shared";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

type HighlightAnnotation = Annotation & {
  paragraphs?: {
    speaker?: string | null;
    startTime?: string | null;
    text?: string;
  };
};

function downloadMarkdown(title: string, body: string) {
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "intellisight-report"}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function Reports() {
  const projectId = useAppStore((state) => state.projectId);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("Research synthesis");
  const enabled = Boolean(projectId);

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<Project[]>("/projects")
  });
  const annotations = useQuery({
    queryKey: ["annotations", projectId],
    enabled,
    queryFn: () => api.get<HighlightAnnotation[]>(`/annotations?projectId=${projectId}`)
  });
  const codes = useQuery({
    queryKey: ["codes", projectId],
    enabled,
    queryFn: () => api.get<Code[]>(`/codes?projectId=${projectId}`)
  });
  const reports = useQuery({
    queryKey: ["reports", projectId],
    enabled,
    queryFn: () => api.get<Report[]>(`/reports?projectId=${projectId}`)
  });
  const project = projects.data?.find((item) => item.id === projectId);
  const codeMap = useMemo(() => new Map((codes.data ?? []).map((code) => [code.id, code.name])), [codes.data]);
  const markdown = useMemo(() => {
    const lines = [`# ${title}`, "", `Project: ${project?.name ?? "Untitled project"}`, `Generated: ${new Date().toLocaleString()}`, "", "## Highlights", ""];
    for (const annotation of annotations.data ?? []) {
      const codeNames = annotation.codeIds.map((id) => codeMap.get(id) ?? id).join(", ") || "Uncoded";
      lines.push(`- "${annotation.text}"`);
      lines.push(`  - Speaker: ${annotation.paragraphs?.speaker ?? "Unknown"} ${annotation.paragraphs?.startTime ?? ""}`.trimEnd());
      lines.push(`  - Codes: ${codeNames}`);
      if (annotation.paragraphs?.text) lines.push(`  - Context: ${annotation.paragraphs.text}`);
      lines.push("");
    }
    if (!(annotations.data ?? []).length) lines.push("_No highlights saved yet._", "");
    lines.push("## Code Summary", "");
    for (const code of codes.data ?? []) lines.push(`- ${code.name}: ${code.usage} highlights`);
    return lines.join("\n");
  }, [annotations.data, codeMap, codes.data, project?.name, title]);

  const saveReport = useMutation({
    mutationFn: () => api.post<Report>("/reports", { projectId, title, body: markdown }),
    onSuccess: () => {
      Message.success("Report saved");
      void queryClient.invalidateQueries({ queryKey: ["reports", projectId] });
    },
    onError: (error) => Message.error(error.message)
  });

  if (!projectId) return <Empty description="Create or select a project first." />;

  return (
    <div className="page split-page reports-page">
      <Card className="left-panel" bordered={false}>
        <Typography.Title heading={4}>Saved reports</Typography.Title>
        <List
          dataSource={reports.data ?? []}
          render={(item) => (
            <List.Item key={item.id}>
              <List.Item.Meta title={item.title} description={new Date(item.updatedAt).toLocaleString()} />
            </List.Item>
          )}
        />
      </Card>
      <Card className="transcript-panel" bordered={false}>
        <Space direction="vertical" className="full-width-space" size={16}>
          <Typography.Title heading={3}>Markdown report</Typography.Title>
          <Space wrap>
            <Input value={title} onChange={setTitle} style={{ width: 320 }} />
            <Button icon={<IconSave />} type="primary" loading={saveReport.isPending} onClick={() => saveReport.mutate()}>
              Save report
            </Button>
            <Button icon={<IconDownload />} onClick={() => downloadMarkdown(title, markdown)}>
              Download .md
            </Button>
          </Space>
          <Input.TextArea value={markdown} readOnly autoSize={{ minRows: 22 }} />
        </Space>
      </Card>
      <Card className="right-panel" bordered={false}>
        <Typography.Title heading={4}>Export basis</Typography.Title>
        <Space direction="vertical" className="full-width-space">
          <Tag color="arcoblue">{annotations.data?.length ?? 0} highlights</Tag>
          <Tag color="green">{codes.data?.length ?? 0} codes</Tag>
          <Typography.Text type="secondary">Reports stay lightweight: generated from saved highlights, code usage, and transcript context.</Typography.Text>
        </Space>
      </Card>
    </div>
  );
}
