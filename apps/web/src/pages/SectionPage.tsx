import { DashboardLayout } from "@/components/DashboardLayout";

interface SectionPageProps {
  title: string;
  description: string;
}

export default function SectionPage({ title, description }: SectionPageProps) {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </header>

        <section className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Esta área já está acessível e pronta para receber os módulos desta seção.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}
