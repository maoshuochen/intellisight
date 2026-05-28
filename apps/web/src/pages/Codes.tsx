import { ArrowLeftIcon, ArrowRightIcon, EditIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Annotation, Code, CodeGroup } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeBadge, ColorSwatchPicker, EmptyState, OptionSelect, PageTitle, TextMuted } from "@/components/ui/app-kit";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

const colorOptions = ["blue", "green", "orange", "purple", "red", "gray"];

export function Codes() {
  const projectId = useAppStore((state) => state.projectId);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string | undefined>();
  const [newGroupName, setNewGroupName] = useState("");
  const [renamingCodeId, setRenamingCodeId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [definitionValue, setDefinitionValue] = useState("");
  const [selectedEvidenceCodeId, setSelectedEvidenceCodeId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const enabled = Boolean(projectId);

  const groups = useQuery({
    queryKey: ["code-groups", projectId],
    enabled,
    queryFn: () => api.get<CodeGroup[]>(`/code-groups?projectId=${projectId}`)
  });
  const codes = useQuery({
    queryKey: ["codes", projectId],
    enabled,
    queryFn: () => api.get<Code[]>(`/codes?projectId=${projectId}`)
  });
  const annotations = useQuery({
    queryKey: ["annotations", projectId],
    enabled,
    queryFn: () => api.get<Array<Annotation & { interviewName?: string; paragraphs?: { speaker?: string | null; startTime?: string | null; text?: string } }>>(`/annotations?projectId=${projectId}`)
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["codes", projectId] });
    void queryClient.invalidateQueries({ queryKey: ["code-groups", projectId] });
  };

  const createGroup = useMutation({
    mutationFn: () => api.post<CodeGroup>("/code-groups", { projectId, name: newGroupName, color: "blue" }),
    onSuccess: () => {
      setNewGroupName("");
      invalidate();
    },
    onError: (error) => toast.error(error.message)
  });

  const updateGroup = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<CodeGroup, "color" | "name">> }) => api.patch<CodeGroup>(`/code-groups/${id}`, patch),
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message)
  });

  const createCode = useMutation({
    mutationFn: () =>
      api.post<Code>("/codes", {
        projectId,
        codeGroupId: groupId ?? groups.data?.[0]?.id,
        name
      }),
    onSuccess: () => {
      setName("");
      invalidate();
    },
    onError: (error) => toast.error(error.message)
  });

  const updateCode = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Code, "name" | "codeGroupId" | "definition">> }) => api.patch<Code>(`/codes/${id}`, patch),
    onSuccess: () => {
      setRenamingCodeId(null);
      setRenameValue("");
      setDefinitionValue("");
      invalidate();
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteCode = useMutation({
    mutationFn: (id: string) => api.delete(`/codes/${id}`),
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message)
  });

  const groupedCodes = useMemo(() => {
    const map = new Map<string, Code[]>();
    for (const group of groups.data ?? []) map.set(group.id, []);
    for (const code of codes.data ?? []) map.get(code.codeGroupId)?.push(code);
    return map;
  }, [codes.data, groups.data]);
  const selectedEvidenceCode = codes.data?.find((code) => code.id === selectedEvidenceCodeId) ?? codes.data?.[0];
  const selectedEvidence = useMemo(
    () => (annotations.data ?? []).filter((annotation) => selectedEvidenceCode?.id && annotation.codeIds.includes(selectedEvidenceCode.id)),
    [annotations.data, selectedEvidenceCode?.id]
  );

  useEffect(() => {
    if (!groupId && groups.data?.[0]) setGroupId(groups.data[0].id);
  }, [groupId, groups.data]);

  if (!projectId) return <EmptyState description="Create or select a project first." />;

  return (
    <div className="page">
      <PageTitle title="Codes" description="Manage the project codebook and move codes between groups." />
      <div className="code-workspace">
      <Card>
        <CardContent>
        <div className="toolbar">
          <Input className="w-[220px]" placeholder="New code" value={name} onChange={(event) => setName(event.target.value)} />
          <OptionSelect
            placeholder="Group"
            value={groupId}
            onChange={setGroupId}
            options={(groups.data ?? []).map((group) => ({ label: group.name, value: group.id }))}
            className="w-[180px]"
          />
          <Button disabled={!name.trim() || !(groupId ?? groups.data?.[0]?.id) || createCode.isPending} onClick={() => createCode.mutate()}>
            <PlusIcon data-icon="inline-start" />
            Add code
          </Button>
          <Input className="w-[180px]" placeholder="New group" value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} />
          <Button variant="outline" disabled={!newGroupName || createGroup.isPending} onClick={() => createGroup.mutate()}>
            <PlusIcon data-icon="inline-start" />
            Add group
          </Button>
        </div>
        <div className="code-board">
          {(groups.data ?? []).map((group, groupIndex) => {
            const previousGroup = groups.data?.[groupIndex - 1];
            const nextGroup = groups.data?.[groupIndex + 1];
            return (
              <section className="code-column" key={group.id}>
                <div className="code-column-header">
                  <CodeBadge tone={group.color}>{group.name}</CodeBadge>
                  <ColorSwatchPicker value={group.color} options={colorOptions} onChange={(color) => updateGroup.mutate({ id: group.id, patch: { color } })} />
                </div>
                <div className="flex flex-col gap-2">
                  {(groupedCodes.get(group.id) ?? []).map((code) => (
                    <div className="code-card" key={code.id}>
                      {renamingCodeId === code.id ? (
                        <div className="code-edit-form">
                          <Input
                            autoFocus
                            value={renameValue}
                            onChange={(event) => setRenameValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") updateCode.mutate({ id: code.id, patch: { name: renameValue, definition: definitionValue || null } });
                            }}
                          />
                          <Input value={definitionValue} onChange={(event) => setDefinitionValue(event.target.value)} placeholder="Definition / memo" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateCode.mutate({ id: code.id, patch: { name: renameValue, definition: definitionValue || null } })}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setRenamingCodeId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span>{code.name}</span>
                          {code.definition && <TextMuted className="code-definition">{code.definition}</TextMuted>}
                        </div>
                      )}
                      <div className="code-actions">
                        <CodeBadge tone="gray">{code.usage}</CodeBadge>
                        <IconButtonTip label={`Move ${code.name} to previous group`}>
                          <Button aria-label={`Move ${code.name} to previous group`} size="icon-xs" variant="ghost" disabled={!previousGroup} onClick={() => previousGroup && updateCode.mutate({ id: code.id, patch: { codeGroupId: previousGroup.id } })}><ArrowLeftIcon /></Button>
                        </IconButtonTip>
                        <IconButtonTip label={`Move ${code.name} to next group`}>
                          <Button aria-label={`Move ${code.name} to next group`} size="icon-xs" variant="ghost" disabled={!nextGroup} onClick={() => nextGroup && updateCode.mutate({ id: code.id, patch: { codeGroupId: nextGroup.id } })}><ArrowRightIcon /></Button>
                        </IconButtonTip>
                        <IconButtonTip label={`Edit ${code.name}`}>
                          <Button aria-label={`Edit ${code.name}`} size="icon-xs" variant="ghost" onClick={() => { setRenamingCodeId(code.id); setRenameValue(code.name); setDefinitionValue(code.definition ?? ""); }}><EditIcon /></Button>
                        </IconButtonTip>
                        <Button size="icon-xs" variant="outline" onClick={() => setSelectedEvidenceCodeId(code.id)}>Evidence</Button>
                        <IconButtonTip label={`Delete ${code.name}`}>
                          <Button aria-label={`Delete ${code.name}`} size="icon-xs" variant="destructive" onClick={() => deleteCode.mutate(code.id)}><TrashIcon /></Button>
                        </IconButtonTip>
                      </div>
                    </div>
                  ))}
                  {!(groupedCodes.get(group.id) ?? []).length && <TextMuted className="code-empty-hint">No codes in this group yet.</TextMuted>}
                </div>
              </section>
            );
          })}
        </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <strong>{selectedEvidenceCode?.name ?? "Code evidence"}</strong>
            <TextMuted>{selectedEvidence.length} saved highlights use this code.</TextMuted>
          </div>
          {selectedEvidenceCode && selectedEvidence.length > 0 && (
            <Button variant="outline" size="sm" render={<Link to={`/highlights?codeId=${selectedEvidenceCode.id}`} />}>
              View all in Highlights
            </Button>
          )}
          <div className="list-stack">
            {selectedEvidence.map((annotation) => (
              <div key={annotation.id} className="list-row">
                <strong>{annotation.text}</strong>
                <TextMuted>{annotation.interviewName ?? "Interview"} · {annotation.paragraphs?.speaker ?? "Speaker"} {annotation.paragraphs?.startTime ?? ""}</TextMuted>
                {annotation.comment && <TextMuted>{annotation.comment}</TextMuted>}
              </div>
            ))}
            {!selectedEvidence.length && <EmptyState description="Select a code with saved highlights to review its supporting evidence." />}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function IconButtonTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
