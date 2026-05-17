import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Outline, OutlineQuestion } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CodeBadge, EmptyState, PageTitle, PanelCard, TextMuted } from "@/components/ui/app-kit";
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
      toast.success("Outline saved");
      void queryClient.invalidateQueries({ queryKey: ["outlines", projectId] });
    },
    onError: (error) => toast.error(error.message)
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

  if (!projectId) return <EmptyState description="Create or select a project first." />;

  return (
    <div className="page split-page outline-page">
      <PanelCard title="Outlines" className="left-panel">
        <div className="flex flex-col gap-3">
          <Button disabled={createOutline.isPending} onClick={() => createOutline.mutate()}>
            <PlusIcon data-icon="inline-start" />
            New outline
          </Button>
          <div className="list-stack">
            {(outlines.data ?? []).map((item) => (
              <button key={item.id} type="button" className={`list-row clickable-row ${item.id === activeOutline?.id ? "active-row" : ""}`} onClick={() => setActiveId(item.id)}>
                <strong>{item.name}</strong>
                <TextMuted>{item.questions.length} questions</TextMuted>
              </button>
            ))}
          </div>
        </div>
      </PanelCard>
      <PanelCard className="transcript-panel">
        {activeOutline ? (
          <div className="flex flex-col gap-4">
            <PageTitle title="Interview outline" />
            <div className="toolbar">
              <Input className="w-[280px]" value={draftName} onChange={(event) => setDraftName(event.target.value)} />
              <Button variant="outline" onClick={() => addQuestion()}>
                <PlusIcon data-icon="inline-start" />
                Add question
              </Button>
              <Button disabled={saveQuestions.isPending} onClick={() => saveQuestions.mutate()}>
                Save questions
              </Button>
            </div>
            {questions.map((question, index) => (
              <div className="outline-question" key={question.id ?? `${question.content}-${index}`}>
                <CodeBadge tone="blue">Q{index + 1}</CodeBadge>
                <Textarea
                  value={question.content}
                  onChange={(event) => setQuestions((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, content: event.target.value } : item)))}
                />
                <div className="code-actions">
                  <Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => moveQuestion(index, -1)}><ArrowUpIcon /></Button>
                  <Button size="icon-sm" variant="ghost" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)}><ArrowDownIcon /></Button>
                  <Button size="icon-sm" variant="destructive" onClick={() => setQuestions((items) => items.filter((_, itemIndex) => itemIndex !== index))}><TrashIcon /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            description="No outlines yet."
            action={
              <Button onClick={() => createOutline.mutate()} disabled={createOutline.isPending}>
                Create outline
              </Button>
            }
          />
        )}
      </PanelCard>
      <PanelCard title="Question library" className="right-panel">
        <div className="flex flex-col gap-2">
          <Button variant="outline" render={<Link to="/interviews" />}>
            Use in interviews
          </Button>
          {questionLibrary.map((question) => (
            <Button key={question} variant="outline" className="h-auto justify-start whitespace-normal py-2 text-left" onClick={() => addQuestion(question)}>
              {question}
            </Button>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
