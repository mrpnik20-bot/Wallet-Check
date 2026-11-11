import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";

const CIRCLE = "grid h-[52px] w-[52px] place-items-center rounded-full bg-white/[0.07] text-white transition-colors";
const ITEM = "flex flex-col items-center gap-2";

export default function QuickActions({ onRefresh }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <Link to="/send" className={ITEM}>
        <span className={`${CIRCLE} hover:bg-[#3B82F6]/20 hover:text-[#3B82F6]`}>
          <ArrowUpRight size={19} />
        </span>
        <span className="text-[11.5px] font-medium text-white/60">Send</span>
      </Link>

      <Link to="/receive" className={ITEM}>
        <span className={`${CIRCLE} hover:bg-[#3B82F6]/20 hover:text-[#3B82F6]`}>
          <ArrowDownLeft size={19} />
        </span>
        <span className="text-[11.5px] font-medium text-white/60">Receive</span>
      </Link>

      <button type="button" onClick={onRefresh} className={ITEM}>
        <span className={`${CIRCLE} hover:bg-[#3B82F6]/20 hover:text-[#3B82F6]`}>
          <RefreshCw size={18} />
        </span>
        <span className="text-[11.5px] font-medium text-white/60">Refresh</span>
      </button>

      <Link to="/settings" className={ITEM}>
        <span className={`${CIRCLE} hover:bg-[#3B82F6]/20 hover:text-[#3B82F6]`}>
          <ShieldCheck size={18} />
        </span>
        <span className="text-[11.5px] font-medium text-white/60">Security</span>
      </Link>
    </div>
  );
}