import { PageContainer } from "@/components/ui/PageContainer";

export default function AjustesLoading() {
    return (
        <PageContainer maxWidth="3xl">
            <div className="mb-8">
                <div className="h-7 w-32 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-80 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl h-48 animate-pulse" />
                <div className="bg-white border border-slate-200 rounded-2xl h-32 animate-pulse" />
            </div>
        </PageContainer>
    );
}
