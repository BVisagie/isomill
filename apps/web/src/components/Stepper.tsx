import type { BuildStatus } from "@isomill/schema";

const STEPS: BuildStatus[] = [
  "QUEUED",
  "RESOLVING",
  "SOURCE_READY",
  "BUILDING",
  "VERIFYING",
  "READY",
];

export function Stepper({ status }: { status: BuildStatus | null }) {
  if (!status) return null;
  return (
    <div className="stepper">
      {STEPS.map((step) => {
        const idx = STEPS.indexOf(step);
        const cur = STEPS.indexOf(status as (typeof STEPS)[number]);
        let cls = "step";
        if (status === "FAILED") cls += " fail";
        else if (status === "UPSTREAM_KEY_CHANGED" && step === "RESOLVING") cls += " warn";
        else if (status === step) cls += " active";
        else if (cur > idx && cur >= 0) cls += " done";
        return (
          <span className={cls} key={step}>
            {step === "SOURCE_READY" ? "SOURCE READY" : step}
          </span>
        );
      })}
      {status === "UPSTREAM_KEY_CHANGED" ? (
        <span className="step warn">UPSTREAM KEY CHANGED</span>
      ) : null}
      {status === "FAILED" ? <span className="step fail">FAILED</span> : null}
    </div>
  );
}
