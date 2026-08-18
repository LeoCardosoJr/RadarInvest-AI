import { NextResponse } from "next/server";

import { getContainer } from "@/server/composition/container";
import { parseJsonBody, toErrorResponse } from "@/server/http/responses";
import { forgotPasswordSchema } from "@/server/modules/auth/auth-schemas";

/** Resposta única, independente de a conta existir ou não. */
const ACCEPTED_BODY = {
  message: "Se existir uma conta para este e-mail, enviaremos as instruções de recuperação.",
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const container = getContainer();
    const input = await parseJsonBody(request, forgotPasswordSchema);

    await container.authService.requestPasswordReset(input);

    return NextResponse.json(ACCEPTED_BODY, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
