import { PlusIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Project } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, InlineAlert, OptionSelect } from "@/components/ui/app-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

export function ProjectSwitcher() {
  const queryClient = useQueryClient();
  const projectId = useAppStore((state) => state.projectId);
  const setProjectId = useAppStore((state) => state.setProjectId);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<Project[]>("/projects")
  });

  const createProject = useMutation({
    mutationFn: () => api.post<Project>("/projects", { name }),
    onSuccess: (project) => {
      setProjectId(project.id);
      setName("");
      setIsCreating(false);
      toast.success("Project created");
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => toast.error(error.message)
  });

  const projects = projectsQuery.data ?? [];

  useEffect(() => {
    if (!projectId && projects[0]) setProjectId(projects[0].id);
  }, [projectId, projects, setProjectId]);

  if (projectsQuery.isLoading) return <Skeleton className="project-spin h-8" />;
  if (projectsQuery.error) {
    return (
      <div className="project-alert">
        <InlineAlert variant="destructive">{projectsQuery.error.message}</InlineAlert>
      </div>
    );
  }

  return (
    <div className="project-switcher">
      <OptionSelect
        placeholder="Select project"
        value={projectId ?? undefined}
        options={projects.map((project) => ({ label: project.name, value: project.id }))}
        onChange={(value) => setProjectId(value ?? null)}
        className="w-full"
      />
      {!projects.length && <EmptyState description="No projects yet" />}
      {isCreating ? (
        <div className="project-create-panel">
          <Input
            autoFocus
            placeholder="Project name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim()) createProject.mutate();
              if (event.key === "Escape") setIsCreating(false);
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={!name.trim() || createProject.isPending} onClick={() => createProject.mutate()}>
              Create
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setIsCreating(true)}>
          <PlusIcon data-icon="inline-start" />
          New project
        </Button>
      )}
    </div>
  );
}
