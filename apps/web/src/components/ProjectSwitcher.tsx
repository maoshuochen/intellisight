import { Button, Input, Select, Space, Spin, Trigger } from "@arco-design/web-react";
import { IconPlus } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Project } from "@intellisight/shared";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

export function ProjectSwitcher() {
  const queryClient = useQueryClient();
  const projectId = useAppStore((state) => state.projectId);
  const setProjectId = useAppStore((state) => state.setProjectId);
  const [name, setName] = useState("");

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<Project[]>("/projects")
  });

  const createProject = useMutation({
    mutationFn: () => api.post<Project>("/projects", { name }),
    onSuccess: (project) => {
      setProjectId(project.id);
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });

  if (projectsQuery.isLoading) return <Spin className="project-spin" />;

  const projects = projectsQuery.data ?? [];
  if (!projectId && projects[0]) setProjectId(projects[0].id);

  return (
    <Space className="project-switcher" direction="vertical" size={8}>
      <Select
        placeholder="Select project"
        value={projectId ?? undefined}
        onChange={(value) => setProjectId(value)}
        options={projects.map((project) => ({ label: project.name, value: project.id }))}
      />
      <Trigger
        trigger="click"
        popup={() => (
          <div className="popover-panel">
            <Space>
              <Input placeholder="Project name" value={name} onChange={setName} />
              <Button type="primary" disabled={!name} loading={createProject.isPending} onClick={() => createProject.mutate()}>
                Create
              </Button>
            </Space>
          </div>
        )}
      >
        <Button icon={<IconPlus />} long>
          New project
        </Button>
      </Trigger>
    </Space>
  );
}
