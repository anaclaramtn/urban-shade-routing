import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./": os caminhos ficam relativos e o site funciona em
// https://anaclaramtn.github.io/urban-shade-routing/ sem configuração extra.
export default defineConfig({
  base: "./",
  plugins: [react()]
});
