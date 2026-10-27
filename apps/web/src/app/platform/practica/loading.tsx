import { PageContainer } from "@/components/ui/PageContainer";

export default function PracticaLoading() {
    return (
        <PageContainer>
            <div className="mb-8">
                <div className="h-7 w-48 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-full max-w-md bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
                <div className="bg-white border border-slate-200 rounded-2xl h-80 animate-pulse" />
                <div className="bg-white border border-slate-200 rounded-2xl h-80 animate-pulse" />
            </div>
        </PageContainer>
    );
}
