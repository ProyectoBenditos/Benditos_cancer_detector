"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { RISK_DISTRIBUTION } from "./modelData";

export default function RiskDistributionChart() {
  return (
    <div className="w-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        Casos por Nivel de Riesgo
      </h3>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={RISK_DISTRIBUTION}
            margin={{ top: 30, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis dataKey="level" axisLine={false} tickLine={false} />
            <YAxis
              label={{
                value: "Número de casos",
                angle: -90,
                position: "insideLeft",
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "transparent" }}
              formatter={(value) => [Number(value), "Casos"]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={80}>
              {RISK_DISTRIBUTION.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                content={({ x, y, width, index }) => {
                  const entry = RISK_DISTRIBUTION[index as number];
                  if (!entry) return null;
                  return (
                    <text
                      x={(x as number) + (width as number) / 2}
                      y={(y as number) - 8}
                      textAnchor="middle"
                      fill="#334155"
                      fontSize={13}
                      fontWeight={600}
                    >
                      {entry.count} ({entry.percentage}%)
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
