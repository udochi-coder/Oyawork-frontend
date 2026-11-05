import { Briefcase, Home, MessageCircle, User, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cx } from "./ui";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav({ unreadMessages = 0 }: { unreadMessages?: number }) {
  return (
    <nav className="grid grid-cols-5 border-t border-line bg-white pb-[max(6px,env(safe-area-inset-bottom))] pt-2">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) => cx("relative flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium", isActive ? "text-brand" : "text-subtle")}>
          <Icon size={21} />
          {label}
          {label === "Messages" && unreadMessages > 0 && (
            <span className="absolute right-[22%] top-0 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unreadMessages}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
