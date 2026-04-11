import { enforceOrgAccess, AuthError, AuthUser } from "@/lib/auth";

describe("enforceOrgAccess", () => {
  const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
    userId: "user-1",
    orgId: "org-3001",
    role: "submitter",
    email: "user@schools.gov.sg",
    name: "Test User",
    ...overrides,
  });

  it("should allow access when org ids match", () => {
    expect(() => enforceOrgAccess(makeUser(), "org-3001")).not.toThrow();
  });

  it("should throw when org ids do not match", () => {
    expect(() => enforceOrgAccess(makeUser(), "org-9999")).toThrow(AuthError);
    expect(() => enforceOrgAccess(makeUser(), "org-9999")).toThrow(
      "Access denied: organization mismatch"
    );
  });

  it("should allow platform_admin to access any org", () => {
    const admin = makeUser({ role: "platform_admin", orgId: "org-hq" });
    expect(() => enforceOrgAccess(admin, "org-3001")).not.toThrow();
    expect(() => enforceOrgAccess(admin, "org-9999")).not.toThrow();
  });
});
