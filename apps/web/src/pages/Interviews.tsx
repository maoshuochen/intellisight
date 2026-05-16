import { Button, Card, Input, List, Message, Space, Tag, Typography } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { Code, Interview, Paragraph, RecommendCodesResponse } from "@intellisight/shared";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

export function Interviews() {
  const projectId = useAppStore((state) => state.projectId);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(null);
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([]);
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
  const recommendations = useMutation({
    mutationFn: (text: string) =>
      api.post<RecommendCodesResponse>("/ai/codes/recommend", {
        projectId,
        text,
        candidateCodes: (codes.data ?? []).map((code) => ({ id: code.id, name: code.name }))
      })
  });
  const saveAnnotation = useMutation({
    mutationFn: () =>
      api.post("/annotations", {
        projectId,
        paragraphId: selectedParagraphId,
        text: selectedText,
        startOffset: 0,
        endOffset: selectedText.length,
        codeIds: selectedCodeIds
      }),
    onSuccess: () => {
      Message.success("Annotation saved");
      setSelectedText("");
      setSelectedCodeIds([]);
      void queryClient.invalidateQueries({ queryKey: ["annotations", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["codes", projectId] });
    }
  });

  const codeMap = useMemo(() => new Map((codes.data ?? []).map((code) => [code.id, code])), [codes.data]);

  function captureSelection(paragraph: Paragraph) {
    const text = window.getSelection()?.toString().trim() ?? "";
    if (!text) return;
    setSelectedParagraphId(paragraph.id);
    setSelectedText(text);
    setSelectedCodeIds([]);
    recommendations.mutate(text);
  }

  return (
    <div className="page split-page">
      <Card className="left-panel" bordered={false}>
        <Typography.Title heading={4}>Interviews</Typography.Title>
        <List
          dataSource={interviews.data ?? []}
          render={(item) => (
            <List.Item className={item.id === activeInterviewId ? "active-row" : ""} onClick={() => setSelectedInterviewId(item.id)}>
              <List.Item.Meta title={item.name} description={item.participantName ?? item.sample ?? "Transcript"} />
            </List.Item>
          )}
        />
      </Card>
      <Card className="transcript-panel" bordered={false}>
        <Space direction="vertical" size={16} className="full-width-space">
          <Typography.Title heading={4}>Transcript coding</Typography.Title>
          <Input.Search placeholder="Search transcript" />
          <div className="paragraph-list">
            {(paragraphs.data ?? []).map((paragraph) => (
              <article className="paragraph" key={paragraph.id} onMouseUp={() => captureSelection(paragraph)}>
                <div className="paragraph-meta">
                  <strong>{paragraph.speaker ?? "Speaker"}</strong>
                  <span>{paragraph.startTime}</span>
                </div>
                <p>{paragraph.text}</p>
              </article>
            ))}
          </div>
        </Space>
      </Card>
      <Card className="right-panel" bordered={false}>
        <Typography.Title heading={4}>AI coding</Typography.Title>
        {selectedText ? (
          <Space direction="vertical" className="full-width-space">
            <Typography.Paragraph ellipsis={{ rows: 4, expandable: true }}>{selectedText}</Typography.Paragraph>
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
              {(recommendations.data?.recommendations ?? []).map((item) => (
                <Tag
                  key={item.id ?? item.label}
                  color={selectedCodeIds.includes(item.id ?? "") ? "arcoblue" : "gray"}
                  onClick={() => item.id && setSelectedCodeIds((ids) => (ids.includes(item.id!) ? ids.filter((id) => id !== item.id) : [...ids, item.id!]))}
                >
                  {item.label}
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
