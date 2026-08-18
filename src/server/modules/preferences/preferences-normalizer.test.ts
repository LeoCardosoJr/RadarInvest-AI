import { describe, expect, it } from "vitest";

import { ValidationError } from "../../errors/app-error";
import {
  cleanTopicPresentation,
  computePreferencesHash,
  haveSameTopics,
  normalizeTopic,
  parseAndDeduplicateTopics,
  MAX_PREFERENCES_COUNT,
  MAX_TOPIC_LENGTH,
} from "./preferences-normalizer";

describe("preferences-normalizer", () => {
  describe("cleanTopicPresentation", () => {
    it("remove espaços nas bordas e colapsa múltiplos espaços internos", () => {
      expect(cleanTopicPresentation("  PETR4   ações   ")).toBe("PETR4 ações");
      expect(cleanTopicPresentation("taxa   Selic")).toBe("taxa Selic");
    });
  });

  describe("normalizeTopic", () => {
    it("normaliza para minúsculas com espaços colapsados", () => {
      expect(normalizeTopic("  PETR4   ")).toBe("petr4");
      expect(normalizeTopic("  Taxa  SELIC  ")).toBe("taxa selic");
      expect(normalizeTopic("Setor Bancário")).toBe("setor bancário");
    });
  });

  describe("computePreferencesHash", () => {
    it("produz o mesmo hash SHA-256 independentemente da ordem dos elementos", () => {
      const hash1 = computePreferencesHash(["petr4", "vale3", "selic"]);
      const hash2 = computePreferencesHash(["selic", "petr4", "vale3"]);
      const hash3 = computePreferencesHash(["vale3", "selic", "petr4"]);

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
      expect(hash1).toHaveLength(64);
    });

    it("produz hash distinto para conjuntos diferentes", () => {
      const hash1 = computePreferencesHash(["petr4", "vale3"]);
      const hash2 = computePreferencesHash(["petr4", "bbas3"]);

      expect(hash1).not.toBe(hash2);
    });

    it("deduplica itens idênticos antes de calcular o hash", () => {
      const hash1 = computePreferencesHash(["petr4", "vale3"]);
      const hash2 = computePreferencesHash(["petr4", "vale3", "petr4"]);

      expect(hash1).toBe(hash2);
    });

    it("calcula hash determinístico para lista vazia", () => {
      const hash = computePreferencesHash([]);

      expect(hash).toHaveLength(64);
      expect(hash).toBe(computePreferencesHash([]));
    });
  });

  describe("haveSameTopics", () => {
    it("compara coleções normalizadas sem depender da ordem", () => {
      expect(haveSameTopics(["petr4", "vale3"], ["vale3", "petr4"])).toBe(true);
      expect(haveSameTopics(["petr4"], ["petr4", "vale3"])).toBe(false);
      expect(haveSameTopics(["petr4"], ["vale3"])).toBe(false);
    });
  });

  describe("parseAndDeduplicateTopics", () => {
    it("deduplica preservando a grafia da primeira ocorrência", () => {
      const parsed = parseAndDeduplicateTopics(["PETR4", "  petr4  ", "Petr4"]);

      expect(parsed).toEqual([
        {
          topic: "PETR4",
          normalizedTopic: "petr4",
        },
      ]);
    });

    it("aceita até o limite máximo de 20 interesses válidos", () => {
      const topics = Array.from({ length: MAX_PREFERENCES_COUNT }, (_, i) => `Ativo ${i + 1}`);
      const parsed = parseAndDeduplicateTopics(topics);

      expect(parsed).toHaveLength(MAX_PREFERENCES_COUNT);
    });

    it("rejeita quando excede o limite máximo de 20 interesses", () => {
      const topics = Array.from({ length: MAX_PREFERENCES_COUNT + 1 }, (_, i) => `Ativo ${i + 1}`);

      expect(() => parseAndDeduplicateTopics(topics)).toThrow(ValidationError);
    });

    it("rejeita tópicos com mais de 80 caracteres", () => {
      const longTopic = "A".repeat(MAX_TOPIC_LENGTH + 1);

      expect(() => parseAndDeduplicateTopics([longTopic])).toThrow(ValidationError);
    });

    it("rejeita tópicos vazios ou somente com espaços", () => {
      expect(() => parseAndDeduplicateTopics(["   "])).toThrow(ValidationError);
      expect(() => parseAndDeduplicateTopics([""])).toThrow(ValidationError);
    });
  });
});
