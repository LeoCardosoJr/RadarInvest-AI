import type { NextConfig } from "next";

// O output "standalone" existe apenas para a imagem Docker, que executa
// `node server.js`. Ele fica desligado por padrão porque a Vercel faz o próprio
// tracing de arquivos, não consome o diretório standalone e falha ao gerá-lo
// (o passo standalone lê `.next/next-server.js.nft.json`, ausente naquele
// ambiente). O Dockerfile liga a flag no stage de build.
const standaloneOutput = process.env.NEXT_OUTPUT_STANDALONE === "true";

const nextConfig: NextConfig = {
  output: standaloneOutput ? "standalone" : undefined,
  // O SDK do Gemini usa requires dinâmicos que o tracing padrão do output
  // "standalone" não segue; sem isto, `@google/genai` fica de fora do
  // `node_modules` da imagem e todo request à IA falha com AI_UNAVAILABLE.
  serverExternalPackages: ["@google/genai", "ws"],
};

export default nextConfig;
