"use client";

import { Bell, User } from "lucide-react";
import LogoutButton from "@/app/platform/logout-button";
import React from 'react';
import { PhantomButton } from "../ui/PhantomButton";

export function Header({ userEmail = "Usuario" }: { userEmail?: string }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <span className="text-lg font-bold text-brand-primary tracking-tight">OncoScan</span>
      <div className="flex items-center gap-4">
        <PhantomButton featureName="Notificaciones" className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors relative">
          <Bell className="w-5 h-5" aria-hidden="true" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-danger rounded-full" aria-hidden="true"></span>
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