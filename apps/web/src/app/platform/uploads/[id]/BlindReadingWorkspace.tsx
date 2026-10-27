"use client";

import { useState } from "react";
import { StudyViewerTabs } from "@/components/dicom/StudyViewerTabs";
import type { ViewerAnnotations, ViewerSummary } from "@/components/ui/BeforeAfterViewer";
import type { SaveStatus } from "@/components/ui/useMarkerAutosave";
import type { PixelGeometry } from "@/lib/pixelGeometry";
import { BLIND_VIEWER_REASON } from "@/lib/blindReading";
import { BlindImpressionForm, IMPRESSION_ANCHOR_ID } from "./BlindImpressionForm";

// Lectura ciega pendiente. Las props no llevan nada que salga de la IA (score,
// riesgo, mapa de calor, lóbulo, modelo, corte analizado): se serializan al navegador.
type Props = {
    uploadId: string;
    beforeUrl: string | null;
    annotations: ViewerAnnotations;
    fileType?: string | null;
    pixelGeometry?: PixelGeometry | null;
};

const BLIND_SUMMARY: ViewerSummary = {
    score: null,
    riskLevel: null,
    review: null,
    reviewAnchorId: IMPRESSION_ANCHOR_ID,
};

export function BlindReadingWorkspace({ uploadId, beforeUrl, annotations, fileType, pixelGeometry }: Props) {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

    return (
        <>
            <div className="mb-6">
                <StudyViewerTabs
                    uploadId={uploadId}
                    beforeUrl={beforeUrl}
                    heatmapBase64={null}
                    summary={BLIND_SUMMARY}
                    annotations={{ ...annotations, onStatusChange: setSaveStatus }}
                    fileType={fileType}
                    pixelGeometry={pixelGeometry}
                    aiHiddenReason={BLIND_VIEWER_REASON}
                />
            </div>
            <BlindImpressionForm
                uploadId={uploadId}
                saveStatus={saveStatus}
                markersLoadFailed={annotations.loadFailed === true}
            />
        </>
    );
}
