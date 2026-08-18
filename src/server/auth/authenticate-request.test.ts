import { describe, expect, it } from "vitest";

import { JoseJwtService } from "../adapters/security/jose-jwt-service";
import { UnauthorizedError } from "../errors/app-error";
import { InMemoryUserRepository } from "../testing/auth-fakes";
import { authenticateRequest, requireAuthenticatedUser } from "./authenticate-request";
import { SESSION_COOKIE_NAME } from "./session-cookie";

const jwtService = new JoseJwtService({
  secret: "a-secure-test-secret-with-at-least-32-characters",
  issuer: "radarinvest-ai",
  audience: "radarinvest-web",
  expiresInSeconds: 3_600,
});

async function createScenario() {
  const userRepository = new InMemoryUserRepository();
  const user = await userRepository.create({
    name: "Maria Silva",
    email: "maria@example.com",
    passwordHash: "hash-irrelevante",
  });
  const { accessToken } = await jwtService.issueAccessToken({
    userId: user!.id,
    tokenVersion: 0,
  });

  return { dependencies: { jwtService, userRepository }, user: user!, accessToken };
}

function request(headers: Record<string, string>, body?: unknown): Request {
  return new Request("https://radarinvest.local/protegido", {
    method: body === undefined ? "GET" : "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("authenticateRequest", () => {
  it("rejects a request without any credential", async () => {
    const { dependencies } = await createScenario();

    expect(await authenticateRequest(request({}), dependencies)).toBeNull();
  });

  it("accepts a valid bearer token", async () => {
    const { dependencies, user, accessToken } = await createScenario();

    expect(
      await authenticateRequest(request({ authorization: `Bearer ${accessToken}` }), dependencies),
    ).toEqual({ userId: user.id, tokenVersion: 0 });
  });

  it("accepts the web session cookie", async () => {
    const { dependencies, user, accessToken } = await createScenario();

    expect(
      await authenticateRequest(
        request({ cookie: `theme=dark; ${SESSION_COOKIE_NAME}=${accessToken}` }),
        dependencies,
      ),
    ).toEqual({ userId: user.id, tokenVersion: 0 });
  });

  it("ignores a userId sent by the client", async () => {
    const { dependencies, user, accessToken } = await createScenario();
    const otherUser = await dependencies.userRepository.create({
      name: "Outro Usuário",
      email: "outro@example.com",
      passwordHash: "hash-irrelevante",
    });

    const context = await authenticateRequest(
      request(
        {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "x-user-id": otherUser!.id,
        },
        { userId: otherUser!.id },
      ),
      dependencies,
    );

    expect(context).toEqual({ userId: user.id, tokenVersion: 0 });
  });

  it("rejects a userId sent without any token", async () => {
    const { dependencies, user } = await createScenario();

    expect(
      await authenticateRequest(
        request({ "content-type": "application/json", "x-user-id": user.id }, { userId: user.id }),
        dependencies,
      ),
    ).toBeNull();
  });

  it("rejects a token whose session version is outdated", async () => {
    const { dependencies, user, accessToken } = await createScenario();
    dependencies.userRepository.bumpTokenVersion(user.id);

    expect(
      await authenticateRequest(request({ authorization: `Bearer ${accessToken}` }), dependencies),
    ).toBeNull();
  });

  it("rejects a token whose user no longer exists", async () => {
    const { dependencies } = await createScenario();
    const { accessToken } = await jwtService.issueAccessToken({
      userId: "00000000-0000-4000-8000-000000000000",
      tokenVersion: 0,
    });

    expect(
      await authenticateRequest(request({ authorization: `Bearer ${accessToken}` }), dependencies),
    ).toBeNull();
  });

  it("throws UnauthorizedError when a context is required", async () => {
    const { dependencies } = await createScenario();

    await expect(requireAuthenticatedUser(request({}), dependencies)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
