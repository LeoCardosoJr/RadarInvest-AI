import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/server/auth/authenticate-request";
import { getContainer } from "@/server/composition/container";
import { parseJsonBody, toErrorResponse } from "@/server/http/responses";
import type { Preference } from "@/server/modules/preferences/preferences-service";
import { updatePreferencesSchema } from "@/server/modules/preferences/preferences-schemas";

export interface PreferencesResponseBody {
  interests: Array<{
    id: string;
    topic: string;
    createdAt: string;
  }>;
}

function serializePreferences(preferences: Preference[]): PreferencesResponseBody {
  return {
    interests: preferences.map((item) => ({
      id: item.id,
      topic: item.topic,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const container = getContainer();
    const auth = await requireAuthenticatedUser(request, container.authentication);
    const preferences = await container.preferencesService.listPreferences(auth.userId);

    return NextResponse.json(serializePreferences(preferences), { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const container = getContainer();
    const auth = await requireAuthenticatedUser(request, container.authentication);
    const body = await parseJsonBody(request, updatePreferencesSchema);
    const preferences = await container.preferencesService.updatePreferences(
      auth.userId,
      body.topics,
    );

    return NextResponse.json(serializePreferences(preferences), { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
