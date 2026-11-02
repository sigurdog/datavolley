"use client";

import type { Player, Side } from "@/lib/types";

export function PlayerButton({
  player,
  side,
  onClick,
  highlight,
  label,
  small,
  disabled,
}: {
  player: Player;
  side: Side;
  onClick: () => void;
  highlight?: boolean;
  label?: string;
  small?: boolean;
  disabled?: boolean;
}) {
  const tone = side === "home" ? "border-home/40" : "border-away/40";
  const bg = highlight ? (side === "home" ? "bg-home-soft" : "bg-away-soft") : "";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`tap relative flex flex-col items-center justify-center ${tone} ${bg} ${
        small ? "min-h-11 px-2 py-1" : ""
      }`}
    >
      {label && (
        <span className="absolute left-1.5 top-1 text-[10px] font-semibold uppercase text-muted">{label}</span>
      )}
      <span className={`font-mono ${small ? "text-lg" : "text-2xl"} font-bold leading-none`}>{player.number}</span>
      {player.name && (
        <span className="mt-1 max-w-full truncate text-[11px] font-normal text-muted">{player.name}</span>
      )}
    </button>
  );
}
