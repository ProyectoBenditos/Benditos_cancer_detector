import { PageContainer } from "@/components/ui/PageContainer";

export default function PacientesLoading() {
  return (
    <PageContainer>
      <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mb-2" />
      <div className="h-4 w-64 bg-slate-100 rounded-lg animate-pulse mb-8" />
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-6 px-6 py-4 border-b border-slate-50">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
