import type { PreferenceRecord, PreferencesRepository } from "../../ports/preferences-repository";
import { parseAndDeduplicateTopics } from "./preferences-normalizer";

export interface Preference {
  id: string;
  topic: string;
  createdAt: Date;
}

function toPreference(record: PreferenceRecord): Preference {
  return {
    id: record.id,
    topic: record.topic,
    createdAt: record.createdAt,
  };
}

export class PreferencesService {
  constructor(private readonly repository: PreferencesRepository) {}

  async listPreferences(userId: string): Promise<Preference[]> {
    const preferences = await this.repository.listForUser(userId);

    return preferences.map(toPreference);
  }

  async updatePreferences(userId: string, rawTopics: string[]): Promise<Preference[]> {
    const preferences = await this.repository.replaceForUser(
      userId,
      parseAndDeduplicateTopics(rawTopics),
    );

    return preferences.map(toPreference);
  }
}
