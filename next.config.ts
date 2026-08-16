import type { NextConfig } from "next";

// O output "standalone" existe apenas para a imagem Docker, que executa
// `node server.js`. Ele fica desligado por padrão porque a Vercel faz o próprio
// tracing de arquivos, não consome o diretório standalone e falha ao gerá-lo
// (o passo standalone lê `.next/next-server.js.nft.json`, ausente naquele
// ambiente). O Dockerfile liga a flag no stage de build.
const standaloneOutput = process.env.NEXT_OUTPUT_STANDALONE === "true";

const nextConfig: NextConfig = {
  output: standaloneOutput ? "standalone" : undefined,
};

export default nextConfig;
