import { PageContainer } from "@/components/ui/PageContainer";

export default function DashboardLoading() {
    return (
        <PageContainer>
            <div className="bg-slate-200 rounded-2xl h-32 mb-8 animate-pulse" />
            <div className="space-y-8">
                <div>
                    <div className="h-3 w-40 bg-slate-200 rounded mb-4 animate-pulse" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 h-32 animate-pulse" />
                        ))}
                    </div>
                </div>
                <div>
                    <div className="h-3 w-40 bg-slate-200 rounded mb-4 animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="bg-slate-200 rounded-2xl h-32 animate-pulse" />
                        ))}
                    </div>
                </div>
                <div>
                    <div className="h-3 w-40 bg-slate-200 rounded mb-4 animate-pulse" />
                    <div className="bg-white border border-slate-200 rounded-2xl h-64 animate-pulse" />
                </div>
            </div>
        </PageContainer>
    );
}
