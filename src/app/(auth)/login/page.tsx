"use client";

import { useEffect } from "react";

const MIMS_AUTH_URL = process.env.NEXT_PUBLIC_MIMS_AUTH_URL || "https://mims.moe.gov.sg/oauth2/authorize";
const CLIENT_ID = process.env.NEXT_PUBLIC_MIMS_CLIENT_ID || "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/auth/callback`;

export default function LoginPage() {
  useEffect(() => {
    // In production, redirect to MIMS OAuth
    // For development, show a login form
  }, []);

  const handleLogin = () => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "openid profile email",
    });
    window.location.href = `${MIMS_AUTH_URL}?${params}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-approve-surface-alt">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-card shadow-sm border border-approve-border p-8">
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

          <h1 className="text-2xl font-bold text-grey-700 mb-2">Sign in</h1>
          <p className="text-sm text-approve-text-secondary mb-8">
            Sign in with your MIMS account to access ApproveSG.
          </p>

          <button
            onClick={handleLogin}
            className="w-full bg-approve-primary text-white font-semibold py-3 px-4 rounded-btn hover:bg-approve-primary-dark transition-colors focus-ring"
          >
            Sign in with MIMS
          </button>

          <p className="mt-6 text-xs text-center text-approve-text-secondary">
            A Singapore Government Digital Service — Ministry of Education
          </p>
        </div>
      </div>
    </div>
  );
}
