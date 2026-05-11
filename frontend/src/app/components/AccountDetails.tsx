"use client";

import React from "react";
import { User, Shield, Globe, CreditCard } from "lucide-react";
import { cn } from "./StatCard";

interface AccountDetailsProps {
  account: any;
  className?: string;
}

export const AccountDetails: React.FC<AccountDetailsProps> = ({
  account,
  className,
}) => {
  if (!account) return null;

  const details = [
    {
      label: "Account Name",
      value: account.accounts[0].accountName,
      icon: User,
    },
    // { label: "Account ID", value: account.currentAccountId, icon: Shield },
    // { label: "Client ID", value: account.clientId, icon: User },
    // { label: "Account Type", value: account.accountType, icon: CreditCard },
    {
      label: "Balance",
      value: `${account.accounts[0].balance.balance.toFixed(2)} ${account.currencySymbol}`,
      icon: CreditCard,
    },
    {
      label: "Profit - Loss",
      value: `${account.accounts[0].balance.profitLoss.toFixed(2)} ${account.currencySymbol}`,
      icon: CreditCard,
    },
    // {
    //   label: "Currency",
    //   value: `${account.currencyIsoCode} (${account.currencySymbol})`,
    //   icon: Globe,
    // },
  ];

  return (
    <div
      className={cn(
        "p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-6">
        <User className="w-5 h-5 text-slate-400" />
        <h2 className="text-lg font-semibold text-white">Account Profile</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {details.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-400">{item.label}</span>
            </div>
            <span className="text-sm font-medium text-white">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Status
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-emerald-500 uppercase">
              Active Demo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
