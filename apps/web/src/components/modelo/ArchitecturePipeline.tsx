"use client";

import React from 'react';
import { Image as ImageIcon, List, Brain, Layers, GitMerge, Activity, Target } from 'lucide-react';

export default function ArchitecturePipeline() {
  return (
    <div className="w-full flex flex-col gap-6">
      <h3 className="text-xl font-semibold text-slate-800">Arquitectura del Modelo</h3>
      
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto w-full">
        
        {/* Input Branches */}
        <div className="flex flex-row md:flex-col gap-4 md:gap-12 relative w-full md:w-auto justify-center">
          {/* Branch 1 */}
          <div className="flex flex-col md:flex-row items-center gap-4 z-10 w-1/2 md:w-auto">
            <div className="flex flex-col items-center justify-center w-full md:w-32 h-24 bg-blue-50 border border-blue-100 rounded-xl shadow-sm p-2 text-center">
              <ImageIcon className="w-6 h-6 text-blue-600 mb-2 shrink-0" />
              <span className="font-bold text-sm text-slate-800 leading-tight">Imagen CT</span>
            </div>
            
            <div className="hidden md:flex text-slate-400">→</div>
            <div className="md:hidden text-slate-400 my-1">↓</div>
            
            <div className="flex flex-col items-center justify-center w-full md:w-32 h-24 bg-slate-100 border border-slate-200 rounded-xl shadow-sm p-2 text-center">
              <Brain className="w-6 h-6 text-slate-600 mb-2 shrink-0" />
              <span className="font-bold text-sm text-slate-800 leading-tight">ResNet-18</span>
              <span className="text-xs text-slate-500">512D embedding</span>
            </div>
          </div>

          {/* Branch 2 */}
          <div className="flex flex-col md:flex-row items-center gap-4 z-10 w-1/2 md:w-auto">
            <div className="flex flex-col items-center justify-center w-full md:w-32 h-24 bg-blue-50 border border-blue-100 rounded-xl shadow-sm p-2 text-center">
              <List className="w-6 h-6 text-blue-600 mb-2 shrink-0" />
              <span className="font-bold text-sm text-slate-800 leading-tight">8 Features Clínicas</span>
            </div>
            
            <div className="hidden md:flex text-slate-400">→</div>
            <div className="md:hidden text-slate-400 my-1">↓</div>
            
            <div className="flex flex-col items-center justify-center w-full md:w-32 h-24 bg-slate-100 border border-slate-200 rounded-xl shadow-sm p-2 text-center">
              <Layers className="w-6 h-6 text-slate-600 mb-2 shrink-0" />
              <span className="font-bold text-sm text-slate-800 leading-tight">MLP 2 capas</span>
              <span className="text-xs text-slate-500">32D embedding</span>
            </div>
          </div>
        </div>

        {/* Converge Arrow */}
        <div className="hidden md:flex flex-col justify-center text-slate-400 h-full">
          <div className="border-t-2 border-r-2 border-b-2 border-slate-300 w-8 h-36 rounded-r-lg relative -left-4">
             <div className="absolute top-1/2 -right-3.5 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[10px] border-l-slate-400"></div>
          </div>
        </div>
        <div className="md:hidden flex flex-row justify-center w-full relative h-10 my-2">
           <div className="border-l-2 border-b-2 border-r-2 border-slate-300 w-[calc(50%+1rem)] h-6 rounded-b-lg relative -top-3">
              <div className="absolute left-1/2 -bottom-3.5 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-slate-400"></div>
           </div>
        </div>

        {/* Output Pipeline */}
        <div className="flex flex-col md:flex-row items-center gap-4 z-10 w-full md:w-auto">
          <div className="flex flex-col items-center justify-center w-32 h-24 bg-slate-100 border border-slate-200 rounded-xl shadow-sm p-2 text-center">
            <GitMerge className="w-6 h-6 text-slate-600 mb-2 shrink-0" />
            <span className="font-bold text-sm text-slate-800">Fusión</span>
            <span className="text-xs text-slate-500">544D</span>
          </div>
          
          <div className="hidden md:flex text-slate-400">→</div>
          <div className="md:hidden text-slate-400 my-1">↓</div>
          
          <div className="flex flex-col items-center justify-center w-32 h-24 bg-slate-100 border border-slate-200 rounded-xl shadow-sm p-2 text-center">
            <Activity className="w-6 h-6 text-slate-600 mb-2 shrink-0" />
            <span className="font-bold text-sm text-slate-800">Sigmoid</span>
          </div>

          <div className="hidden md:flex text-slate-400">→</div>
          <div className="md:hidden text-slate-400 my-1">↓</div>

          <div className="flex flex-col items-center justify-center w-32 h-24 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm p-2 text-center">
            <Target className="w-6 h-6 text-emerald-600 mb-2 shrink-0" />
            <span className="font-bold text-sm text-slate-800">Score 0–1</span>
          </div>
        </div>

      </div>
    </div>
  );
}
