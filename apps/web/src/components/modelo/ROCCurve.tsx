"use client";

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ROC_DATA } from './modelData';

export default function ROCCurve() {
  return (
    <div className="w-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Curva ROC</h3>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={ROC_DATA}
            margin={{ top: 5, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
            <XAxis 
              dataKey="fpr" 
              type="number"
              domain={[0, 1]}
              label={{ value: 'Tasa Falsos Positivos', position: 'bottom', offset: 0 }} 
            />
            <YAxis 
              type="number"
              domain={[0, 1]}
              label={{ value: 'Tasa Verdaderos Positivos', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip 
              formatter={(value, name) => [Number(value).toFixed(3), name === 'tpr' ? 'TPR (Sensibilidad)' : 'FPR']}
              labelFormatter={(label) => `FPR: ${Number(label).toFixed(3)}`}
            />
            <Area 
              type="monotone" 
              dataKey="tpr" 
              name="TPR"
              stroke="#16a34a" 
              fill="#16a34a" 
              fillOpacity={0.15} 
            />
            {/* Diagonal reference line using a separate dataset or mathematically via Line function */}
            <Line
              type="linear"
              dataKey="fpr"
              name="Referencia"
              stroke="#94a3b8"
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="absolute right-8 bottom-16 bg-white/80 p-2 rounded-md border border-slate-200 font-semibold text-slate-700 shadow-sm">
        AUC = 0.916
      </div>
    </div>
  );
}
