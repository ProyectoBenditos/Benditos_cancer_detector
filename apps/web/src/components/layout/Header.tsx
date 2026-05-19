"use client";

import { User } from "lucide-react";
import LogoutButton from "@/app/platform/logout-button";
import React from 'react';

export function Header({ userEmail = "Usuario" }: { userEmail?: string }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <span className="text-lg font-bold text-brand-primary tracking-tight">OncoScan</span>
      <div className="flex items-center gap-4">
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