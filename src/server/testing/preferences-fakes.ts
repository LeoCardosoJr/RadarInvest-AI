import { randomUUID } from "node:crypto";

import { haveSameTopics } from "../modules/preferences/preferences-normalizer";
import type {
  PreferenceInput,
  PreferenceRecord,
  PreferencesRepository,
} from "../ports/preferences-repository";

export class InMemoryPreferencesRepository implements PreferencesRepository {
  private readonly preferences: PreferenceRecord[] = [];
  readonly invalidatedCacheUserIds: string[] = [];

  async listForUser(userId: string): Promise<PreferenceRecord[]> {
    return this.preferences
      .filter((item) => item.userId === userId)
      .sort((first, second) => (first.normalizedTopic < second.normalizedTopic ? -1 : 1))
      .map((item) => ({ ...item }));
  }

  async replaceForUser(userId: string, input: PreferenceInput[]): Promise<PreferenceRecord[]> {
    const current = await this.listForUser(userId);

    if (
      haveSameTopics(
        current.map((preference) => preference.normalizedTopic),
        input.map((preference) => preference.normalizedTopic),
      )
    ) {
      return current;
    }

    const indicesToRemove: number[] = [];
    for (let i = this.preferences.length - 1; i >= 0; i--) {
      if (this.preferences[i].userId === userId) {
        indicesToRemove.push(i);
      }
    }
    for (const index of indicesToRemove) {
      this.preferences.splice(index, 1);
    }

    const inserted: PreferenceRecord[] = input.map((item) => ({
      id: randomUUID(),
      userId,
      topic: item.topic,
      normalizedTopic: item.normalizedTopic,
      createdAt: new Date(),
    }));

    this.preferences.push(...inserted);

    this.invalidatedCacheUserIds.push(userId);

    return this.listForUser(userId);
  }
}
