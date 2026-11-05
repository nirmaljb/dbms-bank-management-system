import React from 'react';
import { BANK_NAME } from './BankHeader';

export function BankFooter() {
  return (
    <footer className="mt-auto border-t-2 border-[#004c8f] bg-[#dce6f0] py-2 px-4 text-center text-[10px] text-slate-700">
      &copy; 2026 {BANK_NAME} (fictional) &bull; DBMS Lab Project &bull; No real money is handled.
    </footer>
  );
}
