import { Button, Card, Empty, Input, List, Message, Space, Tag, Typography } from "@arco-design/web-react";
import { IconArrowDown, IconArrowUp, IconDelete, IconPlus } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { Outline, OutlineQuestion } from "@intellisight/shared";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

type DraftQuestion = Partial<Pick<OutlineQuestion, "id">> & Pick<OutlineQuestion, "content" | "tags" | "sortOrder">;

const questionLibrary = [
  "What is the hardest part of your current workflow?",
  "Can you walk me through the last time this happened?",
  "What tools do you currently use to solve this?",
  "What would make this process feel easier?",
  "How do you decide whether a finding is important?"
];

export function Outlines() {
  const projectId = useAppStore((state) => state.projectId);
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("Interview outline");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const outlines = useQuery({
    queryKey: ["outlines", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<Outline[]>(`/outlines?projectId=${projectId}`)
  });
  const activeOutline = useMemo(() => outlines.data?.find((outline) => outline.id === (activeId ?? outlines.data?.[0]?.id)), [activeId, outlines.data]);

  useEffect(() => {
    if (!activeOutline) return;
    setActiveId(activeOutline.id);
    setDraftName(activeOutline.name);
    setQuestions(activeOutline.questions.map((question, index) => ({ ...question, sortOrder: index })));
  }, [activeOutline]);

  const createOutline = useMutation({
    mutationFn: () => api.post<Outline>("/outlines", { projectId, name: "New outline" }),
    onSuccess: (outline) => {
      setActiveId(outline.id);
      void queryClient.invalidateQueries({ queryKey: ["outlines", projectId] });
    }
  });

  const saveQuestions = useMutation({
    mutationFn: async () => {
      await api.patch(`/outlines/${activeOutline?.id}`, { name: draftName });
      return api.put<Outline>(`/outlines/${activeOutline?.id}/questions`, {
        questions: questions.map((question, index) => ({ ...question, sortOrder: index }))
      });
    },
    onSuccess: () => {
      Message.success("Outline saved");
      void queryClient.invalidateQueries({ queryKey: ["outlines", projectId] });
    },
    onError: (error) => Message.error(error.message)
  });

  function addQuestion(content = "") {
    setQuestions((items) => [...items, { content: content || "New interview question", tags: [] as string[], sortOrder: items.length }]);
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions((items) => {
      const next = [...items];
      const target = index + direction;
      if (target < 0 || target >= next.length) return items;
      const current = next[index];
      const other = next[target];
      if (!current || !other) return items;
      next[index] = other;
      next[target] = current;
      return next;
    });
  }

  if (!projectId) return <Empty description="Create or select a project first." />;

  return (
    <div className="page split-page outline-page">
      <Card className="left-panel" bordered={false}>
        <Space direction="vertical" className="full-width-space">
          <Typography.Title heading={4}>Outlines</Typography.Title>
          <Button icon={<IconPlus />} type="primary" long loading={createOutline.isPending} onClick={() => createOutline.mutate()}>
            New outline
          </Button>
          <List
            dataSource={outlines.data ?? []}
            render={(item) => (
              <List.Item className={item.id === activeOutline?.id ? "active-row" : ""} onClick={() => setActiveId(item.id)}>
                <List.Item.Meta title={item.name} description={`${item.questions.length} questions`} />
              </List.Item>
            )}
          />
        </Space>
      </Card>
      <Card className="transcript-panel" bordered={false}>
        {activeOutline ? (
          <Space direction="vertical" className="full-width-space" size={16}>
            <Space className="toolbar">
              <Input value={draftName} onChange={setDraftName} style={{ width: 280 }} />
              <Button icon={<IconPlus />} onClick={() => addQuestion()}>
                Add question
              </Button>
              <Button type="primary" loading={saveQuestions.isPending} onClick={() => saveQuestions.mutate()}>
                Save questions
              </Button>
            </Space>
            {questions.map((question, index) => (
              <div className="outline-question" key={question.id ?? `${question.content}-${index}`}>
                <Tag color="arcoblue">Q{index + 1}</Tag>
                <Input.TextArea
                  autoSize
                  value={question.content}
                  onChange={(content) => setQuestions((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, content } : item)))}
                />
                <Space>
                  <Button icon={<IconArrowUp />} disabled={index === 0} onClick={() => moveQuestion(index, -1)} />
                  <Button icon={<IconArrowDown />} disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} />
                  <Button status="danger" icon={<IconDelete />} onClick={() => setQuestions((items) => items.filter((_, itemIndex) => itemIndex !== index))} />
                </Space>
              </div>
            ))}
          </Space>
        ) : (
          <Empty description="No outlines yet." />
        )}
      </Card>
      <Card className="right-panel" bordered={false}>
        <Typography.Title heading={4}>Question library</Typography.Title>
        <Space direction="vertical" className="full-width-space">
          {questionLibrary.map((question) => (
            <Button key={question} long onClick={() => addQuestion(question)}>
              {question}
            </Button>
          ))}
        </Space>
      </Card>
    </div>
  );
}
