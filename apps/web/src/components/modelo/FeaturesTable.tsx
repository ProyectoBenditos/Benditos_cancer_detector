"use client";

import React from 'react';

const featuresData = [
  { feature: 'Subtlety', name: 'Sutileza', scale: '1–5', description: 'Qué tan evidente es el nódulo en la imagen' },
  { feature: 'Calcification', name: 'Calcificación', scale: '1–6', description: 'Patrón de calcificación (6 = ausente)' },
  { feature: 'Sphericity', name: 'Esfericidad', scale: '1–5', description: 'Forma del nódulo (5 = esférico)' },
  { feature: 'Margin', name: 'Margen', scale: '1–5', description: 'Definición del borde (5 = bien definido)' },
  { feature: 'Lobulation', name: 'Lobulación', scale: '1–5', description: 'Irregularidad del contorno' },
  { feature: 'Spiculation', name: 'Espiculación', scale: '1–5', description: 'Proyecciones espiculadas en el borde' },
  { feature: 'Texture', name: 'Textura', scale: '1–5', description: 'Densidad interna (5 = sólido)' },
  { feature: 'Malignancy', name: 'Malignidad', scale: '1–5', description: 'Sospecha clínica de malignidad' },
];

export default function FeaturesTable() {
  return (
    <div className="w-full flex flex-col gap-4">
      <h3 className="text-xl font-semibold text-slate-800">Features Clínicas Lung-RADS</h3>
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-[#012641] text-white">
              <th className="py-3 px-4 text-xs uppercase tracking-wider font-medium">Feature</th>
              <th className="py-3 px-4 text-xs uppercase tracking-wider font-medium">Nombre</th>
              <th className="py-3 px-4 text-xs uppercase tracking-wider font-medium">Escala</th>
              <th className="py-3 px-4 text-xs uppercase tracking-wider font-medium">Descripción Clínica</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {featuresData.map((item, index) => (
              <tr key={item.feature} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="py-3 px-4 border-t border-slate-100">
                  <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-xs border border-slate-200 font-mono">
                    {item.feature}
                  </code>
                </td>
                <td className="py-3 px-4 border-t border-slate-100 font-medium text-slate-700">
                  {item.name}
                </td>
                <td className="py-3 px-4 border-t border-slate-100">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {item.scale}
                  </span>
                </td>
                <td className="py-3 px-4 border-t border-slate-100 text-slate-600">
                  {item.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
