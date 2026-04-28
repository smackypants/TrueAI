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
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
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
      '@': resolve(projectRoot, 'src')
    }
  },
  build: {
    // The main bundle includes large vendor libraries (three, recharts, d3,
    // reactflow, framer-motion, octokit, prismjs, etc.). The default 500 kB
    // chunk warning is informational and not actionable without invasive
    // code-splitting; raise it to silence noisy CI logs.
    chunkSizeWarningLimit: 1200,
  },
});
