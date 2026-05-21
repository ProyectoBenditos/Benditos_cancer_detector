"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";

export default function LogoutButton() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={loading}
            onClick={handleLogout}
        >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Cerrar sesión
        </Button>
    );
}
