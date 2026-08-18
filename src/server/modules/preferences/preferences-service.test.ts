import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryPreferencesRepository } from "../../testing/preferences-fakes";
import { PreferencesService } from "./preferences-service";

describe("PreferencesService", () => {
  let repository: InMemoryPreferencesRepository;
  let service: PreferencesService;

  beforeEach(() => {
    repository = new InMemoryPreferencesRepository();
    service = new PreferencesService(repository);
  });

  it("retorna lista vazia quando o usuário ainda não possui preferências", async () => {
    const preferences = await service.listPreferences("user-1");

    expect(preferences).toEqual([]);
  });

  it("atualiza a coleção de preferências e retorna a projeção pública", async () => {
    const updated = await service.updatePreferences("user-1", ["PETR4", "VALE3", "Taxa Selic"]);

    expect(updated).toHaveLength(3);
    expect(updated.map((item) => item.topic)).toEqual(["PETR4", "Taxa Selic", "VALE3"]);
    expect(repository.invalidatedCacheUserIds).toContain("user-1");
  });

  it("é idempotente: não grava no banco nem invalida cache para conjunto equivalente", async () => {
    await service.updatePreferences("user-1", ["PETR4", "VALE3"]);
    expect(repository.invalidatedCacheUserIds).toHaveLength(1);

    // Mesmos interesses em ordem diferente e com variações de espaço/maiúsculas
    const secondCall = await service.updatePreferences("user-1", ["vale3", "  petr4  "]);

    expect(secondCall).toHaveLength(2);
    // Preservou o estado anterior sem disparar nova invalidação
    expect(repository.invalidatedCacheUserIds).toHaveLength(1);
  });

  it("invalida cache quando houver alteração real de interesses", async () => {
    await service.updatePreferences("user-1", ["PETR4"]);
    expect(repository.invalidatedCacheUserIds).toHaveLength(1);

    await service.updatePreferences("user-1", ["PETR4", "VALE3"]);
    expect(repository.invalidatedCacheUserIds).toHaveLength(2);
  });

  it("permite limpar todas as preferências passando array vazio", async () => {
    await service.updatePreferences("user-1", ["PETR4", "VALE3"]);
    expect(repository.invalidatedCacheUserIds).toHaveLength(1);

    const cleared = await service.updatePreferences("user-1", []);
    expect(cleared).toEqual([]);
    expect(repository.invalidatedCacheUserIds).toHaveLength(2);

    const list = await service.listPreferences("user-1");
    expect(list).toEqual([]);
  });

  it("aplica os limites depois de normalizar e deduplicar", async () => {
    const repeatedTopic = `PETR4${" ".repeat(100)}ações`;
    const duplicates = Array.from({ length: 21 }, () => repeatedTopic);

    const preferences = await service.updatePreferences("user-1", duplicates);

    expect(preferences.map((preference) => preference.topic)).toEqual(["PETR4 ações"]);
  });

  it("garante isolamento estrito entre usuários distintos", async () => {
    await service.updatePreferences("user-1", ["PETR4", "VALE3"]);
    await service.updatePreferences("user-2", ["ITUB4", "BBDC4"]);

    const user1Preferences = await service.listPreferences("user-1");
    const user2Preferences = await service.listPreferences("user-2");

    expect(user1Preferences.map((p) => p.topic)).toEqual(["PETR4", "VALE3"]);
    expect(user2Preferences.map((preference) => preference.topic)).toEqual(["BBDC4", "ITUB4"]);

    // Atualização de user-1 não afeta user-2
    await service.updatePreferences("user-1", ["BBAS3"]);

    const user2PreferencesAfter = await service.listPreferences("user-2");
    expect(user2PreferencesAfter.map((preference) => preference.topic)).toEqual(["BBDC4", "ITUB4"]);
  });
});
