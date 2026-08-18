import { describe, expect, it } from "vitest";

import { decodeHtmlEntities, sanitizeHtml } from "./html-sanitizer";

describe("html-sanitizer", () => {
  describe("sanitizeHtml", () => {
    it("remove tags HTML e blocos CDATA preservando o texto legível", () => {
      const input = "<![CDATA[<p>Conselho da <strong>Petrobras</strong> aprovou dividendos.</p>]]>";
      expect(sanitizeHtml(input)).toBe("Conselho da Petrobras aprovou dividendos.");
    });

    it("remove tags <img> e scripts perigosos", () => {
      const input = '<img src="img.jpg" /><script>alert(1)</script><p>Notícia após imagem</p>';
      expect(sanitizeHtml(input)).toBe("Notícia após imagem");
    });

    it("colapsa espaços em branco múltiplos e quebras de linha", () => {
      const input = "  Texto   com \n\n múltiplos   espaços  ";
      expect(sanitizeHtml(input)).toBe("Texto com múltiplos espaços");
    });

    it("lida com string vazia ou inválida graciosamente", () => {
      expect(sanitizeHtml("")).toBe("");
    });
  });

  describe("decodeHtmlEntities", () => {
    it("decodifica entidades nomeadas comuns", () => {
      const input = "Petrobras &amp; Vale &ndash; Mercado &ldquo;aquecido&rdquo;";
      expect(decodeHtmlEntities(input)).toBe('Petrobras & Vale – Mercado "aquecido"');
    });

    it("decodifica entidades numéricas decimais e hexadecimais", () => {
      const input = "Selic est&#225;vel e infla&#231;&#227;o &#x2605;";
      expect(decodeHtmlEntities(input)).toBe("Selic estável e inflação ★");
    });
  });
});
