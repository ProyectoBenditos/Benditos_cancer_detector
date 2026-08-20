import { PageContainer } from "@/components/ui/PageContainer";

export default function BatchLoading() {
  return (
    <PageContainer maxWidth="4xl">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-4 w-80 bg-slate-100 rounded" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    </PageContainer>
  );
}
