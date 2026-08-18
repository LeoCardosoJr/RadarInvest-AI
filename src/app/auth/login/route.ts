import { NextResponse } from "next/server";

import { getContainer } from "@/server/composition/container";
import { parseJsonBody, sessionResponse, toErrorResponse } from "@/server/http/responses";
import { loginSchema } from "@/server/modules/auth/auth-schemas";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const container = getContainer();
    const input = await parseJsonBody(request, loginSchema);
    const session = await container.authService.login(input);

    return sessionResponse(session, container.sessionCookie);
  } catch (error) {
    return toErrorResponse(error);
  }
}
