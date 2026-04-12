"use client";

import {
  Plug,
  Building2,
  Settings,
  Users,
  BarChart3,
  ScrollText,
  ShoppingCart,
  ClipboardList,
  GraduationCap,
  DollarSign,
  FileText,
  Plane,
  ArrowRight,
  ArrowDown,
  Key,
  Code2,
  Layout,
  Bell,
  Webhook,
  Cpu,
} from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { HeroAnimation } from "@/components/landing/hero-animation";
import { ComparisonTable } from "@/components/landing/comparison-table";
import { FadeInSection } from "@/components/landing/fade-in-section";
import type { LucideIcon } from "lucide-react";

/* ─── Data ─────────────────────────────────────────────── */

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Plug,
    title: "API-First, Headless",
    desc: "Full REST API with OpenAPI spec. Your product owns the experience — ApproveSG handles the state machine, routing, and notifications underneath.",
  },
  {
    icon: Building2,
    title: "Multi-Tenant by Design",
    desc: "Every organization is fully isolated via row-level tenancy. Org A never sees Org B. Onboard new tenants in minutes with API keys.",
  },
  {
    icon: Key,
    title: "Scoped API Keys",
    desc: "Machine-to-machine auth with granular scopes. Mint keys for submissions:write, workflows:read, analytics:read — whatever each integration needs.",
  },
  {
    icon: Settings,
    title: "Configurable Approval Chains",
    desc: "Define multi-step chains with role-based routing. Add, remove, reorder steps. 6 workflow templates for common patterns — customise from there.",
  },
  {
    icon: Layout,
    title: "Embeddable UI Components",
    desc: "Drop iframe-ready pages into your product: approval inbox, workflow builder, submission timeline, analytics dashboard. Themed to match your brand.",
  },
  {
    icon: Cpu,
    title: "Claude Skill Package",
    desc: "AI-assisted integration. Tell Claude 'add approval to X' and it writes the full integration: API setup, workflow definition, webhook handler, iframe placement.",
  },
  {
    icon: Users,
    title: "Role-Based Routing",
    desc: "Assign approvers by role (manager, director, compliance), not by email. When a person changes role, pending approvals follow the role.",
  },
  {
    icon: Bell,
    title: "Automated Chase Reminders",
    desc: "Stuck approvals get automatic follow-ups every 72 hours. 10-email safety cap. Analytics show which steps are bottlenecks.",
  },
  {
    icon: Webhook,
    title: "HMAC-Signed Webhooks",
    desc: "Get notified when submissions are approved, rejected, or sent back. Signed payloads, exponential backoff retries, verification examples in Node/Python/Go.",
  },
  {
    icon: BarChart3,
    title: "Approval Analytics",
    desc: "Track avg/p50/p95 time-to-approve per workflow. Find bottleneck steps. Measure chase reminder effectiveness. All computed via SQL — zero memory overhead.",
  },
  {
    icon: ScrollText,
    title: "Immutable Audit Trail",
    desc: "Every action logged: who approved, when, at which step, with what comments. Queryable by date range, actor, action type. Compliance-ready.",
  },
  {
    icon: Code2,
    title: "Built for Scale",
    desc: "Transactional safety on all mutations. SQL-level analytics. Redis-backed rate limiting. Composite indexes. Designed for 100K+ concurrent transactions.",
  },
];

const USE_CASES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: ShoppingCart,
    title: "E-Commerce Orders",
    desc: "High-value order review. Manager approves orders above threshold before fulfillment.",
  },
  {
    icon: DollarSign,
    title: "Procurement & Finance",
    desc: "Purchase requests route by dollar value. Section head, director, CFO — configurable per org.",
  },
  {
    icon: ClipboardList,
    title: "Content Publishing",
    desc: "Editor reviews draft. Legal checks compliance. Comms lead approves. Auto-publishes on approval.",
  },
  {
    icon: GraduationCap,
    title: "Education & Schools",
    desc: "Student profiles, programme approvals, resource requests. HOD → VP → Principal chains.",
  },
  {
    icon: FileText,
    title: "HR & Compliance",
    desc: "Leave requests, access control, data requests. Manager approval with compliance review gate.",
  },
  {
    icon: Plane,
    title: "Travel & Expenses",
    desc: "Officer submits claim. Reporting officer approves. Finance logs. Same API, any organization.",
  },
];

const STATS = [
  { value: "3 min", label: "To integrate approvals into any product via API" },
  { value: "100K+", label: "Concurrent transactions supported" },
  { value: "1 API call", label: "To create a submission and start the flow" },
  { value: "Zero", label: "Custom code needed for approval logic" },
];

const BEFORE_AFTER = [
  {
    scenario: "Adding approvals to a product",
    before: "4-6 weeks of custom engineering",
    after: "1 API call. Done in hours.",
  },
  {
    scenario: "User checks request status",
    before: 'Forwards email: "Hi, any update?"',
    after: "Real-time tracker: Step 2 of 3",
  },
  {
    scenario: "Approver goes on leave",
    before: "Request stuck indefinitely",
    after: "Chase reminders every 72h + stuckWith API",
  },
  {
    scenario: "Audit asks for approval history",
    before: "Search inbox for 6 months of emails",
    after: "Immutable audit trail, queryable API",
  },
  {
    scenario: "New tenant onboards",
    before: "Rebuild flows from scratch",
    after: "Mint API key, define workflow, done",
  },
];

const HOW_STEPS = [
  {
    title: "Get an API key",
    desc: "Create an organization and mint a scoped API key from the admin dashboard.",
  },
  {
    title: "Define a workflow",
    desc: "POST your approval chain: steps, roles, labels. Or use the embeddable drag-and-drop builder.",
  },
  {
    title: "Create submissions",
    desc: "POST a submission with workflow ID and payload. The approval flow starts immediately.",
  },
  {
    title: "Approvers act",
    desc: "Approve, reject, or send back — via your UI, the embedded inbox, or direct API calls.",
  },
  {
    title: "Your product gets a webhook",
    desc: "submission.approved fires. Your product takes the next action — publish, process, release.",
  },
];

const INTEGRATION_METHODS = [
  {
    title: "REST API",
    desc: "Full CRUD for workflows, submissions, webhooks, and analytics. OpenAPI 3.0 spec included.",
    link: "https://github.com/guangshinhaha/approve-sg/blob/main/approvesg-skill/assets/openapi.yaml",
    linkLabel: "View OpenAPI Spec",
  },
  {
    title: "Embeddable UI",
    desc: "Drop iframe components into your product: inbox, workflow builder, submission timeline, analytics. Themed to your brand.",
    link: "https://github.com/guangshinhaha/approve-sg/blob/main/approvesg-skill/references/embed-integration.md",
    linkLabel: "Embed Guide",
  },
  {
    title: "Claude Skill",
    desc: "Tell Claude 'integrate ApproveSG' or 'find approval opportunities' and it writes the code. Scans for hand-rolled approvals too.",
    link: "https://github.com/guangshinhaha/approve-sg#claude-skill--integrate-approvesg-with-ai-assistance",
    linkLabel: "Install Skill",
  },
];

/* ─── Page ─────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-approve-surface">
      <LandingNav />

      {/* Hero */}
      <section className="bg-approve-primary-light">
        <div className="mx-auto max-w-content px-5 pb-10 pt-10 text-center sm:pb-16 sm:pt-16">
          <FadeInSection>
            <span className="inline-block rounded-badge border border-approve-primary/20 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wider text-approve-primary">
              Multi-Tenant Approval Engine &middot; API-Ready &middot; Cloud-Native
            </span>
          </FadeInSection>
          <FadeInSection delay={100}>
            <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-tight text-grey-700 sm:text-4xl lg:text-5xl">
              Plug-and-play approval workflows for any product.
            </h1>
          </FadeInSection>
          <FadeInSection delay={200}>
            <p className="mx-auto mt-4 max-w-2xl text-base text-approve-text-secondary sm:text-lg">
              One API. Any product plugs in. Multi-tenant, configurable per organization, embeddable
              UI, AI-assisted integration. Approvals are configured — not coded.
            </p>
          </FadeInSection>
          <FadeInSection delay={300}>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-btn bg-approve-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-approve-primary-dark"
              >
                Try the Demo <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="https://github.com/guangshinhaha/approve-sg"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-btn border border-approve-border bg-white px-6 py-3 text-sm font-semibold text-grey-700 transition-colors hover:bg-grey-100"
              >
                View on GitHub <Code2 className="h-4 w-4" />
              </a>
            </div>
          </FadeInSection>
          <FadeInSection delay={400}>
            <HeroAnimation />
          </FadeInSection>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-white py-10 sm:py-16">
        <div className="mx-auto max-w-content px-5">
          <FadeInSection>
            <h2 className="text-center text-2xl font-bold text-grey-700 sm:text-3xl">
              Every product rebuilds the same thing.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-approve-text-secondary">
              Approval workflows are table stakes — but every team builds them from scratch. Status
              enums, email notifications, audit trails, role routing. Weeks of engineering,
              every time.
            </p>
          </FadeInSection>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((stat, i) => (
              <FadeInSection key={i} delay={i * 100}>
                <div className="rounded-card border border-approve-border p-4 text-center md:p-5">
                  <p className="text-2xl font-bold text-grey-700 sm:text-3xl">{stat.value}</p>
                  <p className="mt-1 text-xs text-approve-text-secondary">{stat.label}</p>
                </div>
              </FadeInSection>
            ))}
          </div>

          {/* Before/After table */}
          <FadeInSection delay={100} className="mt-8">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-approve-border">
                    <th className="py-3 pr-4 text-left font-semibold text-grey-700">Scenario</th>
                    <th className="px-4 py-3 text-left font-semibold text-status-rejected">
                      Building it yourself
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-status-approved">
                      With ApproveSG
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {BEFORE_AFTER.map((row, i) => (
                    <tr key={i} className="border-b border-approve-border">
                      <td className="py-3 pr-4 font-medium text-grey-700">{row.scenario}</td>
                      <td className="bg-status-rejected-bg/50 px-4 py-3 text-approve-text-secondary">
                        {row.before}
                      </td>
                      <td className="bg-status-approved-bg/50 px-4 py-3 text-approve-text-secondary">
                        {row.after}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Integration Methods */}
      <section className="bg-approve-primary py-10 sm:py-16">
        <div className="mx-auto max-w-content px-5">
          <FadeInSection>
            <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
              Three ways to integrate
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/70">
              Use the API directly, embed pre-built UI components, or let Claude write the
              integration for you.
            </p>
          </FadeInSection>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {INTEGRATION_METHODS.map((method, i) => (
              <FadeInSection key={i} delay={i * 100}>
                <div className="rounded-card border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                  <h3 className="text-base font-semibold text-white">{method.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{method.desc}</p>
                  <a
                    href={method.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white transition-colors"
                  >
                    {method.linkLabel} <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-approve-surface-alt py-10 sm:py-16">
        <div className="mx-auto max-w-content px-5">
          <FadeInSection>
            <h2 className="text-center text-2xl font-bold text-grey-700 sm:text-3xl">
              Everything you need. Nothing you don&apos;t.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-approve-text-secondary">
              API-first approval engine with multi-tenancy, embeddable UI, automated reminders,
              analytics, webhooks, and AI-assisted integration.
            </p>
          </FadeInSection>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <FadeInSection key={i} delay={i * 60}>
                <div className="rounded-card border border-approve-border bg-white p-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-approve-primary-light">
                    <f.icon className="h-5 w-5 text-approve-primary" strokeWidth={2} />
                  </div>
                  <h3 className="text-base font-semibold text-grey-700">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-approve-text-secondary">
                    {f.desc}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-10 sm:py-16">
        <div className="mx-auto max-w-content px-5">
          <FadeInSection>
            <h2 className="text-center text-2xl font-bold text-grey-700 sm:text-3xl">
              Integrate in 5 steps
            </h2>
          </FadeInSection>
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
            {/* Code snippet */}
            <FadeInSection>
              <div className="overflow-hidden rounded-card border border-grey-200">
                <div className="flex items-center gap-2 border-b border-grey-200 bg-grey-100 px-4 py-2">
                  <span className="h-3 w-3 rounded-full bg-grey-300" />
                  <span className="h-3 w-3 rounded-full bg-grey-300" />
                  <span className="h-3 w-3 rounded-full bg-grey-300" />
                  <span className="ml-2 text-xs text-grey-400">integrate.ts</span>
                </div>
                <pre className="overflow-x-auto bg-grey-700 p-5 text-sm leading-relaxed">
                  <code>
                    <span className="text-grey-400">{"// 1. Create a submission via API"}</span>
                    {"\n"}
                    <span className="text-blue-400">const</span>
                    <span className="text-grey-100"> res </span>
                    <span className="text-blue-400">= await</span>
                    <span className="text-yellow-300"> fetch</span>
                    <span className="text-grey-100">(</span>
                    {"\n"}
                    <span className="text-green-400">{`  'https://approve-sg.up.railway.app/api/v1/submissions'`}</span>
                    <span className="text-grey-100">, {"{"}</span>
                    {"\n"}
                    <span className="text-grey-100">  method: </span>
                    <span className="text-green-400">{`'POST'`}</span>
                    <span className="text-grey-100">,</span>
                    {"\n"}
                    <span className="text-grey-100">  headers: {"{"} </span>
                    <span className="text-green-400">{`'Authorization'`}</span>
                    <span className="text-grey-100">: </span>
                    <span className="text-green-400">{`\`Bearer \${API_KEY}\``}</span>
                    <span className="text-grey-100"> {"}"},</span>
                    {"\n"}
                    <span className="text-grey-100">  body: </span>
                    <span className="text-blue-400">JSON</span>
                    <span className="text-grey-100">.</span>
                    <span className="text-yellow-300">stringify</span>
                    <span className="text-grey-100">({"{"}</span>
                    {"\n"}
                    <span className="text-grey-100">    workflowId: </span>
                    <span className="text-green-400">{`'...'`}</span>
                    <span className="text-grey-100">,</span>
                    {"\n"}
                    <span className="text-grey-100">    submittedBy: </span>
                    <span className="text-green-400">{`'user@company.com'`}</span>
                    <span className="text-grey-100">,</span>
                    {"\n"}
                    <span className="text-grey-100">    payload: {"{"} title, amount {"}"}</span>
                    {"\n"}
                    <span className="text-grey-100">  {"}"})</span>
                    {"\n"}
                    <span className="text-grey-100">{"}"});</span>
                    {"\n\n"}
                    <span className="text-grey-400">{"// That's it. Routing, notifications,"}</span>
                    {"\n"}
                    <span className="text-grey-400">{"// chase reminders, audit trail — all handled."}</span>
                  </code>
                </pre>
              </div>
            </FadeInSection>

            {/* Steps */}
            <FadeInSection delay={150}>
              <div className="space-y-5">
                {HOW_STEPS.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-approve-primary text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-grey-700">{step.title}</h4>
                      <p className="mt-0.5 text-sm text-approve-text-secondary">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="bg-approve-surface-alt py-10 sm:py-16">
        <div className="mx-auto max-w-content px-5">
          <FadeInSection>
            <h2 className="text-center text-2xl font-bold text-grey-700 sm:text-3xl">
              One engine. Every use case.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-approve-text-secondary">
              Same API, different configurations. Each product gets the approval chain it needs —
              zero custom code.
            </p>
          </FadeInSection>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((uc, i) => (
              <FadeInSection key={i} delay={i * 80}>
                <div className="rounded-card border border-approve-border bg-white p-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-approve-primary-light">
                    <uc.icon className="h-5 w-5 text-approve-primary" strokeWidth={2} />
                  </div>
                  <h3 className="text-base font-semibold text-grey-700">{uc.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-approve-text-secondary">
                    {uc.desc}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Scale */}
      <section className="bg-white py-10 sm:py-16">
        <div className="mx-auto max-w-content px-5 text-center">
          <FadeInSection>
            <h2 className="text-2xl font-bold text-grey-700 sm:text-3xl">
              Engineered for extreme scale
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-approve-text-secondary">
              Transactional safety, SQL-level analytics, Redis-backed rate limiting, composite
              database indexes. Not a prototype — a production platform.
            </p>
          </FadeInSection>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            <FadeInSection delay={0}>
              <div className="rounded-card border border-approve-border p-6">
                <p className="text-3xl font-bold text-approve-primary">100K+</p>
                <p className="mt-1 text-sm text-approve-text-secondary">Concurrent transactions supported</p>
              </div>
            </FadeInSection>
            <FadeInSection delay={100}>
              <div className="rounded-card border border-approve-border p-6">
                <p className="text-3xl font-bold text-approve-primary">0 ms</p>
                <p className="mt-1 text-sm text-approve-text-secondary">Approval latency from blocking IO</p>
              </div>
            </FadeInSection>
            <FadeInSection delay={200}>
              <div className="rounded-card border border-approve-border p-6">
                <p className="text-3xl font-bold text-approve-primary">0 rows</p>
                <p className="mt-1 text-sm text-approve-text-secondary">Loaded into memory for analytics</p>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-approve-primary py-10 sm:py-16">
        <div className="mx-auto max-w-content px-5 text-center">
          <FadeInSection>
            <h2 className="mx-auto max-w-2xl text-2xl font-bold text-white sm:text-3xl">
              Stop building approval logic. Start shipping your product.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/70">
              Multi-tenant, API-ready, embeddable, with Claude skill for AI-assisted integration.
              Free to use. Open source.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-btn bg-white px-8 py-4 text-base font-semibold text-approve-primary transition-colors hover:bg-grey-100"
              >
                Try the Demo <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/guangshinhaha/approve-sg"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-btn border border-white/30 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                GitHub <Code2 className="h-5 w-5" />
              </a>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-approve-border bg-white py-6">
        <div className="mx-auto max-w-content px-5 text-center text-xs text-approve-text-secondary">
          ApproveSG — Multi-tenant approval engine. API-first. Embeddable. Open source.
        </div>
      </footer>
    </div>
  );
}
