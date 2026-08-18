import { createHash } from "node:crypto";

import {
  cleanTopicPresentation,
  MAX_PREFERENCES_COUNT,
  MAX_TOPIC_LENGTH,
  normalizeTopic,
} from "../../../lib/preferences";
import { ValidationError } from "../../errors/app-error";

export { cleanTopicPresentation, MAX_PREFERENCES_COUNT, MAX_TOPIC_LENGTH, normalizeTopic };

/**
 * Gera hash SHA-256 determinístico a partir dos tópicos normalizados ordenados.
 * Garante que a mesma coleção em ordens distintas produza exatamente o mesmo hash.
 */
export function computePreferencesHash(normalizedTopics: string[]): string {
  const uniqueSorted = Array.from(new Set(normalizedTopics)).sort();

  return createHash("sha256").update(uniqueSorted.join("\n")).digest("hex");
}

export function haveSameTopics(current: string[], next: string[]): boolean {
  if (current.length !== next.length) {
    return false;
  }

  const currentTopics = new Set(current);

  return next.every((topic) => currentTopics.has(topic));
}

export interface ParsedTopic {
  topic: string;
  normalizedTopic: string;
}

/**
 * Valida limites, normaliza e deduplica os tópicos fornecidos.
 * Preserva a grafia da primeira ocorrência encontrada de cada tópico.
 */
export function parseAndDeduplicateTopics(rawTopics: string[]): ParsedTopic[] {
  const parsedByNormalized = new Map<string, string>();

  for (const raw of rawTopics) {
    const topic = cleanTopicPresentation(raw);

    if (!topic) {
      throw new ValidationError({ field: "topics" });
    }

    if (topic.length > MAX_TOPIC_LENGTH) {
      throw new ValidationError({ field: "topics" });
    }

    const normalized = normalizeTopic(topic);

    if (!parsedByNormalized.has(normalized)) {
      parsedByNormalized.set(normalized, topic);
    }
  }

  if (parsedByNormalized.size > MAX_PREFERENCES_COUNT) {
    throw new ValidationError({ field: "topics" });
  }

  return Array.from(parsedByNormalized.entries()).map(([normalizedTopic, topic]) => ({
    topic,
    normalizedTopic,
  }));
}
