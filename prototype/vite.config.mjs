import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {readFile} from 'node:fs/promises';
// Local visual QA assets are outside public/ and never copied into a build.
const localThemePreview={name:'local-theme-preview',configureServer(server){server.middlewares.use(async(req,res,next)=>{const path=req.url?.split('?')[0];if(!/^\/(?:qa-alloy\/theme\.json|theme-assets\/[a-f0-9]{64}\.png)$/.test(path||''))return next();try{const bytes=await readFile(new URL('../.qa/dev-public'+path,import.meta.url));res.setHeader('Content-Type',path.endsWith('.png')?'image/png':'application/json');res.end(bytes);}catch{next();}});}};

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    // Packaged runtimes and smoke-test caches are not frontend source files.
    watch: { ignored: ["**/releases/**", "**/.smoke-data/**", "**/.test-tools/**", "**/.qa/**"] },
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [react(),localThemePreview],
});
