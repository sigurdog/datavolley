import {
  SourceUnavailableError,
  type ImportedPlayer,
  type ImportedTeam,
  type RosterSource,
} from "./types";

/**
 * Min Volleyball / Profixio roster source.
 *
 * NVBF's "Min Volleyball" has no public API. Profixio (which powers the
 * tournament side) has a REST API, but keys are issued manually by Profixio
 * and access to player lists is a separate permission. Until a key is issued
 * this plugin reports itself as unavailable and the UI falls back to paste /
 * manual entry.
 *
 * To implement later: set MINVOLLEYBALL_API_URL and MINVOLLEYBALL_API_KEY in
 * .env.local and fill in listTeams()/fetchRoster() with the real endpoints.
 */
export const minVolleyballSource: RosterSource = {
  id: "minvolleyball",
  label: "Min Volleyball",

  isAvailable() {
    return Boolean(process.env.MINVOLLEYBALL_API_URL && process.env.MINVOLLEYBALL_API_KEY);
  },

  async listTeams(): Promise<ImportedTeam[]> {
    if (!this.isAvailable()) throw new SourceUnavailableError(this.id);
    // Example once a key exists:
    // const res = await fetch(`${process.env.MINVOLLEYBALL_API_URL}/teams`, {
    //   headers: { "X-Api-Secret": process.env.MINVOLLEYBALL_API_KEY! },
    // });
    // return (await res.json()).map(...)
    throw new SourceUnavailableError(this.id);
  },

  async fetchRoster(): Promise<ImportedPlayer[]> {
    if (!this.isAvailable()) throw new SourceUnavailableError(this.id);
    throw new SourceUnavailableError(this.id);
  },
};

export const rosterSources: RosterSource[] = [minVolleyballSource];
