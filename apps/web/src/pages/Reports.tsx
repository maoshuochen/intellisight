import { DownloadIcon, SaveIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Annotation, CanvasDocument, Code, Project, Report } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CodeBadge, EmptyState, PageTitle, PanelCard, TextMuted } from "@/components/ui/app-kit";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

type HighlightAnnotation = Annotation & {
  interviewName?: string;
  participant?: {
    displayName?: string | null;
    role?: string | null;
    sampleGroup?: string | null;
  } | null;
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

type ThemeSection = {
  title: string;
  annotationIds: string[];
};

function annotationSource(annotation: HighlightAnnotation) {
  const participant = annotation.participant?.displayName ? ` · ${annotation.participant.displayName}` : "";
  const sampleGroup = annotation.participant?.sampleGroup ? ` · ${annotation.participant.sampleGroup}` : "";
  const speaker = annotation.paragraphs?.speaker ?? "Unknown";
  const time = annotation.paragraphs?.startTime ? ` ${annotation.paragraphs.startTime}` : "";
  return `${annotation.interviewName ?? "Interview"}${participant}${sampleGroup} · ${speaker}${time}`;
}

function themeSectionsFromCanvases(canvases: CanvasDocument[] | undefined): ThemeSection[] {
  const sections: ThemeSection[] = [];
  for (const canvas of canvases ?? []) {
    for (const node of canvas.nodes as Array<{ data?: Record<string, unknown> }>) {
      const data = node.data ?? {};
      if (data.sourceType !== "theme") continue;
      const ids = Array.isArray(data.sourceAnnotationIds) ? data.sourceAnnotationIds.map(String).filter(Boolean) : [];
      if (!ids.length) continue;
      sections.push({
        title: String(data.label ?? "Untitled theme").replace(/\s+\(\d+\)$/, ""),
        annotationIds: ids
      });
    }
  }
  return sections;
}

export function Reports() {
  const projectId = useAppStore((state) => state.projectId);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("Research synthesis");
  const [body, setBody] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [bodyEdited, setBodyEdited] = useState(false);
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
  const canvases = useQuery({
    queryKey: ["canvases", projectId],
    enabled,
    queryFn: () => api.get<CanvasDocument[]>(`/canvases?projectId=${projectId}`)
  });
  const project = projects.data?.find((item) => item.id === projectId);
  const codeMap = useMemo(() => new Map((codes.data ?? []).map((code) => [code.id, code])), [codes.data]);
  const themeSections = useMemo(() => themeSectionsFromCanvases(canvases.data), [canvases.data]);
  const sourceSummary = useMemo(() => {
    const sourceAnnotationIds = new Set(themeSections.flatMap((theme) => theme.annotationIds));
    const sampleGroups = new Set((annotations.data ?? []).map((annotation) => annotation.participant?.sampleGroup).filter(Boolean));
    return {
      themeCount: themeSections.length,
      highlightCount: annotations.data?.length ?? 0,
      themedHighlightCount: sourceAnnotationIds.size,
      codeCount: codes.data?.length ?? 0,
      sampleGroupCount: sampleGroups.size
    };
  }, [annotations.data, codes.data?.length, themeSections]);
  const markdown = useMemo(() => {
    const lines = [`# ${title}`, "", `Project: ${project?.name ?? "Untitled project"}`, `Generated: ${new Date().toLocaleString()}`, "", "## Executive Themes", ""];
    const annotationMap = new Map((annotations.data ?? []).map((annotation) => [annotation.id, annotation]));
    const usedThemeAnnotationIds = new Set<string>();
    for (const theme of themeSections) {
      const items = theme.annotationIds.map((id) => annotationMap.get(id)).filter((item): item is HighlightAnnotation => Boolean(item));
      if (!items.length) continue;
      lines.push(`### ${theme.title}`, "");
      for (const annotation of items.slice(0, 8)) {
        usedThemeAnnotationIds.add(annotation.id);
        lines.push(`- "${annotation.text}"`);
        lines.push(`  - Source: ${annotationSource(annotation)}`);
        if (annotation.comment) lines.push(`  - Memo: ${annotation.comment}`);
      }
      lines.push("");
    }
    if (themeSections.length) lines.push("## Code-backed Evidence", "");
    const byCode = new Map<string, HighlightAnnotation[]>();
    for (const annotation of annotations.data ?? []) {
      if (usedThemeAnnotationIds.has(annotation.id)) continue;
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
        lines.push(`  - Source: ${annotationSource(annotation)}`);
        if (annotation.comment) lines.push(`  - Memo: ${annotation.comment}`);
        if (annotation.paragraphs?.text) lines.push(`  - Context: ${annotation.paragraphs.text}`);
      }
      lines.push("");
    }
    if (!(annotations.data ?? []).length) lines.push("_No highlights saved yet._", "");
    lines.push("## Code Summary", "");
    for (const code of codes.data ?? []) lines.push(`- ${code.name}: ${code.usage} highlights${code.definition ? ` — ${code.definition}` : ""}`);
    const sampleGroups = new Map<string, number>();
    for (const annotation of annotations.data ?? []) {
      const group = annotation.participant?.sampleGroup;
      if (group) sampleGroups.set(group, (sampleGroups.get(group) ?? 0) + 1);
    }
    if (sampleGroups.size) {
      lines.push("", "## Sample Group Coverage", "");
      for (const [group, count] of sampleGroups) lines.push(`- ${group}: ${count} highlights`);
    }
    return lines.join("\n");
  }, [annotations.data, codeMap, codes.data, project?.name, themeSections, title]);

  useEffect(() => {
    const latest = reports.data?.[0];
    if (!latest || selectedReportId) return;
    setSelectedReportId(latest.id);
    setTitle(latest.title);
    setBody(latest.body);
    setBodyEdited(false);
  }, [reports.data, selectedReportId]);

  useEffect(() => {
    if (selectedReportId) return;
    setBody(markdown);
    setBodyEdited(false);
  }, [markdown, selectedReportId]);

  const saveReport = useMutation({
    mutationFn: () => selectedReportId ? api.patch<Report>(`/reports/${selectedReportId}`, { title, body }) : api.post<Report>("/reports", { projectId, title, body }),
    onSuccess: (report) => {
      toast.success("Report saved");
      setSelectedReportId(report.id);
      setBodyEdited(false);
      void queryClient.invalidateQueries({ queryKey: ["reports", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });

  if (!projectId) return <EmptyState description="Create or select a project first." />;

  function regenerateDraft() {
    if (bodyEdited && !window.confirm("Regenerate the draft from current evidence? Unsaved manual edits in the editor will be replaced.")) return;
    setSelectedReportId(null);
    setBody(markdown);
    setBodyEdited(false);
  }

  return (
    <div className="page split-page reports-page">
      <PanelCard title="Saved reports" className="left-panel">
        <div className="list-stack">
          {(reports.data ?? []).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`list-row clickable-row ${item.id === selectedReportId ? "active-row" : ""}`}
              onClick={() => {
                setSelectedReportId(item.id);
                setTitle(item.title);
                setBody(item.body);
                setBodyEdited(false);
              }}
            >
              <strong>{item.title}</strong>
              <TextMuted>{new Date(item.updatedAt).toLocaleString()}</TextMuted>
            </button>
          ))}
          {!(reports.data ?? []).length && <EmptyState description="No saved reports yet. Generate a draft from coded highlights, then save it as the first synthesis output." />}
        </div>
      </PanelCard>
      <Card className="transcript-panel">
        <CardContent className="flex flex-col gap-4">
          <PageTitle title="Markdown report" />
          <div className="toolbar">
            <Input className="w-[320px]" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Button disabled={saveReport.isPending} onClick={() => saveReport.mutate()}>
              <SaveIcon data-icon="inline-start" />
              {selectedReportId ? "Update report" : "Save report"}
            </Button>
            <Button variant="outline" onClick={regenerateDraft}>
              Regenerate draft
            </Button>
            <Button variant="outline" onClick={() => downloadMarkdown(title, body)}>
              <DownloadIcon data-icon="inline-start" />
              Download .md
            </Button>
          </div>
          {bodyEdited && <TextMuted>Manual edits are unsaved. Regenerating will ask before replacing this draft.</TextMuted>}
          <Textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setBodyEdited(true);
            }}
            className="min-h-[560px] font-mono text-sm"
          />
        </CardContent>
      </Card>
      <PanelCard title="Export basis" className="right-panel">
        <div className="flex flex-col gap-3">
          <CodeBadge tone="blue">{annotations.data?.length ?? 0} highlights</CodeBadge>
          <CodeBadge tone="green">{codes.data?.length ?? 0} codes</CodeBadge>
          <CodeBadge tone="purple">{themeSections.length} canvas themes</CodeBadge>
          <TextMuted>
            Generated from {sourceSummary.themeCount} themes, {sourceSummary.themedHighlightCount}/{sourceSummary.highlightCount} themed highlights, {sourceSummary.codeCount} codes, and {sourceSummary.sampleGroupCount} sample groups.
          </TextMuted>
          {!(annotations.data ?? []).length && (
            <Button variant="outline" render={<Link to="/interviews" />}>
              Collect highlights
            </Button>
          )}
        </div>
      </PanelCard>
    </div>
  );
}
