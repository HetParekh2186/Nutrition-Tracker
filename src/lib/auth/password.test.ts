import { describe, expect, it } from "vitest";

import {
  authErrorMessage,
  NewPassword,
  SetPasswordForm,
  SignInForm,
} from "./password";

describe("NewPassword", () => {
  it("needs at least 8 characters", () => {
    expect(NewPassword.safeParse("short").success).toBe(false);
    expect(NewPassword.safeParse("long enough").success).toBe(true);
  });

  it("rejects passwords bcrypt would cut short", () => {
    expect(NewPassword.safeParse("a".repeat(72)).success).toBe(true);
    expect(NewPassword.safeParse("a".repeat(73)).success).toBe(false);
    // 24 three-byte characters are 72 bytes; 25 are too many.
    expect(NewPassword.safeParse("€".repeat(25)).success).toBe(false);
  });

  it("rejects a password of only spaces", () => {
    expect(NewPassword.safeParse("          ").success).toBe(false);
  });
});

describe("SetPasswordForm", () => {
  it("requires both entries to match", () => {
    const r = SetPasswordForm.safeParse({
      password: "correct horse",
      confirm: "correct house",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/do not match/);
  });
});

describe("SignInForm", () => {
  it("does not apply new-password rules to existing passwords", () => {
    expect(
      SignInForm.safeParse({ email: "a@b.co", password: "old" }).success,
    ).toBe(true);
  });
});

describe("authErrorMessage", () => {
  it("keeps sign-in failures vague", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).not.toMatch(
      /no account|not found/i,
    );
  });

  it("maps rate limits by code or status", () => {
    expect(authErrorMessage({ code: "over_email_send_rate_limit" })).toMatch(
      /Wait a minute/,
    );
    expect(authErrorMessage({ status: 429 })).toMatch(/Wait a minute/);
  });

  it("falls back to a generic sentence", () => {
    expect(authErrorMessage({ message: "boom" })).toBe(
      "Something went wrong. Try again.",
    );
  });
});
