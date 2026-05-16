import { create } from "zustand";

type AppState = {
  projectId: string | null;
  setProjectId: (projectId: string | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  projectId: localStorage.getItem("intellisight.projectId"),
  setProjectId: (projectId) => {
    if (projectId) localStorage.setItem("intellisight.projectId", projectId);
    else localStorage.removeItem("intellisight.projectId");
    set({ projectId });
  }
}));
