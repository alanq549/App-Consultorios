
import { afterEach, describe, expect, it, vi } from "vitest";

const { createTransportMock } = vi.hoisted(() => ({
  createTransportMock: vi.fn(() => ({
    sendMail: vi.fn(),
  })),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

import { NodemailerVerificationMailer } from "@/modules/identity/infrastructure/mail/nodemailer-verification-mailer";
import { NodemailerPasswordResetMailer } from "@/modules/identity/infrastructure/mail/password-reset-mailer";

const originalEnv = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  createTransportMock.mockClear();
  process.env = { ...originalEnv };
});

describe("Configuración de mailers de Identity", () => {
  describe("NodemailerVerificationMailer", () => {
    it("rechaza la configuración cuando falta MAIL_USER", () => {
      process.env.MAIL_USER = "";
      process.env.MAIL_PASS = "secret-pass";

      expect(() => new NodemailerVerificationMailer()).toThrow(
        "Configuración de correo incompleta",
      );
      expect(createTransportMock).not.toHaveBeenCalled();
    });

    it("rechaza la configuración cuando falta MAIL_PASS", () => {
      process.env.MAIL_USER = "user@example.com";
      delete process.env.MAIL_PASS;

      expect(() => new NodemailerVerificationMailer()).toThrow(
        "Configuración de correo incompleta",
      );
      expect(createTransportMock).not.toHaveBeenCalled();
    });

    it("se inicializa cuando las credenciales están presentes", () => {
      process.env.MAIL_USER = "user@example.com";
      process.env.MAIL_PASS = "secret-pass";

      expect(() => new NodemailerVerificationMailer()).not.toThrow();
      expect(createTransportMock).toHaveBeenCalledTimes(1);
    });

    it("no expone credenciales en el error", () => {
      process.env.MAIL_USER = "";
      process.env.MAIL_PASS = "secret-pass";

      let error: unknown;

      try {
        new NodemailerVerificationMailer();
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(
        "Configuración de correo incompleta",
      );
      expect((error as Error).message).not.toContain("secret-pass");
    });
  });

  describe("NodemailerPasswordResetMailer", () => {
    it.each(["MAIL_USER", "MAIL_PASS"] as const)(
      "rechaza la configuración cuando falta %s",
      (variable) => {
        process.env.MAIL_USER = "user@example.com";
        process.env.MAIL_PASS = "secret-pass";
        process.env.MAIL_FROM = "Impulsa Suite <no-reply@example.com>";
        delete process.env[variable];

        expect(() => new NodemailerPasswordResetMailer()).toThrow(
          "Configuración de correo incompleta",
        );
        expect(createTransportMock).not.toHaveBeenCalled();
      },
    );

    it("se inicializa cuando la configuración está completa", () => {
      process.env.MAIL_USER = "user@example.com";
      process.env.MAIL_PASS = "secret-pass";
      process.env.MAIL_FROM = "Impulsa Suite <no-reply@example.com>";

      expect(() => new NodemailerPasswordResetMailer()).not.toThrow();
      expect(createTransportMock).toHaveBeenCalledTimes(1);
    });
  });
});
