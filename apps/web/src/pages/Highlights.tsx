import { Card, Input, List, Space, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { Annotation } from "@intellisight/shared";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

export function Highlights() {
  const projectId = useAppStore((state) => state.projectId);
  const [keyword, setKeyword] = useState("");
  const annotations = useQuery({
    queryKey: ["annotations", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<Annotation[]>(`/annotations?projectId=${projectId}`)
  });
  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return annotations.data ?? [];
    return (annotations.data ?? []).filter((annotation) => annotation.text.toLowerCase().includes(needle));
  }, [annotations.data, keyword]);

  return (
    <div className="page">
      <Typography.Title heading={3}>Highlights</Typography.Title>
      <Card bordered={false}>
        <Space direction="vertical" className="full-width-space">
          <Input.Search placeholder="Filter highlights" value={keyword} onChange={setKeyword} />
          <List
            dataSource={filtered}
            render={(item) => (
              <List.Item>
                <List.Item.Meta title={item.text} description={`Codes: ${item.codeIds.length} · ${new Date(item.createdAt).toLocaleString()}`} />
              </List.Item>
            )}
          />
        </Space>
      </Card>
    </div>
  );
}
