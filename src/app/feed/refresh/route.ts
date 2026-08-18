import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/server/auth/authenticate-request";
import { getContainer } from "@/server/composition/container";
import { toErrorResponse } from "@/server/http/responses";
import { serializeFeed } from "../route";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const container = getContainer();
    const auth = await requireAuthenticatedUser(request, container.authentication);
    const result = await container.feedService.refreshFeed(auth.userId);

    return NextResponse.json(serializeFeed(result), { status: 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
