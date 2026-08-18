export const MAX_PREFERENCES_COUNT = 20;
export const MAX_TOPIC_LENGTH = 80;

export function cleanTopicPresentation(topic: string): string {
  return topic.trim().replace(/\s+/g, " ");
}

export function normalizeTopic(topic: string): string {
  return cleanTopicPresentation(topic).toLowerCase();
}
