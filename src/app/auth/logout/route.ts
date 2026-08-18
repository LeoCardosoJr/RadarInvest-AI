import { NextResponse } from "next/server";

import { buildClearedSessionCookie } from "@/server/auth/session-cookie";
import { getContainer } from "@/server/composition/container";
import { toErrorResponse, withSessionCookie } from "@/server/http/responses";

export async function POST(): Promise<NextResponse> {
  try {
    const container = getContainer();

    // O logout encerra a sessão web removendo o cookie. Um Bearer token já
    // emitido continua válido até expirar, conforme a política do MVP.
    return withSessionCookie(
      new NextResponse(null, { status: 204 }),
      buildClearedSessionCookie(container.sessionCookie),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
