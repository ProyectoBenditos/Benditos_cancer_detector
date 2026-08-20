import { redirect } from "next/navigation";

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function AnalyzeRedirectPage({ params }: PageProps) {
    const { id } = await params;
    redirect(`/platform/uploads/${id}`);
}
