import { enforceSchoolAccess, AuthError, AuthUser } from "@/lib/auth";

describe("enforceSchoolAccess", () => {
  const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
    userId: "user-1",
    schoolCode: "3001",
    role: "submitter",
    email: "user@schools.gov.sg",
    name: "Test User",
    ...overrides,
  });

  it("should allow access when school codes match", () => {
    expect(() => enforceSchoolAccess(makeUser(), "3001")).not.toThrow();
  });

  it("should throw when school codes do not match", () => {
    expect(() => enforceSchoolAccess(makeUser(), "9999")).toThrow(AuthError);
    expect(() => enforceSchoolAccess(makeUser(), "9999")).toThrow(
      "Access denied: school code mismatch"
    );
  });

  it("should allow platform_admin to access any school", () => {
    const admin = makeUser({ role: "platform_admin", schoolCode: "HQ" });
    expect(() => enforceSchoolAccess(admin, "3001")).not.toThrow();
    expect(() => enforceSchoolAccess(admin, "9999")).not.toThrow();
  });
});
