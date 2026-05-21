import { PageContainer } from "@/components/ui/PageContainer";

export default function UploadsLoading() {
    return (
        <PageContainer>
            <div className="mb-8">
                <div className="h-7 w-72 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-12 bg-slate-200 rounded-xl mb-6 animate-pulse" />
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="h-12 bg-slate-100 animate-pulse" />
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 border-t border-slate-100 bg-white animate-pulse" />
                ))}
            </div>
        </PageContainer>
    );
}
