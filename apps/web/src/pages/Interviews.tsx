import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Code, CodeGroup, Interview, Paragraph, RecommendCodesResponse, TextImproveResponse } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeBadge, EmptyState, InlineAlert, OptionSelect, PanelCard, TextMuted } from "@/components/ui/app-kit";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

export function Interviews() {
  const projectId = useAppStore((state) => state.projectId);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(null);
  const [selectionOffsets, setSelectionOffsets] = useState({ start: 0, end: 0 });
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [speaker, setSpeaker] = useState<string | undefined>();
  const [importName, setImportName] = useState("Imported interview");
  const [importTranscript, setImportTranscript] = useState("");
  const queryClient = useQueryClient();
  const enabled = Boolean(projectId);

  const interviews = useQuery({
    queryKey: ["interviews", projectId],
    enabled,
    queryFn: () => api.get<Interview[]>(`/interviews?projectId=${projectId}`)
  });
  const activeInterviewId = selectedInterviewId ?? interviews.data?.[0]?.id;
  const paragraphs = useQuery({
    queryKey: ["paragraphs", activeInterviewId],
    enabled: Boolean(activeInterviewId),
    queryFn: () => api.get<Paragraph[]>(`/interviews/${activeInterviewId}/paragraphs`)
  });
  const codes = useQuery({
    queryKey: ["codes", projectId],
    enabled,
    queryFn: () => api.get<Code[]>(`/codes?projectId=${projectId}`)
  });
  const codeGroups = useQuery({
    queryKey: ["code-groups", projectId],
    enabled,
    queryFn: () => api.get<CodeGroup[]>(`/code-groups?projectId=${projectId}`)
  });
  const recommendations = useMutation({
    mutationFn: (text: string) =>
      api.post<RecommendCodesResponse>("/ai/codes/recommend", {
        projectId,
        text,
        candidateCodes: (codes.data ?? []).map((code) => ({ id: code.id, name: code.name }))
      })
  });
  const keywords = useMutation({
    mutationFn: (text: string) => api.post<{ keywords: string[]; degraded: boolean; provider: string }>("/ai/keywords/extract", { projectId, text })
  });
  const improveText = useMutation({
    mutationFn: (mode: "correct" | "simplify") => api.post<TextImproveResponse>("/ai/text/improve", { projectId, text: selectedText, mode }),
    onError: (error) => toast.error(error.message)
  });
  const createCode = useMutation({
    mutationFn: (name: string) =>
      api.post<Code>("/codes", {
        projectId,
        codeGroupId: codeGroups.data?.[0]?.id,
        name
      }),
    onSuccess: (code) => {
      setSelectedCodeIds((ids) => (ids.includes(code.id) ? ids : [...ids, code.id]));
      void queryClient.invalidateQueries({ queryKey: ["codes", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });
  const createDemoInterview = useMutation({
    mutationFn: () =>
      api.post<Interview>("/interviews", {
        projectId,
        name: "Demo interview",
        sample: "ResearchOps workflow",
        length: "08:20",
        participantName: "Participant B",
        paragraphs: [
          {
            speaker: "Researcher",
            startTime: "00:00",
            text: "How do you usually process interview transcripts after the session?"
          },
          {
            speaker: "Participant",
            startTime: "00:08",
            text: "I read the transcript several times, highlight quotes, and then copy them into a board. It works, but I lose context easily."
          },
          {
            speaker: "Participant",
            startTime: "00:34",
            text: "AI recommendations would be useful if they stay optional. I still want to decide whether a code actually matches the research goal."
          }
        ]
      }),
    onSuccess: (interview) => {
      setSelectedInterviewId(interview.id);
      void queryClient.invalidateQueries({ queryKey: ["interviews", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });
  const importInterview = useMutation({
    mutationFn: () =>
      api.post<Interview & { paragraphCount?: number }>("/interviews/import", {
        projectId,
        name: importName,
        transcript: importTranscript
      }),
    onSuccess: (interview) => {
      toast.success(`Imported ${interview.paragraphCount ?? "transcript"} paragraphs`);
      setSelectedInterviewId(interview.id);
      setImportTranscript("");
      void queryClient.invalidateQueries({ queryKey: ["interviews", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });
  const saveAnnotation = useMutation({
    mutationFn: () =>
      api.post("/annotations", {
        projectId,
        paragraphId: selectedParagraphId,
        text: selectedText,
        startOffset: selectionOffsets.start,
        endOffset: selectionOffsets.end,
        codeIds: selectedCodeIds
    }),
    onSuccess: () => {
      toast.success("Annotation saved");
      setSelectedText("");
      setSelectedCodeIds([]);
      void queryClient.invalidateQueries({ queryKey: ["annotations", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["codes", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });

  const codeMap = useMemo(() => new Map((codes.data ?? []).map((code) => [code.id, code])), [codes.data]);
  const speakers = useMemo(
    () => [...new Set((paragraphs.data ?? []).map((paragraph) => paragraph.speaker).filter((item): item is string => Boolean(item)))],
    [paragraphs.data]
  );
  const filteredParagraphs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (paragraphs.data ?? []).filter((paragraph) => {
      const matchesQuery = !needle || paragraph.text.toLowerCase().includes(needle);
      const matchesSpeaker = !speaker || paragraph.speaker === speaker;
      return matchesQuery && matchesSpeaker;
    });
  }, [paragraphs.data, query, speaker]);

  useEffect(() => {
    for (const result of [interviews, paragraphs, codes, codeGroups]) {
      if (result.error) toast.error(result.error.message);
    }
  }, [codeGroups, codes, interviews, paragraphs]);

  function captureSelection(paragraph: Paragraph) {
    const text = window.getSelection()?.toString().trim() ?? "";
    if (!text) return;
    const start = paragraph.text.indexOf(text);
    setSelectedParagraphId(paragraph.id);
    setSelectedText(text);
    setSelectionOffsets({ start: Math.max(0, start), end: Math.max(0, start) + text.length });
    setSelectedCodeIds([]);
    recommendations.mutate(text);
    keywords.mutate(text);
  }

  if (!projectId) {
    return (
      <div className="page">
        <EmptyState description="Create or select a project first." />
      </div>
    );
  }

  return (
    <div className="page split-page">
      <PanelCard title="Interviews" className="left-panel">
        <div className="import-panel">
          <Input value={importName} onChange={(event) => setImportName(event.target.value)} placeholder="Interview name" />
          <Textarea
            className="min-h-28"
            value={importTranscript}
            onChange={(event) => setImportTranscript(event.target.value)}
            placeholder={"Paste transcript, e.g.\nResearcher 00:00: How do you work?\nParticipant 00:10: I start by..."}
          />
          <Button disabled={!importName.trim() || !importTranscript.trim() || importInterview.isPending} onClick={() => importInterview.mutate()}>
            Import transcript
          </Button>
        </div>
        {(interviews.data ?? []).length ? (
          <div className="list-stack">
            {(interviews.data ?? []).map((item) => (
              <button key={item.id} type="button" className={`list-row clickable-row ${item.id === activeInterviewId ? "active-row" : ""}`} onClick={() => setSelectedInterviewId(item.id)}>
                <strong>{item.name}</strong>
                <TextMuted>{item.participantName ?? item.sample ?? "Transcript"}</TextMuted>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-action">
            <EmptyState
              description="No interviews yet."
              action={
                <Button disabled={createDemoInterview.isPending} onClick={() => createDemoInterview.mutate()}>
                  Create demo interview
                </Button>
              }
            />
          </div>
        )}
      </PanelCard>
      <PanelCard title="Transcript coding" className="transcript-panel">
        <div className="flex flex-col gap-4">
          <div className="toolbar">
            <Input className="w-[280px]" placeholder="Search transcript" value={query} onChange={(event) => setQuery(event.target.value)} />
            <OptionSelect
              placeholder="Speaker"
              allowClear
              value={speaker}
              onChange={setSpeaker}
              options={speakers.map((item) => ({ label: item, value: item }))}
              className="w-[180px]"
            />
          </div>
          <div className="paragraph-list">
            {filteredParagraphs.map((paragraph) => (
              <article className="paragraph" key={paragraph.id} onMouseUp={() => captureSelection(paragraph)}>
                <div className="paragraph-meta">
                  <strong>{paragraph.speaker ?? "Speaker"}</strong>
                  <span>{paragraph.startTime}</span>
                </div>
                <p>{paragraph.text}</p>
              </article>
            ))}
            {!filteredParagraphs.length && (
              <EmptyState
                description="No transcript paragraphs match the current filters."
                action={
                  !(interviews.data ?? []).length ? (
                    <div className="flex gap-2">
                      <Button disabled={createDemoInterview.isPending} onClick={() => createDemoInterview.mutate()}>
                        Create demo interview
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            )}
          </div>
        </div>
      </PanelCard>
      <PanelCard title="AI coding" className="right-panel">
        {selectedText ? (
          <div className="flex flex-col gap-4">
            <p className="quote-preview">{selectedText}</p>
            {recommendations.data?.degraded && <InlineAlert>AI provider is unavailable. Showing rule-based fallback recommendations.</InlineAlert>}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={improveText.isPending} onClick={() => improveText.mutate("correct")}>
                Correct text
              </Button>
              <Button size="sm" variant="outline" disabled={improveText.isPending} onClick={() => improveText.mutate("simplify")}>
                Simplify
              </Button>
            </div>
            {improveText.data && (
              <InlineAlert>
                <div className="flex flex-col gap-2">
                  <span>{improveText.data.text}</span>
                  <TextMuted>{improveText.data.reason}</TextMuted>
                  <Button size="sm" onClick={() => setSelectedText(improveText.data.text)}>Use this text</Button>
                </div>
              </InlineAlert>
            )}
            <TextMuted>Selected codes</TextMuted>
            <div className="badge-row">
              {selectedCodeIds.map((id) => (
                <CodeBadge key={id} onClose={() => setSelectedCodeIds((ids) => ids.filter((item) => item !== id))}>
                  {codeMap.get(id)?.name ?? id}
                </CodeBadge>
              ))}
            </div>
            <TextMuted>Recommendations</TextMuted>
            <div className="badge-row">
              {recommendations.isPending && <CodeBadge tone="gray">Loading recommendations...</CodeBadge>}
              {(recommendations.data?.recommendations ?? []).map((item) => (
                <Tooltip key={item.id ?? item.label}>
                  <TooltipTrigger>
                    <CodeBadge selected={selectedCodeIds.includes(item.id ?? "")} tone="gray" onClick={() => item.id && setSelectedCodeIds((ids) => (ids.includes(item.id!) ? ids.filter((id) => id !== item.id) : [...ids, item.id!]))}>
                      {item.label}
                    </CodeBadge>
                  </TooltipTrigger>
                  <TooltipContent>{Math.round(item.score * 100)}% · {item.reason}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            <TextMuted>New code candidates</TextMuted>
            <div className="badge-row">
              {keywords.isPending && <CodeBadge tone="gray">Extracting keywords...</CodeBadge>}
              {(keywords.data?.keywords ?? []).map((keyword) => (
                <CodeBadge key={keyword} tone="green" onClick={() => createCode.mutate(keyword)}>
                  + {keyword}
                </CodeBadge>
              ))}
            </div>
            <Button disabled={!selectedParagraphId || !selectedCodeIds.length || saveAnnotation.isPending} onClick={() => saveAnnotation.mutate()}>
              Save annotation
            </Button>
          </div>
        ) : (
          <TextMuted>Select text in the transcript to get code recommendations.</TextMuted>
        )}
      </PanelCard>
    </div>
  );
}
