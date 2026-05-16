import { Button, Card, Empty, Input, Message, Select, Space, Tag, Typography } from "@arco-design/web-react";
import { IconArrowLeft, IconArrowRight, IconDelete, IconEdit, IconPlus } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { Code, CodeGroup } from "@intellisight/shared";
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
    onError: (error) => Message.error(error.message)
  });

  const updateGroup = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<CodeGroup, "color" | "name">> }) => api.patch<CodeGroup>(`/code-groups/${id}`, patch),
    onSuccess: invalidate,
    onError: (error) => Message.error(error.message)
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
    onError: (error) => Message.error(error.message)
  });

  const updateCode = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Code, "name" | "codeGroupId">> }) => api.patch<Code>(`/codes/${id}`, patch),
    onSuccess: () => {
      setRenamingCodeId(null);
      setRenameValue("");
      invalidate();
    },
    onError: (error) => Message.error(error.message)
  });

  const deleteCode = useMutation({
    mutationFn: (id: string) => api.delete(`/codes/${id}`),
    onSuccess: invalidate,
    onError: (error) => Message.error(error.message)
  });

  const groupedCodes = useMemo(() => {
    const map = new Map<string, Code[]>();
    for (const group of groups.data ?? []) map.set(group.id, []);
    for (const code of codes.data ?? []) map.get(code.codeGroupId)?.push(code);
    return map;
  }, [codes.data, groups.data]);

  if (!projectId) return <Empty description="Create or select a project first." />;

  return (
    <div className="page">
      <Typography.Title heading={3}>Codes</Typography.Title>
      <Card bordered={false}>
        <Space className="toolbar" wrap>
          <Input placeholder="New code" value={name} onChange={setName} style={{ width: 220 }} />
          <Select
            placeholder="Group"
            value={groupId}
            onChange={setGroupId}
            options={(groups.data ?? []).map((group) => ({ label: group.name, value: group.id }))}
            style={{ width: 180 }}
          />
          <Button type="primary" icon={<IconPlus />} disabled={!name || !(groupId ?? groups.data?.[0]?.id)} loading={createCode.isPending} onClick={() => createCode.mutate()}>
            Add code
          </Button>
          <Input placeholder="New group" value={newGroupName} onChange={setNewGroupName} style={{ width: 180 }} />
          <Button icon={<IconPlus />} disabled={!newGroupName} loading={createGroup.isPending} onClick={() => createGroup.mutate()}>
            Add group
          </Button>
        </Space>
        <div className="code-board">
          {(groups.data ?? []).map((group, groupIndex) => {
            const previousGroup = groups.data?.[groupIndex - 1];
            const nextGroup = groups.data?.[groupIndex + 1];
            return (
              <section className="code-column" key={group.id}>
                <div className="code-column-header">
                  <Tag color={group.color}>{group.name}</Tag>
                  <Select
                    size="mini"
                    value={group.color}
                    onChange={(color) => updateGroup.mutate({ id: group.id, patch: { color } })}
                    options={colorOptions.map((color) => ({ label: color, value: color }))}
                    style={{ width: 100 }}
                  />
                </div>
                <Space direction="vertical" className="full-width-space">
                  {(groupedCodes.get(group.id) ?? []).map((code) => (
                    <div className="code-card" key={code.id}>
                      {renamingCodeId === code.id ? (
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={setRenameValue}
                          onPressEnter={() => updateCode.mutate({ id: code.id, patch: { name: renameValue } })}
                        />
                      ) : (
                        <Typography.Text>{code.name}</Typography.Text>
                      )}
                      <Space size={4}>
                        <Tag>{code.usage}</Tag>
                        <Button size="mini" icon={<IconArrowLeft />} disabled={!previousGroup} onClick={() => previousGroup && updateCode.mutate({ id: code.id, patch: { codeGroupId: previousGroup.id } })} />
                        <Button size="mini" icon={<IconArrowRight />} disabled={!nextGroup} onClick={() => nextGroup && updateCode.mutate({ id: code.id, patch: { codeGroupId: nextGroup.id } })} />
                        <Button size="mini" icon={<IconEdit />} onClick={() => { setRenamingCodeId(code.id); setRenameValue(code.name); }} />
                        <Button size="mini" status="danger" icon={<IconDelete />} onClick={() => deleteCode.mutate(code.id)} />
                      </Space>
                    </div>
                  ))}
                </Space>
              </section>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
