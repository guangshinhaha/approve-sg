"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { clientFetch } from "@/lib/client-fetch";
import { Plus, Key, Copy, Check } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdBy: string;
  createdAt: string;
}

interface CreatedKey extends ApiKey {
  plaintext: string;
}

const AVAILABLE_SCOPES = [
  { value: "workflows:read", label: "Read workflows" },
  { value: "workflows:write", label: "Manage workflows" },
  { value: "submissions:read", label: "Read submissions" },
  { value: "submissions:write", label: "Create submissions" },
  { value: "submissions:approve", label: "Approve/reject submissions" },
  { value: "webhooks:read", label: "Read webhooks" },
  { value: "webhooks:write", label: "Manage webhooks" },
  { value: "*", label: "Full access (all scopes)" },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", scopes: [] as string[] });
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = () => {
    setLoading(true);
    clientFetch<{ data: ApiKey[] }>("/api/api-keys")
      .then((res) => setKeys(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.scopes.length === 0) return;
    setError(null);
    setCreating(true);
    try {
      const created = await clientFetch<CreatedKey>("/api/api-keys", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setNewKey(created);
      setForm({ name: "", scopes: [] });
      setShowCreate(false);
      loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await clientFetch(`/api/api-keys/${id}`, { method: "DELETE" });
    loadKeys();
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey.plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: string) => {
    setForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  return (
    <>
      <PageHeader
        title="API Keys"
        description="Manage API keys that grant host products programmatic access to this organization's approval workflows."
        action={
          !showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-semibold bg-approve-primary text-white hover:bg-approve-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              New API Key
            </button>
          )
        }
      />

      {/* One-time plaintext display */}
      {newKey && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-card p-5 mb-5">
          <h3 className="text-sm font-bold text-yellow-900 mb-2">
            Copy your new API key now — it will not be shown again
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 text-xs font-mono bg-white border border-yellow-300 rounded px-3 py-2 overflow-x-auto">
              {newKey.plaintext}
            </code>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn text-xs font-semibold bg-yellow-600 text-white hover:bg-yellow-700"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-yellow-900 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-approve-border rounded-card p-5 mb-5">
          <h3 className="text-sm font-bold text-grey-700 mb-3">Create API Key</h3>
          {error && (
            <div className="mb-3 px-3 py-2 rounded-btn bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-approve-text-secondary mb-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. Parents Gateway integration"
                className="w-full rounded-btn border border-approve-border px-3 py-2 text-sm focus:ring-2 focus:ring-approve-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-approve-text-secondary mb-2">
                Scopes (at least one required)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {AVAILABLE_SCOPES.map((s) => (
                  <label
                    key={s.value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.scopes.includes(s.value)}
                      onChange={() => toggleScope(s.value)}
                      className="rounded border-approve-border"
                    />
                    <code className="text-xs bg-approve-surface-alt px-1.5 py-0.5 rounded">
                      {s.value}
                    </code>
                    <span className="text-approve-text-secondary text-xs">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || form.scopes.length === 0 || !form.name}
                className="px-4 py-2 rounded-btn text-sm font-semibold bg-approve-primary text-white hover:bg-approve-primary-dark disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Key"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-btn text-sm text-approve-text-secondary hover:bg-approve-surface-alt"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-approve-border rounded-card p-12 text-center">
          <p className="text-sm text-approve-text-secondary">Loading...</p>
        </div>
      ) : keys.length === 0 ? (
        <EmptyState
          title="No API keys yet"
          description="Mint a key to let a host product integrate with ApproveSG."
          icon={<Key className="w-8 h-8 text-approve-primary" />}
        />
      ) : (
        <div className="bg-white border border-approve-border rounded-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-approve-surface-alt text-xs uppercase tracking-wide text-approve-text-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Prefix</th>
                <th className="text-left px-4 py-3 font-semibold">Scopes</th>
                <th className="text-left px-4 py-3 font-semibold">Last used</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-approve-border">
                  <td className="px-4 py-3 font-semibold text-grey-700">{k.name}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-approve-surface-alt px-2 py-0.5 rounded text-approve-text-secondary">
                      {k.prefix}…
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <code
                          key={s}
                          className="text-xs bg-approve-surface-alt px-1.5 py-0.5 rounded text-approve-text-secondary"
                        >
                          {s}
                        </code>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-approve-text-secondary text-xs">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {k.revokedAt ? (
                      <span className="text-xs font-semibold text-status-rejected">Revoked</span>
                    ) : (
                      <span className="text-xs font-semibold text-status-approved">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!k.revokedAt && (
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="text-xs font-semibold text-status-rejected hover:underline"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
