import { Card, Empty, Input, List, Select, Space, Tag, Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Annotation, Code, Interview } from "@intellisight/shared";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

type HighlightAnnotation = Annotation & {
  paragraphs?: {
    speaker?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    text?: string;
  };
};

export function Highlights() {
  const projectId = useAppStore((state) => state.projectId);
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [codeId, setCodeId] = useState<string | undefined>();
  const [speaker, setSpeaker] = useState<string | undefined>();
  const annotations = useQuery({
    queryKey: ["annotations", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<HighlightAnnotation[]>(`/annotations?projectId=${projectId}`)
  });
  const codes = useQuery({
    queryKey: ["codes", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<Code[]>(`/codes?projectId=${projectId}`)
  });
  const interviews = useQuery({
    queryKey: ["interviews", projectId],
    enabled: Boolean(projectId),
    queryFn: () => api.get<Interview[]>(`/interviews?projectId=${projectId}`)
  });
  const speakers = useMemo(
    () => [...new Set((annotations.data ?? []).map((annotation) => annotation.paragraphs?.speaker).filter((item): item is string => Boolean(item)))],
    [annotations.data]
  );
  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return (annotations.data ?? []).filter((annotation) => {
      const matchesText = !needle || annotation.text.toLowerCase().includes(needle) || annotation.paragraphs?.text?.toLowerCase().includes(needle);
      const matchesCode = !codeId || annotation.codeIds.includes(codeId);
      const matchesSpeaker = !speaker || annotation.paragraphs?.speaker === speaker;
      return matchesText && matchesCode && matchesSpeaker;
    });
  }, [annotations.data, codeId, keyword, speaker]);

  if (!projectId) return <Empty description="Create or select a project first." />;

  return (
    <div className="page">
      <Typography.Title heading={3}>Highlights</Typography.Title>
      <Card bordered={false}>
        <Space direction="vertical" className="full-width-space">
          <Space wrap>
            <Input.Search placeholder="Filter highlights or context" value={keyword} onChange={setKeyword} allowClear style={{ width: 280 }} />
            <Select
              placeholder="Code"
              allowClear
              value={codeId}
              onChange={setCodeId}
              options={(codes.data ?? []).map((code) => ({ label: code.name, value: code.id }))}
              style={{ width: 200 }}
            />
            <Select
              placeholder="Speaker"
              allowClear
              value={speaker}
              onChange={setSpeaker}
              options={speakers.map((item) => ({ label: item, value: item }))}
              style={{ width: 180 }}
            />
          </Space>
          <List
            dataSource={filtered}
            render={(item) => (
              <List.Item className="clickable-row" onClick={() => navigate("/interviews")}>
                <List.Item.Meta
                  title={item.text}
                  description={
                    <Space direction="vertical" size={4}>
                      <Typography.Text type="secondary">
                        {item.paragraphs?.speaker ?? "Speaker"} · {item.paragraphs?.startTime ?? ""} · Codes: {item.codeIds.length} · {new Date(item.createdAt).toLocaleString()}
                      </Typography.Text>
                      <Typography.Text type="secondary" ellipsis={{ rows: 2 }}>
                        {item.paragraphs?.text ?? "No context available"}
                      </Typography.Text>
                      <Space wrap>
                        {item.codeIds.map((id) => {
                          const code = codes.data?.find((candidate) => candidate.id === id);
                          return <Tag key={id}>{code?.name ?? id}</Tag>;
                        })}
                        {interviews.data?.[0] && <Tag color="arcoblue">{interviews.data[0].name}</Tag>}
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Space>
      </Card>
    </div>
  );
}
