import { Button, Card, Input, Select, Space, Table, Tag, Typography } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Code, CodeGroup } from "@intellisight/shared";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

export function Codes() {
  const projectId = useAppStore((state) => state.projectId);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string | undefined>();
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

  const createCode = useMutation({
    mutationFn: () =>
      api.post<Code>("/codes", {
        projectId,
        codeGroupId: groupId ?? groups.data?.[0]?.id,
        name
      }),
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["codes", projectId] });
    }
  });

  return (
    <div className="page">
      <Typography.Title heading={3}>Codes</Typography.Title>
      <Card bordered={false}>
        <Space className="toolbar">
          <Input placeholder="New code" value={name} onChange={setName} />
          <Select
            placeholder="Group"
            value={groupId}
            onChange={setGroupId}
            options={(groups.data ?? []).map((group) => ({ label: group.name, value: group.id }))}
            style={{ width: 180 }}
          />
          <Button type="primary" disabled={!name || !(groupId ?? groups.data?.[0]?.id)} loading={createCode.isPending} onClick={() => createCode.mutate()}>
            Add code
          </Button>
        </Space>
        <Table
          rowKey="id"
          pagination={false}
          data={codes.data ?? []}
          columns={[
            { title: "Name", dataIndex: "name" },
            {
              title: "Group",
              render: (_, record) => {
                const group = groups.data?.find((item) => item.id === record.codeGroupId);
                return <Tag color={group?.color ?? "blue"}>{group?.name ?? "Ungrouped"}</Tag>;
              }
            },
            { title: "Usage", dataIndex: "usage" },
            { title: "Owner", dataIndex: "owner" }
          ]}
        />
      </Card>
    </div>
  );
}
