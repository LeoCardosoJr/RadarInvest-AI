import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/server/auth/authenticate-request";
import { getContainer } from "@/server/composition/container";
import { toErrorResponse } from "@/server/http/responses";
import type { FeedResult } from "@/server/modules/feed/feed-service";

export interface FeedResponseBody {
  generatedAt: string | null;
  interests: readonly string[];
  items: FeedResult["items"];
  cached: boolean;
  stale: boolean;
  message?: string;
  warning?: string;
}

export function serializeFeed(result: FeedResult): FeedResponseBody {
  return {
    generatedAt: result.generatedAt ? result.generatedAt.toISOString() : null,
    interests: result.interests,
    items: result.items,
    cached: result.cached,
    stale: result.stale,
    ...(result.message ? { message: result.message } : {}),
    ...(result.warning ? { warning: result.warning } : {}),
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const container = getContainer();
    const auth = await requireAuthenticatedUser(request, container.authentication);
    const result = await container.feedService.getFeed(auth.userId);

    return NextResponse.json(serializeFeed(result), { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
