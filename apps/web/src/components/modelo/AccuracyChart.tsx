"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ACCURACY_DATA } from './modelData';

export default function AccuracyChart() {
  return (
    <div className="w-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Accuracy por Época</h3>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={ACCURACY_DATA}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
            <XAxis 
              dataKey="epoch" 
              label={{ value: 'Época', position: 'insideBottom', offset: -5 }} 
            />
            <YAxis 
              domain={[0.55, 1.0]} 
              label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip 
              formatter={(value, name) => [Number(value).toFixed(4), name === 'train' ? 'Train' : 'Val']}
              labelFormatter={(label) => `Época: ${label}`}
            />
            <Legend verticalAlign="top" height={36} />
            <Line 
              type="monotone" 
              dataKey="train" 
              name="Train" 
              stroke="#2563eb" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 6 }} 
            />
            <Line 
              type="monotone" 
              dataKey="val" 
              name="Val" 
              stroke="#ef4444" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 6 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
