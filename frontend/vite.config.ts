import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const api = env.VITE_API_PROXY || "http://localhost:3000";
  const port = Number(env.VITE_PORT || 5173);

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port,
      strictPort: true,
      proxy: {
        "/api": { target: api, changeOrigin: true },
        "/health": { target: api, changeOrigin: true },
        "/socket.io": { target: api, ws: true },
      },
    },
  };
});
