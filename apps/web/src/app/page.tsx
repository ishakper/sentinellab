import { Shield, Activity, Lock, Smartphone, Server, FileSearch } from 'lucide-react';

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <Icon className="mb-4 h-8 w-8 text-primary" />
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SentinelLab</span>
          </div>
          <nav className="flex items-center gap-4">
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Sign In
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container flex flex-col items-center justify-center gap-8 py-24 text-center">
        <div className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
          <Activity className="h-4 w-4 text-green-500" />
          <span>Enterprise Security Platform</span>
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Android Security Testing &{' '}
          <span className="text-primary">Controlled Remote Support</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Comprehensive device security assessment, consent-driven remote diagnostics, and
          vulnerability management built with enterprise-grade security controls.
        </p>
      </section>

      {/* Features */}
      <section className="container pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Smartphone}
            title="Device Security Assessment"
            description="Root detection, encryption verification, permission auditing, and security patch analysis for Android devices."
          />
          <FeatureCard
            icon={Lock}
            title="Consent-Driven Remote Support"
            description="QR-based pairing with explicit user consent, hardware-backed device identity, and one-touch kill switch."
          />
          <FeatureCard
            icon={Server}
            title="Network & API Testing"
            description="Authorized subnet port scanning, TLS analysis, OWASP API verification, and traffic telemetry."
          />
          <FeatureCard
            icon={FileSearch}
            title="APK Static Analysis"
            description="Manifest auditing, debuggable flag detection, hardcoded secrets scanning, and dependency vulnerability checks."
          />
          <FeatureCard
            icon={Activity}
            title="Security Monitoring"
            description="Real-time SIEM-lite with anomaly detection, append-only audit logs, and automated security alerts."
          />
          <FeatureCard
            icon={Shield}
            title="Lab Simulator"
            description="Isolated containerized targets for authorized penetration testing with CVSS scoring and evidence collection."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <p>&copy; 2024 SentinelLab. All rights reserved.</p>
          <p>Built with security-first principles</p>
        </div>
      </footer>
    </main>
  );
}
