import { PageContainer } from "@/components/ui/PageContainer";

export default function AnalyzeLoading() {
    return (
        <PageContainer maxWidth="4xl">
            <div className="mb-8">
                <div className="h-7 w-72 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-8">
                <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="h-12 w-48 bg-slate-200 rounded-xl animate-pulse" />
            </div>
        </PageContainer>
    );
}
