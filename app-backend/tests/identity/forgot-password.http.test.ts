/// ARCHIVO: tests/identity/forgot-password.http.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import prisma from "@/shared/database/prisma";
import bcrypt from "bcrypt";

const { mockSendResetPasswordEmail } = vi.hoisted(() => ({
  mockSendResetPasswordEmail: vi.fn(),
}));

vi.mock("@/modules/identity/infrastructure/mail/password-reset-mailer", () => {
  return {
    NodemailerPasswordResetMailer: class {
      sendResetPasswordEmail = mockSendResetPasswordEmail;
    },
  };
});

import app from "@/app";

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const expectedMessage = "Si existe el usuario, se envió el correo";

  it("devuelve 200 y el mensaje genérico cuando la cuenta no existe", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "no-existe-http@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: expectedMessage,
    });
    expect(mockSendResetPasswordEmail).not.toHaveBeenCalled();
  });

  it("devuelve 200 y exactamente el mismo mensaje cuando la cuenta existe pero el mailer falla (no expone error 500)", async () => {
    const email = `test-mailer-fail-${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash("Password123!", 10);

    await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: "CLIENT",
      },
    });

    // Simulamos fallo SMTP en la misma función que invoca el controller
    mockSendResetPasswordEmail.mockRejectedValueOnce(
      new Error("SMTP Connection Error Simulado")
    );

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: expectedMessage,
    });
    // Verifica que el mailer fue efectivamente invocado antes de fallar
    expect(mockSendResetPasswordEmail).toHaveBeenCalledWith(
      email,
      expect.stringContaining("/reset-password?token=")
    );
  });
});
