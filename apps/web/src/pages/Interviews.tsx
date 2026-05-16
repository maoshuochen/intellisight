import { Alert, Button, Card, Empty, Input, List, Message, Select, Space, Tag, Tooltip, Typography } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { Code, CodeGroup, Interview, Paragraph, RecommendCodesResponse, TextImproveResponse } from "@intellisight/shared";
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
    onError: (error) => Message.error(error.message)
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
    onError: (error) => Message.error(error.message)
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
    onError: (error) => Message.error(error.message)
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
      Message.success("Annotation saved");
      setSelectedText("");
      setSelectedCodeIds([]);
      void queryClient.invalidateQueries({ queryKey: ["annotations", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["codes", projectId] });
    },
    onError: (error) => Message.error(error.message)
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
      if (result.error) Message.error(result.error.message);
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
        <Empty description="Create or select a project first." />
      </div>
    );
  }

  return (
    <div className="page split-page">
      <Card className="left-panel" bordered={false}>
        <Typography.Title heading={4}>Interviews</Typography.Title>
        {(interviews.data ?? []).length ? (
          <List
            dataSource={interviews.data ?? []}
            render={(item) => (
              <List.Item className={item.id === activeInterviewId ? "active-row" : ""} onClick={() => setSelectedInterviewId(item.id)}>
                <List.Item.Meta title={item.name} description={item.participantName ?? item.sample ?? "Transcript"} />
              </List.Item>
            )}
          />
        ) : (
          <div className="empty-action">
            <Empty description="No interviews yet." />
            <Button type="primary" loading={createDemoInterview.isPending} onClick={() => createDemoInterview.mutate()}>
              Create demo interview
            </Button>
          </div>
        )}
      </Card>
      <Card className="transcript-panel" bordered={false}>
        <Space direction="vertical" size={16} className="full-width-space">
          <Typography.Title heading={4}>Transcript coding</Typography.Title>
          <Space wrap>
            <Input.Search placeholder="Search transcript" value={query} onChange={setQuery} allowClear style={{ width: 280 }} />
            <Select
              placeholder="Speaker"
              allowClear
              value={speaker}
              onChange={setSpeaker}
              style={{ width: 180 }}
              options={speakers.map((item) => ({ label: item, value: item }))}
            />
          </Space>
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
            {!filteredParagraphs.length && <Empty description="No transcript paragraphs match the current filters." />}
          </div>
        </Space>
      </Card>
      <Card className="right-panel" bordered={false}>
        <Typography.Title heading={4}>AI coding</Typography.Title>
        {selectedText ? (
          <Space direction="vertical" className="full-width-space">
            <Typography.Paragraph ellipsis={{ rows: 4, expandable: true }}>{selectedText}</Typography.Paragraph>
            {recommendations.data?.degraded && <Alert type="warning" content="AI provider is unavailable. Showing rule-based fallback recommendations." />}
            <Space>
              <Button size="small" loading={improveText.isPending} onClick={() => improveText.mutate("correct")}>
                Correct text
              </Button>
              <Button size="small" loading={improveText.isPending} onClick={() => improveText.mutate("simplify")}>
                Simplify
              </Button>
            </Space>
            {improveText.data && (
              <Alert
                type={improveText.data.degraded ? "warning" : "info"}
                content={
                  <Space direction="vertical" className="full-width-space">
                    <Typography.Text>{improveText.data.text}</Typography.Text>
                    <Typography.Text type="secondary">{improveText.data.reason}</Typography.Text>
                    <Button size="mini" type="primary" onClick={() => setSelectedText(improveText.data.text)}>
                      Use this text
                    </Button>
                  </Space>
                }
              />
            )}
            <Typography.Text type="secondary">Selected codes</Typography.Text>
            <Space wrap>
              {selectedCodeIds.map((id) => (
                <Tag key={id} closable onClose={() => setSelectedCodeIds((ids) => ids.filter((item) => item !== id))}>
                  {codeMap.get(id)?.name ?? id}
                </Tag>
              ))}
            </Space>
            <Typography.Text type="secondary">Recommendations</Typography.Text>
            <Space wrap>
              {recommendations.isPending && <Tag>Loading recommendations...</Tag>}
              {(recommendations.data?.recommendations ?? []).map((item) => (
                <Tooltip key={item.id ?? item.label} content={`${Math.round(item.score * 100)}% · ${item.reason}`}>
                  <Tag
                    color={selectedCodeIds.includes(item.id ?? "") ? "arcoblue" : "gray"}
                    onClick={() => item.id && setSelectedCodeIds((ids) => (ids.includes(item.id!) ? ids.filter((id) => id !== item.id) : [...ids, item.id!]))}
                  >
                    {item.label}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
            <Typography.Text type="secondary">New code candidates</Typography.Text>
            <Space wrap>
              {keywords.isPending && <Tag>Extracting keywords...</Tag>}
              {(keywords.data?.keywords ?? []).map((keyword) => (
                <Tag key={keyword} color="green" onClick={() => createCode.mutate(keyword)}>
                  + {keyword}
                </Tag>
              ))}
            </Space>
            <Button type="primary" disabled={!selectedParagraphId || !selectedCodeIds.length} loading={saveAnnotation.isPending} onClick={() => saveAnnotation.mutate()}>
              Save annotation
            </Button>
          </Space>
        ) : (
          <Typography.Text type="secondary">Select text in the transcript to get code recommendations.</Typography.Text>
        )}
      </Card>
    </div>
  );
}
