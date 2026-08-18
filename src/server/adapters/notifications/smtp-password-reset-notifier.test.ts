import { describe, expect, it, vi } from "vitest";

import { FakeMailTransport } from "../../testing/auth-fakes";
import type { MailTransport } from "./mail-transport";
import { NoopPasswordResetNotifier } from "./noop-password-reset-notifier";
import { SmtpPasswordResetNotifier } from "./smtp-password-reset-notifier";

const notification = {
  email: "maria@example.com",
  name: "Maria Silva",
  token: "token-opaco-de-teste",
  expiresAt: new Date("2026-08-16T10:30:00Z"),
};

function createNotifier(transport: MailTransport) {
  return new SmtpPasswordResetNotifier(transport, {
    appUrl: "https://radarinvest.local",
    fromEmail: "nao-responda@radarinvest.local",
  });
}

describe("SmtpPasswordResetNotifier", () => {
  it("sends the reset link only to the account owner", async () => {
    const transport = new FakeMailTransport();

    await createNotifier(transport).notifyPasswordReset(notification);

    const [message] = transport.messages;
    expect(message?.to).toBe("maria@example.com");
    expect(message?.from).toBe("nao-responda@radarinvest.local");
    expect(message?.text).toContain(
      "https://radarinvest.local/reset-password?token=token-opaco-de-teste",
    );
    expect(message?.html).toContain(
      "https://radarinvest.local/reset-password?token=token-opaco-de-teste",
    );
  });

  it("escapes untrusted values in the HTML body", async () => {
    const transport = new FakeMailTransport();

    await createNotifier(transport).notifyPasswordReset({
      ...notification,
      name: '<script>alert("x")</script>',
    });

    expect(transport.messages[0]?.html).not.toContain("<script>");
    expect(transport.messages[0]?.html).toContain("&lt;script&gt;");
  });

  it("does not log the token when delivery fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const failingTransport: MailTransport = {
      sendMail: () => Promise.reject(new Error("smtp unavailable")),
    };

    await expect(
      createNotifier(failingTransport).notifyPasswordReset(notification),
    ).rejects.toThrow();

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();

    consoleError.mockRestore();
    consoleLog.mockRestore();
  });

  it("keeps the noop notifier silent about the token", async () => {
    const consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );

    await new NoopPasswordResetNotifier().notifyPasswordReset();

    for (const spy of consoleSpies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });
});
