import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PRACTICE_FOOTER } from "@/lib/practiceCases";
import { PracticeSession } from "./PracticeSession";

export default async function PracticaPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return (
        <PageContainer>
            <SectionHeader
                title="Modo práctica"
                description="Busca nódulos en cortes públicos de tomografía y compara tus marcas con la referencia de los radiólogos."
            />
            <PracticeSession />
            <footer className="mt-10 border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500">{PRACTICE_FOOTER}</p>
            </footer>
        </PageContainer>
    );
}
