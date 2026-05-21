import { PageContainer } from "@/components/ui/PageContainer";

export default function ReportesLoading() {
    return (
        <PageContainer>
            <div className="mb-8">
                <div className="h-7 w-56 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-80 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl h-24 animate-pulse" />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl h-48 animate-pulse" />
                ))}
            </div>
        </PageContainer>
    );
}
