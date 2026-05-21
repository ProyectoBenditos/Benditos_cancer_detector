import { PageContainer } from "@/components/ui/PageContainer";

export default function UploadLoading() {
    return (
        <PageContainer maxWidth="4xl">
            <div className="mb-8">
                <div className="h-7 w-64 bg-slate-200 rounded mb-2 animate-pulse" />
                <div className="h-4 w-80 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
                <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-12 w-40 bg-slate-200 rounded-xl animate-pulse" />
            </div>
        </PageContainer>
    );
}
