import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env without the VITE_ prefix restriction so ASSEMBLY_MODE / API_TARGET
  // / NEBULA_TARGET / PORT / DISABLE_HMR are populated on `process.env`.
  const env = loadEnv(mode ?? process.env.NODE_ENV ?? "development", process.cwd(), "");

  const isMock = (env.ASSEMBLY_MODE || process.env.ASSEMBLY_MODE || "mock").toLowerCase() === "mock";
  const port = Number.parseInt(env.PORT || process.env.PORT || (isMock ? "3000" : "4214"), 10);
  const disableHmr = (env.DISABLE_HMR || process.env.DISABLE_HMR || "").toLowerCase() === "true";

  // Live mode proxies /api → assembly-srv (3107) and /nebula → nebula-srv (3101).
  // Mock mode proxies /api, /nebula, /tts → the in-process mock fixture server (33107).
  const apiTarget = env.API_TARGET || process.env.API_TARGET || "http://localhost:3107";
  const nebulaTarget = env.NEBULA_TARGET || process.env.NEBULA_TARGET || "http://localhost:3101";
  const mockApiTarget = "http://localhost:" + (env.MOCK_API_PORT || process.env.MOCK_API_PORT || "33107");

  const proxy = isMock
    ? {
        "/api": { target: mockApiTarget, changeOrigin: true, secure: false },
        "/nebula": { target: mockApiTarget, changeOrigin: true, secure: false, rewrite: (p: string) => p },
        "/tts": { target: mockApiTarget, changeOrigin: true, secure: false },
      }
    : {
        "/api": { target: apiTarget, changeOrigin: true, secure: false },
        "/nebula": {
          target: nebulaTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (p: string) => p.replace(/^\/nebula/, "/api"),
        },
      };

  return {
    plugins: [react()],
    // Allow ASSEMBLY_ prefixed env vars in import.meta.env (in addition to VITE_).
    envPrefix: ['VITE_', 'ASSEMBLY_'],
    server: {
      host: "0.0.0.0",
      port,
      // Fully disable HMR when DISABLE_HMR=true (systemd). Setting `hmr: false`
      // stops @vitejs/plugin-react from injecting @react-refresh and stops the
      // websocket; an empty `watch.ignored` alone does not.
      ...(disableHmr ? { hmr: false, watch: { ignored: ["**/*"] } } : {}),
      proxy,
    },
    build: {
      // Route-level code-splitting is active (React.lazy on all views).
      // The remaining ~500 KB chunk is React + React Router + framer-motion +
      // lucide-react — vendor deps that can't be split further without
      // manualChunks. Bump the warning threshold to suppress the cosmetic
      // Vite warning. (T-Assembly-UI-05)
      chunkSizeWarningLimit: 600,
    },
  };
});
