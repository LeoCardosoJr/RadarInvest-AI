import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` lança ao ser importado fora da condição "react-server".
      // O guarda continua valendo no build do Next; nos testes ele vira no-op.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Os testes de integração compartilham o mesmo PostgreSQL e limpam tabelas
    // entre casos; arquivos em paralelo se atropelariam.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
