import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'
import { readFileSync } from 'fs'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// Read app version from package.json so it can be surfaced in error/diagnostic UIs.
const pkg = JSON.parse(
  readFileSync(resolve(projectRoot, 'package.json'), 'utf-8')
) as { version?: string }
const appVersion = pkg.version ?? '0.0.0'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    // True for `vite dev` and `vite build --mode development`. Consumed by
    // diagnostics to gate automatic error-report submission to debug builds.
    __APP_DEBUG__: JSON.stringify(mode !== 'production'),
  },
  plugins: [
    react(),
    tailwindcss(),
    // DO NOT REMOVE
    createIconImportProxy() as PluginOption,
    sparkPlugin() as PluginOption,
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src'),
      // Redirect the GitHub Spark hosted runtime to local on-device shims so
      // the Android APK works without the Spark KV / LLM HTTP endpoints. See
      // src/lib/llm-runtime/* for the IndexedDB-backed KV + OpenAI-compatible
      // chat-completion client that back these aliases.
      '@github/spark/hooks': resolve(
        projectRoot,
        'src/lib/llm-runtime/spark-hooks-shim.ts',
      ),
      '@github/spark/spark': resolve(
        projectRoot,
        'src/lib/llm-runtime/install.ts',
      ),
    }
  },
  build: {
    // The main bundle includes large vendor libraries (three, recharts, d3,
    // reactflow, framer-motion, octokit, prismjs, etc.). The default 500 kB
    // chunk warning is informational and not actionable without invasive
    // code-splitting; raise it to silence noisy CI logs.
    chunkSizeWarningLimit: 1200,
  },
}));
