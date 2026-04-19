import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",  // path relativi — necessario per itch.io
  server: { port: 5173 },
});
