/**
 * Roster import plugins.
 *
 * A RosterSource knows how to fetch the players of a team from an external
 * system. The manual/paste source is always available; the Min Volleyball
 * source is a stub until NVBF/Profixio has issued an API key.
 */
export interface ImportedPlayer {
  number: number;
  name: string;
  externalId?: string;
}

export interface ImportedTeam {
  externalId: string;
  name: string;
}

export interface RosterSource {
  /** Stable identifier stored in teams.external_source */
  id: string;
  label: string;
  /** True when the source is configured and usable right now. */
  isAvailable(): boolean;
  /** List teams the current configuration can see (for a picker UI). */
  listTeams(): Promise<ImportedTeam[]>;
  /** Fetch the roster for one external team id. */
  fetchRoster(externalTeamId: string): Promise<ImportedPlayer[]>;
}

export class SourceUnavailableError extends Error {
  constructor(sourceId: string) {
    super(`Roster source "${sourceId}" is not configured`);
    this.name = "SourceUnavailableError";
  }
}
