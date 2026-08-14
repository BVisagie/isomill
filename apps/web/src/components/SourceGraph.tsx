import type { SourceGraphNode } from "@isomill/schema";

function iconSrc(file: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/icons/${file}`;
}

export function SourceGraph({
  nodes,
  onOpenProvenance,
}: {
  nodes: SourceGraphNode[];
  onOpenProvenance: () => void;
}) {
  return (
    <div className="graph">
      {nodes.map((node) => (
        <div className="g-node" key={node.id}>
          <img src={iconSrc(node.icon)} alt="" />
          <div>
            <div>{node.name}</div>
            <div>
              <span style={{ color: "var(--mute)" }}>{node.publisher}</span>
              <div>
                {node.badges.map((b) => {
                  const cls =
                    b.kind === "npm-allowlist"
                      ? "npm"
                      : b.kind === "will-verify-iso"
                        ? "wait"
                        : "ok";
                  const mark = b.kind === "npm-allowlist" ? "~" : "✓";
                  return (
                    <span className={`badge ${cls}`} key={b.label}>
                      {mark} {b.label}
                    </span>
                  );
                })}
              </div>
              {node.detail ? (
                <div style={{ color: "var(--mute)" }}>{node.detail}</div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
      <button className="linkish" type="button" onClick={onOpenProvenance}>
        View complete provenance
      </button>
    </div>
  );
}
