import { DownloadIcon, SaveIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Annotation, Code, Project, Report } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CodeBadge, EmptyState, PageTitle, PanelCard, TextMuted } from "@/components/ui/app-kit";
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
  const codeMap = useMemo(() => new Map((codes.data ?? []).map((code) => [code.id, code])), [codes.data]);
  const markdown = useMemo(() => {
    const lines = [`# ${title}`, "", `Project: ${project?.name ?? "Untitled project"}`, `Generated: ${new Date().toLocaleString()}`, "", "## Executive Themes", ""];
    const byCode = new Map<string, HighlightAnnotation[]>();
    for (const annotation of annotations.data ?? []) {
      const ids = annotation.codeIds.length ? annotation.codeIds : ["uncoded"];
      for (const id of ids) byCode.set(id, [...(byCode.get(id) ?? []), annotation]);
    }
    for (const [codeId, items] of byCode) {
      const code = codeMap.get(codeId);
      lines.push(`### ${code?.name ?? "Uncoded Evidence"}`);
      if (code?.definition) lines.push("", code.definition);
      lines.push("");
      for (const annotation of items.slice(0, 6)) {
        lines.push(`- "${annotation.text}"`);
        lines.push(`  - Source: ${annotation.paragraphs?.speaker ?? "Unknown"} ${annotation.paragraphs?.startTime ?? ""}`.trimEnd());
        if (annotation.paragraphs?.text) lines.push(`  - Context: ${annotation.paragraphs.text}`);
      }
      lines.push("");
    }
    if (!(annotations.data ?? []).length) lines.push("_No highlights saved yet._", "");
    lines.push("## Code Summary", "");
    for (const code of codes.data ?? []) lines.push(`- ${code.name}: ${code.usage} highlights${code.definition ? ` — ${code.definition}` : ""}`);
    return lines.join("\n");
  }, [annotations.data, codeMap, codes.data, project?.name, title]);

  const saveReport = useMutation({
    mutationFn: () => api.post<Report>("/reports", { projectId, title, body: markdown }),
    onSuccess: () => {
      toast.success("Report saved");
      void queryClient.invalidateQueries({ queryKey: ["reports", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });

  if (!projectId) return <EmptyState description="Create or select a project first." />;

  return (
    <div className="page split-page reports-page">
      <PanelCard title="Saved reports" className="left-panel">
        <div className="list-stack">
          {(reports.data ?? []).map((item) => (
            <div key={item.id} className="list-row">
              <strong>{item.title}</strong>
              <TextMuted>{new Date(item.updatedAt).toLocaleString()}</TextMuted>
            </div>
          ))}
          {!(reports.data ?? []).length && <EmptyState description="No saved reports yet." />}
        </div>
      </PanelCard>
      <Card className="transcript-panel">
        <CardContent className="flex flex-col gap-4">
          <PageTitle title="Markdown report" />
          <div className="toolbar">
            <Input className="w-[320px]" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Button disabled={saveReport.isPending} onClick={() => saveReport.mutate()}>
              <SaveIcon data-icon="inline-start" />
              Save report
            </Button>
            <Button variant="outline" onClick={() => downloadMarkdown(title, markdown)}>
              <DownloadIcon data-icon="inline-start" />
              Download .md
            </Button>
          </div>
          <Textarea value={markdown} readOnly className="min-h-[560px] font-mono text-sm" />
        </CardContent>
      </Card>
      <PanelCard title="Export basis" className="right-panel">
        <div className="flex flex-col gap-3">
          <CodeBadge tone="blue">{annotations.data?.length ?? 0} highlights</CodeBadge>
          <CodeBadge tone="green">{codes.data?.length ?? 0} codes</CodeBadge>
          <TextMuted>Reports stay lightweight: generated from saved highlights, code usage, and transcript context.</TextMuted>
          {!(annotations.data ?? []).length && (
            <Button variant="outline" render={<Link to="/workspace" />}>
              Collect highlights
            </Button>
          )}
        </div>
      </PanelCard>
    </div>
  );
}
