"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_USERS = [
  {
    id: "demo-submitter",
    name: "Alice Tan",
    role: "Submitter",
    desc: "Submit requests for approval",
    school: "School SG001",
  },
  {
    id: "demo-approver",
    name: "Bob Lim",
    role: "Approver (HOD)",
    desc: "Review and approve submissions",
    school: "School SG001",
  },
  {
    id: "demo-admin",
    name: "Carol Wong",
    role: "School Admin",
    desc: "Manage workflows and settings",
    school: "School SG001",
  },
  {
    id: "demo-platform",
    name: "David Ng",
    role: "Platform Admin",
    desc: "Full access across all schools",
    school: "MOE HQ",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function login(userId: string) {
    setLoading(userId);
    setError(null);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Login failed");
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-approve-surface-alt">
      <div className="w-full max-w-md px-4">
        <div className="bg-white rounded-card shadow-sm border border-approve-border p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-approve-primary rounded-[10px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M6 12.5L10 16.5L18 8.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-bold">
              Approve<span className="text-approve-primary">SG</span>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-grey-700 mb-1">Demo Login</h1>
          <p className="text-sm text-approve-text-secondary mb-6">
            Pick a persona to explore the app.
          </p>

          <div className="space-y-3">
            {DEMO_USERS.map((user) => (
              <button
                key={user.id}
                onClick={() => login(user.id)}
                disabled={loading !== null}
                className="w-full text-left border border-approve-border rounded-card px-4 py-3 hover:border-approve-primary hover:bg-approve-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-grey-700">{user.name}</p>
                    <p className="text-xs text-approve-text-secondary mt-0.5">
                      {user.role} · {user.school}
                    </p>
                  </div>
                  {loading === user.id ? (
                    <div className="w-4 h-4 border-2 border-approve-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 text-approve-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-4 text-xs text-center text-status-rejected">{error}</p>
          )}

          <p className="mt-6 text-xs text-center text-approve-text-secondary">
            Demo environment — no real data
          </p>
        </div>
      </div>
    </div>
  );
}
