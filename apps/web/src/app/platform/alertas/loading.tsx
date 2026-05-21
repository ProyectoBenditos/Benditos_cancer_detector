import { PageContainer } from "@/components/ui/PageContainer";

export default function AlertasLoading() {
    return (
        <PageContainer>
            <div className="mb-8">
                <div className="h-7 w-64 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-80 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-20 bg-slate-200 rounded-2xl mb-6 animate-pulse" />
            <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl h-24 animate-pulse" />
                ))}
            </div>
        </PageContainer>
    );
}
