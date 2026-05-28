import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { Annotation, CanvasDocument, Code, Interview, Participant } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CodeBadge, EmptyState, OptionSelect, PageTitle, TextMuted } from "@/components/ui/app-kit";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

type HighlightAnnotation = Annotation & {
  interviewId?: string;
  interviewName?: string;
  paragraphSortOrder?: number;
  paragraphs?: {
    speaker?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    text?: string;
  };
};

export function Highlights() {
  const projectId = useAppStore((state) => state.projectId);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const [codeId, setCodeId] = useState<string | undefined>(searchParams.get("codeId") ?? undefined);
  const [interviewId, setInterviewId] = useState<string | undefined>();
  const [participantId, setParticipantId] = useState<string | undefined>();
  const [sampleGroup, setSampleGroup] = useState<string | undefined>();
  const [speaker, setSpeaker] = useState<string | undefined>();
  const [targetCanvasId, setTargetCanvasId] = useState<string | undefined>();
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
  const participants = useQuery({
    queryKey: ["participants", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<Participant[]>(`/participants?projectId=${projectId}`)
  });
  const canvases = useQuery({
    queryKey: ["canvases", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<CanvasDocument[]>(`/canvases?projectId=${projectId}`)
  });
  const deleteAnnotation = useMutation({
    mutationFn: (id: string) => api.delete(`/annotations/${id}`),
    onSuccess: () => {
      toast.success("Highlight deleted");
      void queryClient.invalidateQueries({ queryKey: ["annotations", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["codes", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });
  const activeAnnotationId = searchParams.get("annotationId");
  const speakers = useMemo(
    () => [...new Set((annotations.data ?? []).map((annotation) => annotation.paragraphs?.speaker).filter((item): item is string => Boolean(item)))],
    [annotations.data]
  );
  const sampleGroups = useMemo(
    () => [...new Set((participants.data ?? []).map((participant) => participant.sampleGroup).filter((item): item is string => Boolean(item)))],
    [participants.data]
  );
  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return (annotations.data ?? []).filter((annotation) => {
      const matchesText = !needle || annotation.text.toLowerCase().includes(needle) || annotation.paragraphs?.text?.toLowerCase().includes(needle);
      const matchesCode = !codeId || annotation.codeIds.includes(codeId);
      const matchesInterview = !interviewId || annotation.interviewId === interviewId;
      const matchesParticipant = !participantId || annotation.participant?.id === participantId;
      const matchesSampleGroup = !sampleGroup || annotation.participant?.sampleGroup === sampleGroup;
      const matchesSpeaker = !speaker || annotation.paragraphs?.speaker === speaker;
      return matchesText && matchesCode && matchesInterview && matchesParticipant && matchesSampleGroup && matchesSpeaker;
    });
  }, [annotations.data, codeId, interviewId, keyword, participantId, sampleGroup, speaker]);
  const addFilteredToCanvas = useMutation({
    mutationFn: async () => {
      const currentCanvas = canvases.data?.find((canvas) => canvas.id === targetCanvasId) ?? canvases.data?.[0] ?? await api.post<CanvasDocument>("/canvases", { projectId, name: "Evidence board" });
      const existingAnnotationIds = new Set(
        (currentCanvas.nodes ?? []).map((node) => String((node as { data?: { annotationId?: string } }).data?.annotationId ?? ""))
      );
      const additions = filtered
        .filter((annotation) => !existingAnnotationIds.has(annotation.id))
        .map((annotation, index) => ({
          id: `annotation-${annotation.id}-${Date.now()}-${index}`,
          type: "default",
          position: { x: 120 + (index % 3) * 260, y: 120 + Math.floor(index / 3) * 140 },
          data: {
            label: annotation.text,
            sourceType: "highlight",
            annotationId: annotation.id,
            sourceAnnotationIds: [annotation.id],
            interviewName: annotation.interviewName,
            participantName: annotation.participant?.displayName,
            sampleGroup: annotation.participant?.sampleGroup
          }
        }));
      if (!additions.length) return { added: 0, canvasId: currentCanvas.id };
      await api.put<CanvasDocument>(`/canvases/${currentCanvas.id}`, {
        name: currentCanvas.name,
        nodes: [...currentCanvas.nodes, ...additions],
        edges: currentCanvas.edges,
        viewport: currentCanvas.viewport ?? null
      });
      return { added: additions.length, canvasId: currentCanvas.id };
    },
    onSuccess: (result) => {
      toast.success(result.added ? `Added ${result.added} highlights to canvas` : "Filtered highlights are already on the canvas");
      setTargetCanvasId(result.canvasId);
      void queryClient.invalidateQueries({ queryKey: ["canvases", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });

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
              placeholder="Interview"
              allowClear
              value={interviewId}
              onChange={setInterviewId}
              options={(interviews.data ?? []).map((interview) => ({ label: interview.name, value: interview.id }))}
              className="w-[220px]"
            />
            <OptionSelect
              placeholder="Participant"
              allowClear
              value={participantId}
              onChange={setParticipantId}
              options={(participants.data ?? []).map((participant) => ({ label: participant.displayName, value: participant.id }))}
              className="w-[200px]"
            />
            <OptionSelect
              placeholder="Sample group"
              allowClear
              value={sampleGroup}
              onChange={setSampleGroup}
              options={sampleGroups.map((item) => ({ label: item, value: item }))}
              className="w-[180px]"
            />
            <OptionSelect
              placeholder="Speaker"
              allowClear
              value={speaker}
              onChange={setSpeaker}
              options={speakers.map((item) => ({ label: item, value: item }))}
              className="w-[180px]"
            />
            <OptionSelect
              placeholder="Target canvas"
              value={targetCanvasId}
              onChange={setTargetCanvasId}
              options={(canvases.data ?? []).map((canvas) => ({ label: canvas.name, value: canvas.id }))}
              className="w-[180px]"
            />
            <Button variant="outline" disabled={!filtered.length || addFilteredToCanvas.isPending} onClick={() => addFilteredToCanvas.mutate()}>
              <PlusIcon data-icon="inline-start" />
              Add filtered to Canvas
            </Button>
            {targetCanvasId && (
              <Button variant="outline" render={<Link to="/canvas" />}>
                Open Canvas
              </Button>
            )}
          </div>
          <div className="list-stack">
            {filtered.map((item) => (
              <article key={item.id} className={`list-row evidence-row ${item.id === activeAnnotationId ? "active-row" : ""}`}>
                <Link className="evidence-main" to={`/interviews?interviewId=${item.interviewId ?? ""}&paragraphId=${item.paragraphId}`}>
                  <strong>{item.text}</strong>
                  <TextMuted>
                    {item.interviewName ?? "Interview"} · {item.participant?.displayName ?? "Participant"} · {item.paragraphs?.speaker ?? "Speaker"} {item.paragraphs?.startTime ?? ""} · Codes: {item.codeIds.length}
                  </TextMuted>
                  {item.comment && <TextMuted>{item.comment}</TextMuted>}
                  <TextMuted className="line-clamp-2">{item.paragraphs?.text ?? "No context available"}</TextMuted>
                </Link>
                <div className="badge-row">
                  {item.codeIds.map((id) => {
                    const code = codes.data?.find((candidate) => candidate.id === id);
                    return <CodeBadge key={id}>{code?.name ?? id}</CodeBadge>;
                  })}
                  <CodeBadge tone="gray">P{item.paragraphSortOrder ?? "?"}</CodeBadge>
                  <Button size="sm" variant="outline" render={<Link to={`/interviews?interviewId=${item.interviewId ?? ""}&paragraphId=${item.paragraphId}`} />}>
                    Open source
                  </Button>
                  <Button size="sm" variant="destructive" disabled={deleteAnnotation.isPending} onClick={() => deleteAnnotation.mutate(item.id)}>
                    Delete
                  </Button>
                </div>
              </article>
            ))}
            {!filtered.length && (annotations.data ?? []).length > 0 && (
              <EmptyState
                description="No highlights match the current filters. Clear one filter or broaden the keyword search."
                action={
                  <Button variant="outline" render={<Link to="/interviews" />}>
                    Open Interviews
                  </Button>
                }
              />
            )}
            {!filtered.length && !(annotations.data ?? []).length && (
              <EmptyState
                description="No highlights yet. Go to Interviews, select a quote, and save it with a code before reviewing evidence here."
                action={
                  <Button variant="outline" render={<Link to="/interviews" />}>
                    Start coding
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
