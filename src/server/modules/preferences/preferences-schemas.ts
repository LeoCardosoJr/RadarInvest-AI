import { z } from "zod";

import { MAX_PREFERENCES_COUNT } from "../../../lib/preferences";

export const updatePreferencesSchema = z.object({
  topics: z.array(z.string()).max(MAX_PREFERENCES_COUNT),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
