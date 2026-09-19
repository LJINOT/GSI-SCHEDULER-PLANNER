import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Wand2 } from "lucide-react";
import { loadCache, saveCache } from "@/lib/persist-cache";
import { DevPanel, DevStat } from "@/components/DevPanel";
import { useDevMode } from "@/hooks/use-dev-mode";

const CACHE_KEY = "gsi-cache:schedule-blocks";

function to12h(hhmm: string): string {
  if (!hhmm || !hhmm.includes(":")) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m).padStart(2, "0")} ${period}`;
}

type ScheduleBlock = { task_id: string; title: string; start: string; end: string; category: string; kind?: string };
type Payload = {
  blocks: ScheduleBlock[];
  deferred?: { task_id: string; title: string }[];
  pso?: { fitness: number; iterations: number; swarm_size: number };
  window?: { start: string; end: string; peak_start: string; peak_end: string; break_style: string };
  algorithm?: string;
  timestamp?: string;
  note?: string;
};

export default function Schedule() {
  const [payload, setPayload] = useState<Payload | null>(() => loadCache<Payload>(CACHE_KEY));
  const [generating, setGenerating] = useState(false);
  const { devMode } = useDevMode();

  const blocks = payload?.blocks || [];

  const generateSchedule = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-schedule", { body: {} });
      if (error) throw error;
      const next: Payload = { ...(data || {}), blocks: data?.blocks || [] };
      setPayload(next);
      saveCache(CACHE_KEY, next);
      toast.success("Schedule optimized with PSO + CSP!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate schedule");
    }
    setGenerating(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Auto Schedule</h1>
          <p className="text-muted-foreground mt-1">CSP automatically places tasks in the calendar</p>
        </div>
        <Button onClick={generateSchedule} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          Generate Schedule
        </Button>
      </div>

      {payload && <ScheduleDevPanel payload={payload} />}

      {blocks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Wand2 className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg">No schedule generated yet</p>
            <p className="text-sm mt-1">Click "Generate Schedule" to create an optimized plan using PSO & CSP algorithms</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {blocks.map((b, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="text-sm font-mono text-muted-foreground w-36 shrink-0">{to12h(b.start)} – {to12h(b.end)}</div>
                <div className="flex-1">
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.category}</p>
                </div>
                {devMode && (
                  <span className="text-[10px] font-mono text-primary shrink-0">
                    {b.kind === "break" ? "CSP break insert" : `slot ${i + 1}`}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function ScheduleDevPanel({ payload, title }: { payload: Payload; title?: string }) {
  return (
    <DevPanel
      title={title || "Auto-scheduler internals — PSO ordering + CSP placement"}
      subtitle={`${payload.algorithm || "csp-pso"} · run at ${payload.timestamp ? new Date(payload.timestamp).toLocaleString() : "—"}`}
      raw={payload}
    >
      <p className="text-[11px] text-muted-foreground">
        Step 1 — candidate filter: only tasks due/starting today (or undated) enter the pool, then the most urgent ones
        are packed until 85% of the work window is used; the rest are deferred. Step 2 — PSO searches task orderings
        (random-key encoding, 25 particles × 60 iterations) minimising a fitness penalty: hard tasks outside your peak
        window +25, easy tasks inside peak +8, later start times ×difficulty, missed deadline +50, category switch +2.
        Step 3 — CSP backtracking lays the winning order onto the clock and injects breaks per your break style.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <DevStat label="Work window" value={payload.window ? `${to12h(payload.window.start)}–${to12h(payload.window.end)}` : "—"} />
        <DevStat label="Peak window" value={payload.window ? `${to12h(payload.window.peak_start)}–${to12h(payload.window.peak_end)}` : "—"} />
        <DevStat label="Break style" value={payload.window?.break_style || "—"} />
        <DevStat label="Best fitness" value={payload.pso ? payload.pso.fitness.toFixed(2) : "—"} />
        <DevStat label="Swarm size" value={payload.pso?.swarm_size ?? "—"} />
        <DevStat label="Iterations" value={payload.pso?.iterations ?? "—"} />
        <DevStat label="Blocks placed" value={payload.blocks.length} />
        <DevStat label="Deferred" value={payload.deferred?.length ?? 0} />
      </div>
      {payload.deferred && payload.deferred.length > 0 && (
        <div className="rounded-md border bg-background p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            Deferred — did not fit today's window
          </p>
          <ul className="text-[11px] font-mono space-y-0.5 max-h-40 overflow-auto">
            {payload.deferred.map((d) => (
              <li key={d.task_id} className="truncate">• {d.title}</li>
            ))}
          </ul>
        </div>
      )}
      {payload.note && <p className="text-[11px] text-warning">{payload.note}</p>}
    </DevPanel>
  );
}
