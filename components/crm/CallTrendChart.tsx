import type { CallTrendPoint } from "@/lib/types";

export function CallTrendChart({ points }: { points: CallTrendPoint[] }) {
  const maxCalls = Math.max(1, ...points.map((point) => point.calls));
  const totalCalls = points.reduce((sum, point) => sum + point.calls, 0);
  const totalConnected = points.reduce(
    (sum, point) => sum + point.connected,
    0,
  );

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Call activity · last 14 days
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {totalCalls} calls · {totalConnected} connected
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-orange-500" />
            Connected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-slate-200" />
            Other
          </span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="flex min-w-[520px] items-end gap-1.5">
          {points.map((point) => {
            const totalHeight =
              point.calls === 0
                ? 3
                : Math.max(6, Math.round((point.calls / maxCalls) * 100));
            const connectedHeight =
              point.connected === 0
                ? 0
                : Math.max(
                    3,
                    Math.round((point.connected / maxCalls) * 100),
                  );

            return (
              <div
                key={point.date}
                className="flex flex-1 flex-col items-center gap-1.5"
                title={`${point.label}: ${point.calls} calls, ${point.connected} connected`}
              >
                <div className="relative h-28 w-full overflow-hidden rounded-md bg-slate-100">
                  <div
                    className="absolute bottom-0 w-full rounded-md bg-slate-200"
                    style={{ height: `${totalHeight}%` }}
                  />
                  {point.connected > 0 ? (
                    <div
                      className="absolute bottom-0 w-full rounded-md bg-orange-500"
                      style={{ height: `${connectedHeight}%` }}
                    />
                  ) : null}
                </div>
                <span className="text-[10px] text-slate-400">
                  {point.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
