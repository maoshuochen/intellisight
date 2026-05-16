import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@arco-design")) return "vendor-arco";
          if (id.includes("@xyflow")) return "vendor-flow";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@tanstack") || id.includes("zustand")) return "vendor-state";
          return "vendor";
        }
      }
    }
  },
  server: {
    port: 3000
  }
});
