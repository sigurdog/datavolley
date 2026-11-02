"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addPlayer, importPastedRoster, removePlayer, updatePlayer } from "@/app/actions/teams";
import { useT } from "@/lib/i18n/context";
import type { Player, Team } from "@/lib/types";

export function RosterEditor({
  team,
  players,
  plugins,
}: {
  team: Team;
  players: Player[];
  plugins: { id: string; label: string; available: boolean }[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted hover:underline">
          ← {t("nav_dashboard")}
        </Link>
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <p className="text-sm text-muted">
          {team.is_opponent ? t("dash_isOpponent") : t("dash_ownTeams")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_minmax(0,22rem)]">
        <section className="card flex flex-col gap-3">
          <h2 className="font-semibold">{t("team_roster")}</h2>
          {players.length === 0 ? (
            <p className="text-sm text-muted">{t("team_noPlayers")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="w-16 py-1">{t("team_number")}</th>
                  <th className="py-1">{t("team_name")}</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {players.map((p) => (
                  <PlayerRow key={p.id} player={p} />
                ))}
              </tbody>
            </table>
          )}

          <form
            className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const res = await addPlayer({ teamId: team.id, number: Number(number), name });
                if (res.error) setError(res.error);
                else {
                  setNumber("");
                  setName("");
                  router.refresh();
                }
              });
            }}
          >
            <label className="flex w-20 flex-col gap-1 text-sm">
              {t("team_number")}
              <input
                className="input"
                type="number"
                min={0}
                max={99}
                required
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              {t("team_name")}
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button className="btn btn-primary" disabled={pending} type="submit">
              {t("team_addPlayer")}
            </button>
          </form>
          {error && <p className="text-sm text-bad">{error}</p>}
        </section>

        <aside className="flex flex-col gap-4">
          <form
            className="card flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setMsg(null);
              setError(null);
              start(async () => {
                const res = await importPastedRoster(team.id, paste);
                if (res.error) setError(res.error);
                else {
                  setMsg(t("team_importedCount", { n: res.count ?? 0 }));
                  setPaste("");
                  router.refresh();
                }
              });
            }}
          >
            <h2 className="font-semibold">{t("team_paste")}</h2>
            <p className="text-xs text-muted">{t("team_pasteHelp")}</p>
            <textarea
              className="input min-h-32 font-mono text-sm"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={"14 Ola Nordmann\n3 Kari Hansen"}
            />
            <button className="btn" disabled={pending || !paste.trim()} type="submit">
              {t("team_import")}
            </button>
            {msg && <p className="text-sm text-good">{msg}</p>}
          </form>

          {plugins.map((pl) => (
            <div key={pl.id} className="card flex flex-col gap-2">
              <h2 className="font-semibold">{t("team_importPlugin")}</h2>
              <button className="btn" disabled type="button" title={pl.label}>
                {pl.label}
              </button>
              {!pl.available && <p className="text-xs text-muted">{t("team_importPluginUnavailable")}</p>}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: Player }) {
  const { t } = useT();
  const router = useRouter();
  const [number, setNumber] = useState(String(player.number));
  const [name, setName] = useState(player.name ?? "");
  const [pending, start] = useTransition();
  const dirty = number !== String(player.number) || name !== (player.name ?? "");

  return (
    <tr>
      <td className="py-1 pr-2">
        <input
          className="input w-16 px-2 py-1"
          type="number"
          min={0}
          max={99}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
      </td>
      <td className="py-1 pr-2">
        <input className="input px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="py-1 text-right whitespace-nowrap">
        {dirty && (
          <button
            type="button"
            className="btn btn-primary mr-1 px-2 py-1 text-xs"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await updatePlayer({ playerId: player.id, teamId: player.team_id, number: Number(number), name });
                router.refresh();
              })
            }
          >
            {t("common_save")}
          </button>
        )}
        <button
          type="button"
          className="btn px-2 py-1 text-xs"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await removePlayer(player.id, player.team_id);
              router.refresh();
            })
          }
        >
          {t("team_remove")}
        </button>
      </td>
    </tr>
  );
}
