"use client";

import {
  Plug,
  Building2,
  Settings,
  Users,
  BarChart3,
  ScrollText,
  Megaphone,
  ClipboardList,
  GraduationCap,
  DollarSign,
  FileText,
  Plane,
  ArrowRight,
  ArrowDown,
  Check,
  X as XIcon,
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
    desc: "REST API that any product calls. No UI opinions. Your product owns the experience — ApproveSG handles the state machine underneath.",
  },
  {
    icon: Building2,
    title: "Multi-Tenant by Design",
    desc: "Every school, division, or agency is fully isolated. Row-Level Security enforced at database layer. School A never sees School B.",
  },
  {
    icon: Settings,
    title: "Configurable Approval Chains",
    desc: "Each tenant defines their own steps. Add, remove, reorder. Assign roles per step. Templates for common patterns — customise from there.",
  },
  {
    icon: Users,
    title: "Role-Based Routing",
    desc: "Assign approvers by role (HOD, VP, Director), not by email. When a person changes role, pending approvals follow the role — not the person.",
  },
  {
    icon: BarChart3,
    title: "Cross-Product Analytics",
    desc: "See approval bottlenecks across all consuming products. Which step takes longest? Which tenant is slowest? Data no siloed tool can provide.",
  },
  {
    icon: ScrollText,
    title: "Immutable Audit Trail",
    desc: "Every action logged: who approved, when, at which step, with what comments. Queryable, exportable, compliance-ready.",
  },
];

const USE_CASES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Megaphone,
    title: "Parent Announcements",
    desc: "Teacher drafts. HOD reviews content. VP approves. Auto-publishes to parents via Parents Gateway.",
  },
  {
    icon: ClipboardList,
    title: "Survey Requests",
    desc: "Researcher submits study. School DEFREP endorses. SOPB checks capacity. Approved or escalated with full audit trail.",
  },
  {
    icon: GraduationCap,
    title: "Student Profiles (HDP)",
    desc: "Form teacher drafts holistic profile. HOD reviews. Principal signs off before parent release.",
  },
  {
    icon: DollarSign,
    title: "Procurement",
    desc: "Officer submits purchase request. Routes by dollar value: section head ($5k), director ($50k), PS ($500k).",
  },
  {
    icon: FileText,
    title: "Content Publishing",
    desc: "Comms officer drafts press release. Comms Director approves. Auto-publishes to agency website.",
  },
  {
    icon: Plane,
    title: "Travel & Leave",
    desc: "Officer submits request. Reporting Officer approves. HR logs. Same pattern, every ministry.",
  },
];

const STATS = [
  { value: "4-6 wks", label: "Engineering time wasted per product rebuilding approvals" },
  { value: "0%", label: "Visibility into where your request is stuck" },
  { value: "0", label: "Audit trail when approvals live in email" },
  { value: "Endless", label: "Email chains per approval cycle" },
];

const BEFORE_AFTER = [
  {
    scenario: "Adding approvals to a product",
    before: "4-6 weeks of custom engineering",
    after: "1 API call. Done in hours.",
  },
  {
    scenario: "Officer checks request status",
    before: 'Forwards email: "Hi, any update?"',
    after: "Real-time tracker: Step 2 of 3",
  },
  {
    scenario: "Approver goes on leave",
    before: "Request stuck indefinitely",
    after: "Auto-delegates to backup",
  },
  {
    scenario: "Audit asks for approval history",
    before: "Search inbox for 6 months of emails",
    after: "Immutable audit trail, exportable",
  },
  {
    scenario: "New school / agency onboards",
    before: "Rebuild flows from scratch",
    after: "Select template, configure in 60s",
  },
];

const HOW_STEPS = [
  {
    title: "Your product calls the API",
    desc: "POST a submission with workflow type and payload. One endpoint.",
  },
  {
    title: "ApproveSG reads the tenant config",
    desc: "Looks up the approval chain for this school/agency. Creates step instances.",
  },
  {
    title: "Approvers get notified",
    desc: "Email + in-app notification to the right person based on their role.",
  },
  {
    title: "Actions flow through the chain",
    desc: "Approve, next step. Reject, back to submitter. Send back, revision. All logged.",
  },
  {
    title: "Your product gets a webhook",
    desc: "submission.approved fires. Your product takes the next action — publish, process, release.",
  },
];

const SCALE_CARDS = [
  {
    title: "MOE",
    desc: "33,000 teachers, 350+ schools. Approvals for announcements, surveys, student profiles, programmes.",
  },
  {
    title: "Any Ministry",
    desc: "Procurement, leave, travel, content publishing. Same pattern, different configs.",
  },
  {
    title: "Whole-of-Government",
    desc: "One shared service on SGTS. Any agency onboards in hours, not months.",
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
              Approval Workflows as a Shared Service
            </span>
          </FadeInSection>
          <FadeInSection delay={100}>
            <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-tight text-grey-700 sm:text-4xl lg:text-5xl">
              Stop rebuilding approvals. Start shipping products.
            </h1>
          </FadeInSection>
          <FadeInSection delay={200}>
            <p className="mx-auto mt-4 max-w-2xl text-base text-approve-text-secondary sm:text-lg">
              One API. Any government product plugs in. Configurable per school, per agency, per
              team. Approvals are configured — not coded.
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
              <button
                onClick={() =>
                  document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-2 rounded-btn border border-approve-border bg-white px-6 py-3 text-sm font-semibold text-grey-700 transition-colors hover:bg-grey-100"
              >
                See How It Works <ArrowDown className="h-4 w-4" />
              </button>
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
              The problem is everywhere.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-approve-text-secondary">
              Every product team builds the same approval logic from scratch. Every officer chases
              approvals through email. Every audit finds gaps.
            </p>
          </FadeInSection>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((stat, i) => (
              <FadeInSection key={i} delay={i * 100}>
                <div className="rounded-card border border-approve-border p-5 text-center">
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
                      Today
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

      {/* Features */}
      <section id="features" className="bg-approve-surface-alt py-10 sm:py-16">
        <div className="mx-auto max-w-content px-5">
          <FadeInSection>
            <h2 className="text-center text-2xl font-bold text-grey-700 sm:text-3xl">
              Built for platform teams. Loved by product teams.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-approve-text-secondary">
              Everything you need to add approval workflows to any product — without building an
              approval engine.
            </p>
          </FadeInSection>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <FadeInSection key={i} delay={i * 80}>
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
              How it works
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
                  <span className="ml-2 text-xs text-grey-400">submit.ts</span>
                </div>
                <pre className="overflow-x-auto bg-grey-700 p-5 text-sm leading-relaxed">
                  <code>
                    <span className="text-grey-400">{"// Submit any item for approval — 3 lines"}</span>
                    {"\n"}
                    <span className="text-blue-400">const</span>
                    <span className="text-grey-100"> approval </span>
                    <span className="text-blue-400">= await</span>
                    <span className="text-yellow-300"> fetch</span>
                    <span className="text-grey-100">(</span>
                    <span className="text-green-400">{`'/api/submissions'`}</span>
                    <span className="text-grey-100">, {"{"}</span>
                    {"\n"}
                    <span className="text-grey-100">  method: </span>
                    <span className="text-green-400">{`'POST'`}</span>
                    <span className="text-grey-100">,</span>
                    {"\n"}
                    <span className="text-grey-100">  body: </span>
                    <span className="text-blue-400">JSON</span>
                    <span className="text-grey-100">.</span>
                    <span className="text-yellow-300">stringify</span>
                    <span className="text-grey-100">({"{"}</span>
                    {"\n"}
                    <span className="text-grey-100">    workflow_type: </span>
                    <span className="text-green-400">{`'announcement_approval'`}</span>
                    <span className="text-grey-100">,</span>
                    {"\n"}
                    <span className="text-grey-100">    payload: {"{"} title, content, recipients {"}"}</span>
                    {"\n"}
                    <span className="text-grey-100">  {"}"})</span>
                    {"\n"}
                    <span className="text-grey-100">{"}"});</span>
                    {"\n\n"}
                    <span className="text-grey-400">{"// That's it. Routing, notifications, audit — handled."}</span>
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

      {/* Comparison */}
      <section id="compare" className="bg-white py-10 sm:py-16">
        <div className="mx-auto max-w-content px-5">
          <FadeInSection>
            <h2 className="text-center text-2xl font-bold text-grey-700 sm:text-3xl">
              Why not use what&apos;s already out there?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-approve-text-secondary">
              We evaluated every WOG product. None were built for this.
            </p>
          </FadeInSection>
          <FadeInSection delay={100} className="mt-8">
            <ComparisonTable />
          </FadeInSection>
          <FadeInSection delay={200}>
            <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-approve-text-secondary">
              ApplySG is great when you&apos;re building a new form-based scheme. But what about the
              80% of approvals inside existing systems? They don&apos;t need a form builder. They
              need an approval API.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Scale */}
      <section className="bg-approve-primary py-10 sm:py-16">
        <div className="mx-auto max-w-content px-5 text-center">
          <FadeInSection>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Built for MOE. Scales to all of government.
            </h2>
            <p className="mx-auto mt-6 text-6xl font-bold text-white sm:text-7xl">150,000</p>
            <p className="mt-2 text-sm font-medium text-white/80">
              public officers across Singapore government
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
              Every ministry, every statutory board, every agency has the same pattern: officer
              submits, needs N levels of approval, nobody knows where it&apos;s stuck, no audit
              trail. ApproveSG solves this once, for everyone.
            </p>
          </FadeInSection>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {SCALE_CARDS.map((card, i) => (
              <FadeInSection key={i} delay={i * 100}>
                <div className="rounded-card border border-white/20 bg-white/10 p-6 text-left backdrop-blur-sm">
                  <h3 className="text-base font-semibold text-white">{card.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{card.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-approve-surface-alt py-10 sm:py-16">
        <div className="mx-auto max-w-content px-5 text-center">
          <FadeInSection>
            <h2 className="mx-auto max-w-2xl text-2xl font-bold text-grey-700 sm:text-3xl">
              Every product team builds approval workflows from scratch. What if none of them had
              to?
            </h2>
            <div className="mt-7">
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-btn bg-approve-primary px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-approve-primary-dark"
              >
                Try the Demo <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-approve-border bg-white py-6">
        <div className="mx-auto max-w-content px-5 text-center text-xs text-approve-text-secondary">
          ApproveSG — A shared approval engine for Singapore government agencies.
        </div>
      </footer>
    </div>
  );
}
