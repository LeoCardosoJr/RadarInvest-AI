import { NextResponse } from "next/server";

import { getContainer } from "@/server/composition/container";
import { parseJsonBody, sessionResponse, toErrorResponse } from "@/server/http/responses";
import { registerSchema } from "@/server/modules/auth/auth-schemas";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const container = getContainer();
    const input = await parseJsonBody(request, registerSchema);
    const session = await container.authService.register(input);

    return sessionResponse(session, container.sessionCookie, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
