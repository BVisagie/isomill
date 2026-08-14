import type { Application, MachineDefinition } from "@isomill/schema";
import { GROUPS, getTarget, isAppAvailable } from "@isomill/catalogue";

function iconSrc(file: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/icons/${file}`;
}

function caption(app: Application, definition: MachineDefinition): string {
  const target = getTarget(app, definition);
  if (!target) return app.unavailableReason ?? "Unavailable";
  if (target.sourceClass === "distro") return "Official repository";
  if (target.sourceClass === "vendor") return "First-party vendor · Approved source";
  return "npm allowlist — not distro-signed";
}

export function AppTiles({
  apps,
  definition,
  selected,
  onToggle,
}: {
  apps: Application[];
  definition: MachineDefinition;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      {GROUPS.map((group) => {
        const rows = apps.filter((a) => a.group === group.id);
        if (!rows.length) return null;
        return (
          <section key={group.id}>
            <div className="group-title">{group.label}</div>
            <div className="tiles">
              {rows.map((app) => {
                const available = isAppAvailable(app, definition);
                const on = selected.has(app.id);
                return (
                  <button
                    type="button"
                    key={app.id}
                    className={`tile ${on ? "selected" : ""} ${available ? "" : "disabled"}`}
                    disabled={!available}
                    title={!available ? app.unavailableReason : app.note}
                    onClick={() => onToggle(app.id)}
                  >
                    <img src={iconSrc(app.icon)} alt="" />
                    <span>
                      <span className="name">{app.name}</span>
                      <span className="cap">{caption(app, definition)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
