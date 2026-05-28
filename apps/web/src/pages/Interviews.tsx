import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { Annotation, Code, CodeGroup, Interview, Paragraph, Participant, RecommendCodesResponse, TextImproveResponse } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeBadge, EmptyState, InlineAlert, OptionSelect, PanelCard, TextMuted } from "@/components/ui/app-kit";
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

type PopoverPosition = {
  left: number;
  top: number;
  placement: "above" | "below";
};

export function Interviews() {
  const projectId = useAppStore((state) => state.projectId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(null);
  const [selectionOffsets, setSelectionOffsets] = useState({ start: 0, end: 0 });
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([]);
  const [annotationComment, setAnnotationComment] = useState("");
  const [query, setQuery] = useState("");
  const [speaker, setSpeaker] = useState<string | undefined>();
  const [codeQuery, setCodeQuery] = useState("");
  const [focusedParagraphId, setFocusedParagraphId] = useState<string | null>(searchParams.get("paragraphId"));
  const [importName, setImportName] = useState("Imported interview");
  const [participantName, setParticipantName] = useState("");
  const [participantRole, setParticipantRole] = useState("");
  const [sampleGroup, setSampleGroup] = useState("");
  const [importTranscript, setImportTranscript] = useState("");
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const paragraphRefs = useRef(new Map<string, HTMLElement>());
  const queryClient = useQueryClient();
  const enabled = Boolean(projectId);

  const interviews = useQuery({
    queryKey: ["interviews", projectId],
    enabled,
    queryFn: () => api.get<Interview[]>(`/interviews?projectId=${projectId}`)
  });
  const participants = useQuery({
    queryKey: ["participants", projectId],
    enabled,
    queryFn: () => api.get<Participant[]>(`/participants?projectId=${projectId}`)
  });
  const requestedInterviewId = searchParams.get("interviewId");
  const activeInterviewId = selectedInterviewId ?? requestedInterviewId ?? interviews.data?.[0]?.id;
  const activeInterview = useMemo(() => (interviews.data ?? []).find((interview) => interview.id === activeInterviewId), [activeInterviewId, interviews.data]);
  const matchedParticipant = useMemo(() => {
    const name = participantName.trim().toLowerCase();
    if (!name) return undefined;
    return (participants.data ?? []).find((participant) => participant.displayName.toLowerCase() === name);
  }, [participantName, participants.data]);
  const participantSuggestions = useMemo(() => {
    const name = participantName.trim().toLowerCase();
    if (!name) return (participants.data ?? []).slice(0, 4);
    return (participants.data ?? []).filter((participant) => participant.displayName.toLowerCase().includes(name)).slice(0, 4);
  }, [participantName, participants.data]);
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
  const annotations = useQuery({
    queryKey: ["annotations", projectId],
    enabled,
    queryFn: () => api.get<HighlightAnnotation[]>(`/annotations?projectId=${projectId}`)
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
        participantRole: "Researcher",
        sampleGroup: "ResearchOps",
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
      void queryClient.invalidateQueries({ queryKey: ["participants", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });
  const importInterview = useMutation({
    mutationFn: () =>
      api.post<Interview & { paragraphCount?: number }>("/interviews/import", {
        projectId,
        name: importName,
        participantId: matchedParticipant?.id,
        participantName: participantName.trim() || undefined,
        participantRole: matchedParticipant ? undefined : participantRole.trim() || undefined,
        sampleGroup: matchedParticipant ? undefined : sampleGroup.trim() || undefined,
        transcript: importTranscript
      }),
    onSuccess: (interview) => {
      toast.success(`Imported ${interview.paragraphCount ?? "transcript"} paragraphs`);
      setSelectedInterviewId(interview.id);
      setImportTranscript("");
      setParticipantName("");
      setParticipantRole("");
      setSampleGroup("");
      void queryClient.invalidateQueries({ queryKey: ["interviews", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["participants", projectId] });
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
        comment: annotationComment.trim() || undefined,
        codeIds: selectedCodeIds
      }),
    onSuccess: () => {
      toast.success("Annotation saved");
      setSelectedText("");
      setSelectedCodeIds([]);
      setAnnotationComment("");
      setPopoverPosition(null);
      void queryClient.invalidateQueries({ queryKey: ["annotations", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["codes", projectId] });
    },
    onError: (error) => toast.error(error.message)
  });

  const codeMap = useMemo(() => new Map((codes.data ?? []).map((code) => [code.id, code])), [codes.data]);
  const codeToneMap = useMemo(() => new Map((codeGroups.data ?? []).map((group) => [group.id, group.color])), [codeGroups.data]);
  const speakers = useMemo(
    () => [...new Set((paragraphs.data ?? []).map((paragraph) => paragraph.speaker).filter((item): item is string => Boolean(item)))],
    [paragraphs.data]
  );
  const activeParagraphIds = useMemo(() => new Set((paragraphs.data ?? []).map((paragraph) => paragraph.id)), [paragraphs.data]);
  const activeAnnotations = useMemo(
    () => (annotations.data ?? []).filter((annotation) => activeParagraphIds.has(annotation.paragraphId)),
    [activeParagraphIds, annotations.data]
  );
  const annotationsByParagraph = useMemo(() => {
    const map = new Map<string, HighlightAnnotation[]>();
    for (const annotation of activeAnnotations) map.set(annotation.paragraphId, [...(map.get(annotation.paragraphId) ?? []), annotation]);
    return map;
  }, [activeAnnotations]);
  const filteredCodes = useMemo(() => {
    const needle = codeQuery.trim().toLowerCase();
    return (codes.data ?? []).filter((code) => !needle || code.name.toLowerCase().includes(needle) || code.definition?.toLowerCase().includes(needle));
  }, [codeQuery, codes.data]);
  const recentCodes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const annotation of activeAnnotations) {
      for (const id of annotation.codeIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => codeMap.get(id))
      .filter((code): code is Code => Boolean(code))
      .slice(0, 6);
  }, [activeAnnotations, codeMap]);
  const codedParagraphCount = useMemo(() => {
    const ids = new Set(activeAnnotations.map((annotation) => annotation.paragraphId));
    return (paragraphs.data ?? []).filter((paragraph) => ids.has(paragraph.id)).length;
  }, [activeAnnotations, paragraphs.data]);
  const filteredParagraphs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (paragraphs.data ?? []).filter((paragraph) => {
      const matchesQuery = !needle || paragraph.text.toLowerCase().includes(needle);
      const matchesSpeaker = !speaker || paragraph.speaker === speaker;
      return matchesQuery && matchesSpeaker;
    });
  }, [paragraphs.data, query, speaker]);

  useEffect(() => {
    for (const result of [interviews, participants, paragraphs, codes, codeGroups, annotations]) {
      if (result.error) toast.error(result.error.message);
    }
  }, [annotations, codeGroups, codes, interviews, participants, paragraphs]);

  useEffect(() => {
    if (requestedInterviewId && requestedInterviewId !== selectedInterviewId) setSelectedInterviewId(requestedInterviewId);
  }, [requestedInterviewId, selectedInterviewId]);

  useEffect(() => {
    const paragraphId = searchParams.get("paragraphId");
    if (!paragraphId || !paragraphs.data?.length) return;
    setFocusedParagraphId(paragraphId);
    window.setTimeout(() => paragraphRefs.current.get(paragraphId)?.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
  }, [paragraphs.data, searchParams]);

  function captureSelection(paragraph: Paragraph) {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!text) return;
    const start = paragraph.text.indexOf(text);
    const rect = selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null;
    if (rect) {
      const width = 390;
      const estimatedHeight = 420;
      const left = Math.min(Math.max(rect.left + rect.width / 2, width / 2 + 12), window.innerWidth - width / 2 - 12);
      const belowTop = rect.bottom + 12;
      const shouldPlaceAbove = belowTop + estimatedHeight > window.innerHeight && rect.top > estimatedHeight + 24;
      setPopoverPosition({
        left,
        top: shouldPlaceAbove ? rect.top - 12 : Math.min(belowTop, Math.max(12, window.innerHeight - estimatedHeight - 12)),
        placement: shouldPlaceAbove ? "above" : "below"
      });
    }
    setSelectedParagraphId(paragraph.id);
    setSelectedText(text);
    setSelectionOffsets({ start: Math.max(0, start), end: Math.max(0, start) + text.length });
    setSelectedCodeIds([]);
    setAnnotationComment("");
    setCodeQuery("");
    recommendations.mutate(text);
    keywords.mutate(text);
  }

  function focusAnnotation(annotation: HighlightAnnotation) {
    setFocusedParagraphId(annotation.paragraphId);
    if (annotation.interviewId && annotation.interviewId !== activeInterviewId) {
      setSelectedInterviewId(annotation.interviewId);
      setSearchParams({ interviewId: annotation.interviewId, paragraphId: annotation.paragraphId });
      return;
    }
    paragraphRefs.current.get(annotation.paragraphId)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function renderParagraphText(paragraph: Paragraph) {
    const paragraphAnnotations = [...(annotationsByParagraph.get(paragraph.id) ?? [])].sort((a, b) => a.startOffset - b.startOffset);
    if (!paragraphAnnotations.length) return paragraph.text;
    const parts: ReactNode[] = [];
    let cursor = 0;
    paragraphAnnotations.forEach((annotation) => {
      const start = Math.max(cursor, Math.min(annotation.startOffset, paragraph.text.length));
      const end = Math.max(start, Math.min(annotation.endOffset, paragraph.text.length));
      if (start > cursor) parts.push(paragraph.text.slice(cursor, start));
      parts.push(
        <mark key={annotation.id} className="active-text-highlight" title={annotation.comment ?? "Saved highlight"}>
          {paragraph.text.slice(start, end)}
        </mark>
      );
      cursor = end;
    });
    if (cursor < paragraph.text.length) parts.push(paragraph.text.slice(cursor));
    return parts;
  }

  function participantLabel(interview?: Interview | null) {
    const participant = interview?.participant;
    const name = participant?.displayName ?? interview?.participantName;
    if (!name) return interview?.sample ?? "Transcript";
    return [name, participant?.sampleGroup].filter(Boolean).join(" / ");
  }

  function selectParticipant(participant: Participant) {
    setParticipantName(participant.displayName);
    setParticipantRole(participant.role ?? "");
    setSampleGroup(participant.sampleGroup ?? "");
  }

  if (!projectId) {
    return (
      <div className="page">
        <EmptyState description="Create or select a project first." />
      </div>
    );
  }

  return (
    <div className="page split-page interviews-page">
      <PanelCard title="Interviews" className="left-panel">
        <div className="import-panel">
          <Input value={importName} onChange={(event) => setImportName(event.target.value)} placeholder="Interview name" />
          <Input
            list="participant-options"
            value={participantName}
            onChange={(event) => setParticipantName(event.target.value)}
            placeholder="Participant name or anonymous ID"
          />
          <datalist id="participant-options">
            {(participants.data ?? []).map((participant) => (
              <option key={participant.id} value={participant.displayName} />
            ))}
          </datalist>
          <div className="participant-selector-status">
            {participantName.trim() ? (
              matchedParticipant ? (
                <TextMuted>Reusing {matchedParticipant.displayName}{matchedParticipant.sampleGroup ? ` / ${matchedParticipant.sampleGroup}` : ""}.</TextMuted>
              ) : (
                <TextMuted>New participant will be created on import.</TextMuted>
              )
            ) : (
              <TextMuted>Participant is optional, but helps filter evidence later.</TextMuted>
            )}
            {participantSuggestions.length > 0 && (
              <div className="badge-row">
                {participantSuggestions.map((participant) => (
                  <CodeBadge key={participant.id} tone={matchedParticipant?.id === participant.id ? "blue" : "gray"} selected={matchedParticipant?.id === participant.id} onClick={() => selectParticipant(participant)}>
                    {participant.displayName}
                  </CodeBadge>
                ))}
              </div>
            )}
          </div>
          <div className="compact-field-grid">
            <Input value={participantRole} onChange={(event) => setParticipantRole(event.target.value)} placeholder="Role" />
            <Input value={sampleGroup} onChange={(event) => setSampleGroup(event.target.value)} placeholder="Sample group" />
          </div>
          <TextMuted>Existing names are reused automatically; new names create a lightweight participant record.</TextMuted>
          <Textarea
            className="min-h-28"
            value={importTranscript}
            onChange={(event) => setImportTranscript(event.target.value)}
            placeholder={"Paste transcript, e.g.\nResearcher 00:00: How do you work?\nParticipant 00:10: I start by..."}
          />
          <Button disabled={!importName.trim() || !importTranscript.trim() || importInterview.isPending} onClick={() => importInterview.mutate()}>
            {importInterview.isPending ? "Importing..." : "Import transcript"}
          </Button>
          {importInterview.isPending && <TextMuted>Parsing speaker and timestamp lines into transcript paragraphs.</TextMuted>}
        </div>
        {(interviews.data ?? []).length ? (
          <div className="list-stack">
            {(interviews.data ?? []).map((item) => (
              <button key={item.id} type="button" className={`list-row clickable-row ${item.id === activeInterviewId ? "active-row" : ""}`} onClick={() => setSelectedInterviewId(item.id)}>
                <strong>{item.name}</strong>
                <TextMuted>{participantLabel(item)}</TextMuted>
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
          {activeInterview && (
            <div className="participant-strip">
              <CodeBadge tone="gray">{participantLabel(activeInterview)}</CodeBadge>
              {activeInterview.participant?.role && <CodeBadge tone="blue">{activeInterview.participant.role}</CodeBadge>}
              {activeInterview.participant?.tags?.slice(0, 2).map((tag) => <CodeBadge key={tag} tone="green">{tag}</CodeBadge>)}
            </div>
          )}
          <div className="progress-strip">
            <CodeBadge tone="blue">{paragraphs.data?.length ?? 0} paragraphs</CodeBadge>
            <CodeBadge tone="green">{codedParagraphCount} coded</CodeBadge>
            <CodeBadge tone="orange">{Math.max(0, (paragraphs.data?.length ?? 0) - codedParagraphCount)} uncoded</CodeBadge>
            <CodeBadge tone="purple">{activeAnnotations.length} highlights</CodeBadge>
          </div>
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
              <article
                className={`paragraph ${focusedParagraphId === paragraph.id ? "focused-paragraph" : ""}`}
                key={paragraph.id}
                ref={(node) => {
                  if (node) paragraphRefs.current.set(paragraph.id, node);
                  else paragraphRefs.current.delete(paragraph.id);
                }}
                onMouseUp={() => captureSelection(paragraph)}
              >
                <div className="paragraph-meta">
                  <strong>{paragraph.speaker ?? "Speaker"}</strong>
                  <span>{paragraph.startTime}</span>
                </div>
                <p>{renderParagraphText(paragraph)}</p>
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
      <PanelCard title="Coded contents" description="Saved codes stay aligned with transcript context." className="right-panel coded-sidebar">
        <div className="coded-content-list">
          {activeAnnotations.map((annotation) => (
            <button type="button" className="coded-content-card clickable-row" key={annotation.id} onClick={() => focusAnnotation(annotation)}>
              <div className="coded-content-meta">
                <span>{annotation.participant?.displayName ?? annotation.interviewName ?? annotation.paragraphs?.speaker ?? "Speaker"}</span>
                <span>{annotation.paragraphs?.startTime ?? ""}</span>
              </div>
              <p>{annotation.text}</p>
              {annotation.comment && <TextMuted>{annotation.comment}</TextMuted>}
              <div className="badge-row">
                {annotation.codeIds.map((id) => {
                  const code = codeMap.get(id);
                  return (
                    <CodeBadge key={id} tone={code ? codeToneMap.get(code.codeGroupId) : "gray"}>
                      {code?.name ?? id}
                    </CodeBadge>
                  );
                })}
              </div>
            </button>
          ))}
          {!activeAnnotations.length && (
            <EmptyState description="No coded content yet. Select text in the transcript and save codes from the floating picker." />
          )}
        </div>
      </PanelCard>
      {selectedText && popoverPosition && (
        <div
          className={`coding-popover ${popoverPosition.placement === "above" ? "placement-above" : "placement-below"}`}
          style={{ left: popoverPosition.left, top: popoverPosition.top }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && selectedParagraphId && selectedCodeIds.length && !saveAnnotation.isPending) {
              event.preventDefault();
              saveAnnotation.mutate();
            }
          }}
        >
          <div className="coding-popover-header">
            <strong>Code selection</strong>
            <Button size="icon-xs" variant="ghost" onClick={() => { setSelectedText(""); setSelectedCodeIds([]); setPopoverPosition(null); }}>
              ×
            </Button>
          </div>
          <p className="quote-preview">{selectedText}</p>
          {recommendations.data?.degraded && <InlineAlert>AI provider is unavailable. Showing rule-based fallback recommendations.</InlineAlert>}
          <Textarea value={annotationComment} onChange={(event) => setAnnotationComment(event.target.value)} placeholder="Research memo / why this quote matters" />
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
                <TextMuted>Keep the original quote for traceability; use this as memo wording if useful.</TextMuted>
                <Button size="sm" onClick={() => setAnnotationComment(improveText.data.text)}>Use as memo</Button>
              </div>
            </InlineAlert>
          )}
          <Input value={codeQuery} onChange={(event) => setCodeQuery(event.target.value)} placeholder="Search existing codes" />
          {recentCodes.length > 0 && (
            <>
              <TextMuted>Recent in this interview</TextMuted>
              <div className="badge-row">
                {recentCodes.map((code) => (
                  <CodeBadge
                    key={code.id}
                    selected={selectedCodeIds.includes(code.id)}
                    tone={selectedCodeIds.includes(code.id) ? "blue" : codeToneMap.get(code.codeGroupId)}
                    onClick={() => setSelectedCodeIds((ids) => (ids.includes(code.id) ? ids.filter((id) => id !== code.id) : [...ids, code.id]))}
                  >
                    {code.name}
                  </CodeBadge>
                ))}
              </div>
            </>
          )}
          <TextMuted>Existing codes</TextMuted>
          <div className="badge-row">
            {filteredCodes.slice(0, 12).map((code) => (
              <CodeBadge
                key={code.id}
                selected={selectedCodeIds.includes(code.id)}
                tone={selectedCodeIds.includes(code.id) ? "blue" : codeToneMap.get(code.codeGroupId)}
                onClick={() => setSelectedCodeIds((ids) => (ids.includes(code.id) ? ids.filter((id) => id !== code.id) : [...ids, code.id]))}
              >
                {code.name}
              </CodeBadge>
            ))}
            {!filteredCodes.length && codeQuery.trim() && (
              <CodeBadge tone="green" onClick={() => createCode.mutate(codeQuery.trim())}>
                + Create {codeQuery.trim()}
              </CodeBadge>
            )}
          </div>
          <TextMuted>Selected codes</TextMuted>
          <div className="badge-row">
            {selectedCodeIds.map((id) => (
              <CodeBadge key={id} onClose={() => setSelectedCodeIds((ids) => ids.filter((item) => item !== id))}>
                {codeMap.get(id)?.name ?? id}
              </CodeBadge>
            ))}
          </div>
          <TextMuted>AI recommendations from existing codes</TextMuted>
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
          <TextMuted>New code candidates from selected text</TextMuted>
          <div className="badge-row">
            {keywords.isPending && <CodeBadge tone="gray">Extracting keywords...</CodeBadge>}
            {(keywords.data?.keywords ?? []).map((keyword) => (
              <CodeBadge key={keyword} tone="green" onClick={() => createCode.mutate(keyword)}>
                + {keyword}
              </CodeBadge>
            ))}
          </div>
          <div className="coding-popover-actions">
            <Button variant="outline" onClick={() => { setSelectedText(""); setSelectedCodeIds([]); setPopoverPosition(null); }}>
              Cancel
            </Button>
            <Button disabled={!selectedParagraphId || !selectedCodeIds.length || saveAnnotation.isPending} onClick={() => saveAnnotation.mutate()}>
              Save annotation ⌘Enter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
