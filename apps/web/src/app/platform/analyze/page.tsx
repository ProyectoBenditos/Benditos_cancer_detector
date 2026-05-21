import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { AnalyzeForm } from "./AnalyzeForm";

export default function AnalyzePage() {
    return (
        <PageContainer maxWidth="4xl">
            <SectionHeader
                title="Análisis IA de nódulo pulmonar"
                description="Sube una imagen CT (PNG/JPG) e ingresa las 8 features clínicas. El modelo OncaScan AI devolverá score y nivel de riesgo."
                action={
                    <Link
                        href="/platform"
                        className={buttonVariants({ variant: "secondary", size: "md" })}
                    >
                        Cancelar y Volver
                    </Link>
                }
            />
            <Card>
                <CardContent className="p-8">
                    <AnalyzeForm />
                </CardContent>
            </Card>
        </PageContainer>
    );
}
