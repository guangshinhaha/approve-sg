"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { clientFetch } from "@/lib/client-fetch";
import { Plus, Trash2, Webhook, Copy, Check } from "lucide-react";
import { ALL_WEBHOOK_EVENTS } from "@/lib/constants";

interface WebhookReg {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  secret?: string;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchWebhooks = () => {
    clientFetch<{ data: WebhookReg[] }>("/api/webhooks")
      .then((res) => setWebhooks(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchWebhooks(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await clientFetch<WebhookReg>("/api/webhooks", {
        method: "POST",
        body: JSON.stringify({ url, events }),
      });
      setNewSecret(res.secret || null);
      fetchWebhooks();
      setUrl("");
      setEvents([]);
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    await clientFetch(`/api/webhooks/${id}`, { method: "DELETE" });
    fetchWebhooks();
  };

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const copySecret = () => {
    if (newSecret) {
      navigator.clipboard.writeText(newSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Register endpoints to receive real-time approval events."
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-btn text-sm font-semibold bg-approve-primary text-white hover:bg-approve-primary-dark"
          >
            <Plus className="w-4 h-4" />
            Register Webhook
          </button>
        }
      />

      {/* Secret display (shown once after creation) */}
      {newSecret && (
        <div className="bg-status-approved-bg border border-status-approved/20 rounded-card p-4 mb-5">
          <p className="text-sm font-semibold text-status-approved mb-1">Webhook secret (shown once)</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-white px-3 py-1.5 rounded border border-approve-border flex-1 font-mono">
              {newSecret}
            </code>
            <button onClick={copySecret} className="p-2 hover:bg-white rounded transition-colors">
              {copied ? <Check className="w-4 h-4 text-status-approved" /> : <Copy className="w-4 h-4 text-approve-text-secondary" />}
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-approve-border rounded-card p-5 mb-5">
          <h3 className="text-sm font-bold text-grey-700 mb-3">Register Webhook</h3>
          <form onSubmit={handleCreate}>
            <div className="mb-3">
              <label className="block text-xs font-medium text-approve-text-secondary mb-1">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full rounded-btn border border-approve-border px-3 py-2 text-sm focus:ring-2 focus:ring-approve-primary"
                placeholder="https://your-app.com/webhooks/approvesg"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-approve-text-secondary mb-2">Events</label>
              <div className="flex flex-wrap gap-2">
                {ALL_WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-badge text-xs font-medium cursor-pointer transition-colors ${
                      events.includes(event)
                        ? "bg-approve-primary-light text-approve-primary border border-approve-primary/20"
                        : "bg-approve-surface-alt text-approve-text-secondary border border-approve-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="sr-only"
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating || events.length === 0}
                className="px-4 py-2 rounded-btn text-sm font-semibold bg-approve-primary text-white hover:bg-approve-primary-dark disabled:opacity-50"
              >
                {creating ? "Registering..." : "Register"}
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

      {/* Webhook list */}
      {loading ? (
        <div className="bg-white border border-approve-border rounded-card p-12 text-center">
          <p className="text-sm text-approve-text-secondary">Loading...</p>
        </div>
      ) : webhooks.length === 0 ? (
        <EmptyState
          title="No webhooks"
          description="Register a webhook to receive approval events."
          icon={<Webhook className="w-8 h-8 text-approve-primary" />}
        />
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="bg-white border border-approve-border rounded-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-grey-700 font-mono">{wh.url}</p>
                <div className="flex gap-1.5 mt-1.5">
                  {wh.events.map((e) => (
                    <span key={e} className="text-[10px] font-medium px-2 py-0.5 rounded-badge bg-approve-surface-alt text-approve-text-secondary">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleDelete(wh.id)}
                className="p-2 text-grey-400 hover:text-status-rejected transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
