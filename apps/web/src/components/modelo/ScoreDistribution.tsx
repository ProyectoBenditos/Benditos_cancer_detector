"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { SCORE_HISTOGRAM } from "./modelData";

const RISK_COLORS: Record<string, string> = {
  BAJO:  "#22c55e",
  MEDIO: "#f59e0b",
  ALTO:  "#ef4444",
};

export default function ScoreDistribution() {
  return (
    <div className="w-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        Distribución de Scores
      </h3>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-xs font-medium text-slate-600">
        {Object.entries(RISK_COLORS).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ backgroundColor: color }}
            />
            {label}
          </div>
        ))}
      </div>

      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={SCORE_HISTOGRAM}
            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="binLabel"
              label={{
                value: "Score (0=sin riesgo, 1=alto riesgo)",
                position: "bottom",
                offset: 0,
              }}
              tick={{ fontSize: 10 }}
              interval={1}
            />
            <YAxis
              label={{
                value: "Número de casos",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              formatter={(value) => [Number(value), "Casos"]}
              labelFormatter={(label) => `Score: ${label}`}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {SCORE_HISTOGRAM.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={RISK_COLORS[entry.risk] ?? "#94a3b8"}
                />
              ))}
            </Bar>
            <ReferenceLine
              x="0.35"
              stroke="#94a3b8"
              strokeDasharray="5 5"
            />
            <ReferenceLine
              x="0.65"
              stroke="#94a3b8"
              strokeDasharray="5 5"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
