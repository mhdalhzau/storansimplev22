import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Function to get dev plugins for Replit environment
const getDevPlugins = async () => {
  if (process.env.NODE_ENV === "production" || process.env.REPL_ID === undefined) {
    return [];
  }
  
  try {
    const [cartographer, devBanner, runtimeErrorOverlay] = await Promise.all([
      import("@replit/vite-plugin-cartographer").then(m => m.cartographer()),
      import("@replit/vite-plugin-dev-banner").then(m => m.devBanner()),
      import("@replit/vite-plugin-runtime-error-modal").then(m => m.default())
    ]);
    return [cartographer, devBanner, runtimeErrorOverlay];
  } catch (error) {
    console.warn("Failed to load dev plugins:", error.message);
    return [];
  }
};

export default defineConfig(async () => {
  const devPlugins = await getDevPlugins();
  
  return {
    plugins: [
      react(),
      ...devPlugins,
    ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  };
});
