import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Annotation, Code, Interview } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CodeBadge, EmptyState, OptionSelect, PageTitle, TextMuted } from "@/components/ui/app-kit";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

type HighlightAnnotation = Annotation & {
  paragraphs?: {
    speaker?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    text?: string;
  };
};

export function Highlights() {
  const projectId = useAppStore((state) => state.projectId);
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [codeId, setCodeId] = useState<string | undefined>();
  const [speaker, setSpeaker] = useState<string | undefined>();
  const annotations = useQuery({
    queryKey: ["annotations", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<HighlightAnnotation[]>(`/annotations?projectId=${projectId}`)
  });
  const codes = useQuery({
    queryKey: ["codes", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<Code[]>(`/codes?projectId=${projectId}`)
  });
  const interviews = useQuery({
    queryKey: ["interviews", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<Interview[]>(`/interviews?projectId=${projectId}`)
  });
  const speakers = useMemo(
    () => [...new Set((annotations.data ?? []).map((annotation) => annotation.paragraphs?.speaker).filter((item): item is string => Boolean(item)))],
    [annotations.data]
  );
  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return (annotations.data ?? []).filter((annotation) => {
      const matchesText = !needle || annotation.text.toLowerCase().includes(needle) || annotation.paragraphs?.text?.toLowerCase().includes(needle);
      const matchesCode = !codeId || annotation.codeIds.includes(codeId);
      const matchesSpeaker = !speaker || annotation.paragraphs?.speaker === speaker;
      return matchesText && matchesCode && matchesSpeaker;
    });
  }, [annotations.data, codeId, keyword, speaker]);

  if (!projectId) return <EmptyState description="Create or select a project first." />;

  return (
    <div className="page">
      <PageTitle title="Highlights" description="Review coded evidence with transcript context." />
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="toolbar">
            <Input className="w-[280px]" placeholder="Filter highlights or context" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            <OptionSelect
              placeholder="Code"
              allowClear
              value={codeId}
              onChange={setCodeId}
              options={(codes.data ?? []).map((code) => ({ label: code.name, value: code.id }))}
              className="w-[200px]"
            />
            <OptionSelect
              placeholder="Speaker"
              allowClear
              value={speaker}
              onChange={setSpeaker}
              options={speakers.map((item) => ({ label: item, value: item }))}
              className="w-[180px]"
            />
          </div>
          <div className="list-stack">
            {filtered.map((item) => (
              <button key={item.id} type="button" className="list-row clickable-row" onClick={() => navigate("/interviews")}>
                <strong>{item.text}</strong>
                <TextMuted>
                  {item.paragraphs?.speaker ?? "Speaker"} · {item.paragraphs?.startTime ?? ""} · Codes: {item.codeIds.length} · {new Date(item.createdAt).toLocaleString()}
                </TextMuted>
                <TextMuted className="line-clamp-2">{item.paragraphs?.text ?? "No context available"}</TextMuted>
                <div className="badge-row">
                  {item.codeIds.map((id) => {
                    const code = codes.data?.find((candidate) => candidate.id === id);
                    return <CodeBadge key={id}>{code?.name ?? id}</CodeBadge>;
                  })}
                  {interviews.data?.[0] && <CodeBadge tone="blue">{interviews.data[0].name}</CodeBadge>}
                </div>
              </button>
            ))}
            {!filtered.length && (
              <EmptyState
                description="No highlights match the current filters."
                action={
                  <Button variant="outline" render={<Link to="/workspace" />}>
                    Open Workspace
                  </Button>
                }
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
