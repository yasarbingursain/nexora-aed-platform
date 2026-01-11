import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Hero } from '@/components/marketing/Hero';
import { TrustStrip } from '@/components/marketing/TrustStrip';
import { ProductPreview } from '@/components/marketing/ProductPreview';
import { Problem } from '@/components/marketing/Problem';
import { WhatWeDo } from '@/components/marketing/WhatWeDo';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { OperatingModel } from '@/components/marketing/OperatingModel';
import { WhoItsFor } from '@/components/marketing/WhoItsFor';
import { UseCases } from '@/components/marketing/UseCases';
import { Integrations } from '@/components/marketing/Integrations';
import { TrustSection } from '@/components/marketing/TrustSection';
import { Pricing } from '@/components/marketing/Pricing';
import { FinalCTA } from '@/components/marketing/FinalCTA';

export const metadata = {
  title: 'Nexora | Autonomous Entity Defense for Non-Human Identities',
  description: 'Monitor machine identity behavior, enforce policy at the access layer, and automate safe containment for compromised tokens and autonomous systems.',
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <MarketingHeader />
      
      <Hero
        headline="Autonomous Entity Defense for Non-Human Identities and AI Agents"
        subheadline="Nexora monitors machine identity behavior, enforces policy at the access layer, and automates safe containment—so compromised tokens and autonomous systems don't become breach paths."
        primaryCta={{ label: "Get a 15-minute Architecture Walkthrough", href: "/contact" }}
        secondaryCta={{ label: "See Live Demo", href: "/demo" }}
        note="Works across cloud, on-prem, and hybrid environments. No hard dependencies on your identity provider."
      />

      <TrustStrip
        items={[
          "Tenant isolation",
          "Evidence-grade audit trails",
          "Policy-driven automation",
          "Built for SOC 2 readiness"
        ]}
      />

      <Problem
        title="Your largest attack surface isn't human. It's autonomous."
        body="Most organizations can tell you who has access. Far fewer can tell you what their service accounts, API tokens, integrations, bots, and agentic workflows are doing—right now."
        bullets={[
          "Non-human identities often outnumber employees and rarely get reviewed.",
          "Integrations and automation are frequently over-privileged by default.",
          "When machine identities are compromised, they move quietly and fast."
        ]}
      />

      <WhatWeDo
        title="Detect. Govern. Contain. Prove."
        items={[
          {
            title: "Detect behavioral misuse",
            body: "Identify abnormal patterns across tokens, service accounts, integrations, bots, and agents—without requiring you to rewrite applications."
          },
          {
            title: "Govern access with policy",
            body: "Enforce least privilege using tenant-aware policies and environment boundaries (prod vs non-prod) to reduce blast radius."
          },
          {
            title: "Contain safely",
            body: "Trigger controlled containment workflows: isolate identities, force rotation, revoke access, or block suspicious integration paths—based on policy."
          },
          {
            title: "Prove with evidence",
            body: "Maintain evidence-grade audit trails that show what happened, who/what initiated it, what changed, and why."
          }
        ]}
      />

      <HowItWorks
        title="A control plane for autonomous access."
        steps={[
          {
            title: "Ingest identity signals",
            body: "Bring in telemetry from your cloud, IAM, integrations, CI/CD, and application layers."
          },
          {
            title: "Correlate behavior",
            body: "Detect misuse patterns, privilege drift, and anomalous sequences."
          },
          {
            title: "Enforce policy",
            body: "Apply tenant-isolated policies to govern access and response."
          },
          {
            title: "Automate response",
            body: "Execute safe containment actions with approvals where needed."
          },
          {
            title: "Record evidence",
            body: "Log every high-impact action with traceability for audit and incident review."
          }
        ]}
        note="Some integrations and response actions may be deployed in 'observe-only' mode until you enable enforcement."
      />

      <OperatingModel
        title="The Nexora AED operating model"
        pillars={[
          {
            title: "Identity inventory",
            body: "what exists, where it lives, what it can access"
          },
          {
            title: "Behavior analytics & deception",
            body: "what's abnormal, what's baited, what's exploited"
          },
          {
            title: "Intelligence ingestion & sharing (opt-in)",
            body: "what's known, what's emerging"
          },
          {
            title: "Automated containment workflows",
            body: "what we do, safely and consistently"
          },
          {
            title: "Evidence & reporting",
            body: "what we prove, export, and review"
          }
        ]}
      />

      <WhoItsFor
        title="Built for the teams responsible when it goes wrong."
        audiences={[
          {
            title: "Security Operations (SOC)",
            body: "Triage faster with clear context, safer actions, and consistent response workflows."
          },
          {
            title: "Platform / Cloud Security",
            body: "Reduce uncontrolled access paths across service identities and integrations."
          },
          {
            title: "Engineering Leadership",
            body: "Secure CI/CD identities, secrets exposure response, and autonomous workflows without breaking delivery velocity."
          },
          {
            title: "Compliance & Audit",
            body: "Export evidence-grade logs and show exactly what changed and why."
          }
        ]}
      />

      <UseCases
        title="Common ways teams deploy Nexora"
        cases={[
          "Compromised API token detection and containment",
          "Rogue OAuth/integration misuse and abnormal access sequences",
          "Service account privilege drift and unauthorized behavior patterns",
          "CI/CD identity misuse following secret exposure",
          "Bot and agent activity monitoring with policy-driven response",
          "Audit-ready reporting and evidence export for investigations"
        ]}
      />

      <Integrations
        title="Integrate without ripping and replacing."
        disclaimer="Availability depends on plan and deployment mode. Start in observe-only mode, then enable enforcement once comfortable with policy behavior."
        items={[
          { name: "GitHub Actions", status: "Available" },
          { name: "AWS IAM", status: "Available" },
          { name: "Azure AD", status: "Available" },
          { name: "Google Cloud IAM", status: "Available" },
          { name: "Kubernetes", status: "Available" },
          { name: "Docker", status: "Early Access" },
          { name: "Jenkins", status: "Early Access" },
          { name: "GitLab CI", status: "Early Access" },
          { name: "Terraform Cloud", status: "Roadmap" },
          { name: "CircleCI", status: "Roadmap" },
          { name: "Okta", status: "Roadmap" },
          { name: "Auth0", status: "Roadmap" }
        ]}
      />

      <TrustSection
        title="Built for teams who need evidence, not promises."
        bullets={[
          "Tenant-isolated design and strict data boundaries",
          "Policy-driven enforcement with least-privilege principles",
          "Audit-ready event logging and traceability for high-impact actions",
          "Responsible disclosure and security reporting process"
        ]}
        link={{ label: "Read Trust & Security", href: "/trust" }}
      />

      <Pricing
        title="Pricing that scales with your risk profile."
        tiers={[
          {
            name: "Starter",
            description: "visibility and detection for core non-human identities",
            highlights: [
              "Identity inventory and discovery",
              "Behavioral anomaly detection",
              "Basic audit logging",
              "Community support"
            ]
          },
          {
            name: "Growth",
            description: "policy enforcement and automated workflows",
            highlights: [
              "Everything in Starter",
              "Policy-driven containment",
              "Automated response workflows",
              "Integration with CI/CD",
              "Email support"
            ]
          },
          {
            name: "Enterprise",
            description: "advanced controls, audit exports, SSO options, and tailored deployment",
            highlights: [
              "Everything in Growth",
              "Advanced threat intelligence",
              "Custom policy frameworks",
              "SSO and SAML integration",
              "Dedicated support",
              "SLA guarantees"
            ]
          }
        ]}
        cta={{ label: "Get pricing", href: "/contact" }}
      />

      <FinalCTA
        title="Stop treating autonomous access as a blind spot."
        body="Get a short walkthrough and see how Nexora maps identity behavior to enforceable policies and safe containment actions."
        primaryCta={{ label: "Get a 15-minute Architecture Walkthrough", href: "/contact" }}
        secondaryCta={{ label: "See Live Demo", href: "/demo" }}
      />

      <MarketingFooter />
    </main>
  );
}
