import { NextResponse } from "next/server";

import { getContainer } from "@/server/composition/container";
import { parseJsonBody, sessionResponse, toErrorResponse } from "@/server/http/responses";
import { resetPasswordSchema } from "@/server/modules/auth/auth-schemas";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const container = getContainer();
    const input = await parseJsonBody(request, resetPasswordSchema);
    // A sessão devolvida já carrega a nova versão; as anteriores foram
    // invalidadas pela troca de senha.
    const session = await container.authService.resetPassword(input);

    return sessionResponse(session, container.sessionCookie);
  } catch (error) {
    return toErrorResponse(error);
  }
}
