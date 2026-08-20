"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TableWrapper, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RiskBadge, type RiskLevel } from "@/components/ui/RiskBadge";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";

export type UploadRecord = {
  id: string;
  original_name: string;
  modality: string | null;
  study_date: string | null;
  patient_id_dicom: string | null;
  upload_status: string;
  created_at: string;
  file_type: string;
  ai_score: number | null;
  ai_risk_level: string | null;
  batch_id: string | null;
  metadata_json: {
    case_ref?: string;
    batch_sequence?: number;
    [key: string]: any;
  } | null;
};

type GroupedBatch = {
  batch_id: string;
  batch_sequence?: number;
  created_at: string;
  items: UploadRecord[];
  highest_risk: RiskLevel | null;
  avg_score: number | null;
  status: string;
};

type ItemOrGroup =
  | { type: "single"; record: UploadRecord }
  | { type: "batch"; group: GroupedBatch };

const RISK_WEIGHT: Record<string, number> = {
  ALTO: 3,
  MEDIO: 2,
  BAJO: 1,
};

function getHighestRisk(items: UploadRecord[]): RiskLevel | null {
  let highest: string | null = null;
  let maxWeight = 0;

  for (const item of items) {
    if (item.ai_risk_level && RISK_WEIGHT[item.ai_risk_level]) {
      const w = RISK_WEIGHT[item.ai_risk_level];
      if (w > maxWeight) {
        maxWeight = w;
        highest = item.ai_risk_level;
      }
    }
  }
  return highest as RiskLevel | null;
}

export function BatchHistoryTable({ uploads }: { uploads: UploadRecord[] }) {
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  const toggleBatch = (batchId: string) => {
    setExpandedBatches((prev) => ({
      ...prev,
      [batchId]: !prev[batchId],
    }));
  };

  // Group uploads by batch_id or keep single
  const itemsOrGroups: ItemOrGroup[] = [];
  const batchMap = new Map<string, UploadRecord[]>();
  const processedBatchIds = new Set<string>();

  // Collect batch items
  for (const upload of uploads) {
    if (upload.batch_id) {
      if (!batchMap.has(upload.batch_id)) {
        batchMap.set(upload.batch_id, []);
      }
      batchMap.get(upload.batch_id)!.push(upload);
    }
  }

  // Build sorted items/groups preserving order of latest created_at
  for (const upload of uploads) {
    if (upload.batch_id) {
      if (!processedBatchIds.has(upload.batch_id)) {
        processedBatchIds.add(upload.batch_id);
        const batchItems = batchMap.get(upload.batch_id)!;
        const highestRisk = getHighestRisk(batchItems);
        const scores = batchItems.map((i) => i.ai_score).filter((s): s is number => s !== null);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

        // Sequence number from metadata or 1
        const seq = batchItems[0]?.metadata_json?.batch_sequence;

        itemsOrGroups.push({
          type: "batch",
          group: {
            batch_id: upload.batch_id,
            batch_sequence: seq,
            created_at: upload.created_at,
            items: batchItems,
            highest_risk: highestRisk,
            avg_score: avgScore,
            status: batchItems.every((i) => i.upload_status === "analyzed" || i.upload_status === "ai_completed")
              ? "analyzed"
              : batchItems.some((i) => i.upload_status === "processing")
              ? "processing"
              : "queued",
          },
        });
      }
    } else {
      itemsOrGroups.push({
        type: "single",
        record: upload,
      });
    }
  }

  return (
    <TableWrapper>
      <TableHead>
        <tr>
          <TableHeaderCell>Archivo / Descripción</TableHeaderCell>
          <TableHeaderCell>Tipo</TableHeaderCell>
          <TableHeaderCell>Referencia</TableHeaderCell>
          <TableHeaderCell>Modalidad</TableHeaderCell>
          <TableHeaderCell>Fecha Estudio</TableHeaderCell>
          <TableHeaderCell>Riesgo IA</TableHeaderCell>
          <TableHeaderCell>Score IA</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell>Ingresado</TableHeaderCell>
          <TableHeaderCell className="text-right">Acción</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {itemsOrGroups.map((entry) => {
          if (entry.type === "single") {
            const upload = entry.record;
            const isAnalysis = upload.file_type === "png_analysis";
            const detailHref = isAnalysis
              ? `/platform/analyze/${upload.id}`
              : `/platform/uploads/${upload.id}`;

            return (
              <TableRow key={upload.id}>
                <TableCell className="font-bold text-slate-800 truncate max-w-[170px]" title={upload.original_name}>
                  {upload.original_name}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
                    isAnalysis
                      ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    {isAnalysis ? "IA" : "DICOM"}
                  </span>
                </TableCell>
                <TableCell className="text-slate-600 truncate max-w-[120px]" title={upload.metadata_json?.case_ref ?? ""}>
                  {upload.metadata_json?.case_ref ? (
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-xs font-medium">
                      {upload.metadata_json.case_ref}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>{upload.modality ?? "N/D"}</TableCell>
                <TableCell className="text-slate-500">{upload.study_date ?? "N/D"}</TableCell>
                <TableCell>
                  <RiskBadge level={upload.ai_risk_level as RiskLevel | null} />
                </TableCell>
                <TableCell className="text-slate-700 font-medium">
                  {upload.ai_score != null ? `${(upload.ai_score * 100).toFixed(1)}%` : <span className="text-slate-400 text-xs">—</span>}
                </TableCell>
                <TableCell>
                  <StatusBadge status={upload.upload_status} />
                </TableCell>
                <TableCell className="text-slate-500 text-xs">
                  {new Date(upload.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <Link
                    href={detailHref}
                    className="text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 rounded text-xs font-semibold"
                  >
                    {isAnalysis ? "Ver IA" : "Ver detalle"}
                  </Link>
                </TableCell>
              </TableRow>
            );
          }

          // Render Grouped Batch Row (Accordion)
          const group = entry.group;
          const isExpanded = !!expandedBatches[group.batch_id];
          const batchCode = group.batch_sequence ? `batch_${String(group.batch_sequence).padStart(3, "0")}` : `batch_001`;

          return (
            <React.Fragment key={`batch-${group.batch_id}`}>
              <TableRow className="bg-slate-50/70 hover:bg-slate-100/80 transition-colors">
                <TableCell className="font-bold text-slate-800">
                  <button
                    type="button"
                    onClick={() => toggleBatch(group.batch_id)}
                    className="flex items-center gap-2 text-left hover:text-brand-primary transition-colors focus:outline-none"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-brand-primary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <Layers className="w-4 h-4 text-brand-primary" />
                    <span className="font-mono">{batchCode}</span>
                    <span className="text-xs font-normal text-slate-500">({group.items.length} imágenes)</span>
                  </button>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider bg-brand-primary/10 text-brand-primary border-brand-primary/20">
                    Lote
                  </span>
                </TableCell>
                <TableCell>
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-xs font-medium font-mono">
                    {group.items[0]?.metadata_json?.case_ref || batchCode}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-slate-200 text-slate-700">
                    Lote
                  </span>
                </TableCell>
                <TableCell className="text-slate-500">
                  {group.items[0]?.study_date ?? "N/D"}
                </TableCell>
                <TableCell>
                  <RiskBadge level={group.highest_risk} />
                </TableCell>
                <TableCell className="text-slate-700 font-medium">
                  {group.avg_score !== null ? (
                    <span title="Promedio del lote">{(group.avg_score * 100).toFixed(1)}%</span>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={group.status} />
                </TableCell>
                <TableCell className="text-slate-500 text-xs">
                  {new Date(group.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleBatch(group.batch_id)}
                    className="text-brand-primary hover:text-brand-primary-hover font-semibold text-xs inline-flex items-center gap-1 focus:outline-none"
                  >
                    {isExpanded ? "Ocultar" : "Ver IA"}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                </TableCell>
              </TableRow>

              {/* Sub-table when accordion is expanded */}
              {isExpanded && (
                <TableRow className="bg-slate-100/50">
                  <TableCell colSpan={10} className="p-0 border-b border-slate-200">
                    <div className="py-3 px-6 bg-slate-100/60 border-y border-slate-200/80">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Imágenes en este lote ({group.items.length})
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {group.items.map((subItem) => {
                          const subDetailHref = `/platform/analyze/${subItem.id}`;
                          return (
                            <div
                              key={subItem.id}
                              className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-4 py-2 text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                                  {subItem.original_name}
                                </span>
                                {subItem.patient_id_dicom && (
                                  <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    {subItem.patient_id_dicom}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                {subItem.ai_score !== null && (
                                  <span className="font-bold text-slate-700">
                                    {(subItem.ai_score * 100).toFixed(1)}%
                                  </span>
                                )}
                                <RiskBadge level={subItem.ai_risk_level as RiskLevel | null} />
                                <StatusBadge status={subItem.upload_status} />
                                <Link
                                  href={subDetailHref}
                                  className="text-brand-primary hover:underline font-semibold"
                                >
                                  Ver IA
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </TableWrapper>
  );
}
