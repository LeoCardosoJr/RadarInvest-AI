export interface PreferenceRecord {
  id: string;
  userId: string;
  topic: string;
  normalizedTopic: string;
  createdAt: Date;
}

export interface PreferenceInput {
  topic: string;
  normalizedTopic: string;
}

export interface PreferencesRepository {
  listForUser(userId: string): Promise<PreferenceRecord[]>;
  replaceForUser(userId: string, preferences: PreferenceInput[]): Promise<PreferenceRecord[]>;
}
