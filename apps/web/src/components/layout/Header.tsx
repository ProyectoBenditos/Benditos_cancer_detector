"use client";

import { Search, Bell, User } from "lucide-react";
import LogoutButton from "@/app/platform/logout-button";
import React from 'react';
import { PhantomButton } from "../ui/PhantomButton";

export function Header({ userEmail = "Usuario" }: { userEmail?: string }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <div className="flex items-center text-slate-400 max-w-md w-full bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 focus-within:border-rose-300 focus-within:ring-1 focus-within:ring-rose-300">
        <Search className="w-4 h-4 mr-2" />
        <input 
          type="text" 
          placeholder="Buscar pacientes o cargas (Próximamente)..." 
          className="bg-transparent border-none outline-none w-full text-sm text-slate-700 placeholder:text-slate-400"
          readOnly
          onClick={() => alert("La búsqueda estará disponible próximamente en OncaScan.")}
        />
      </div>

      <div className="flex items-center gap-4">
        <PhantomButton featureName="Notificaciones" className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
        </PhantomButton>
        
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{userEmail}</p>
            <p className="text-xs text-slate-500">Médico</p>
          </div>
          
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
