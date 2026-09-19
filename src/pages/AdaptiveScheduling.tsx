import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, CalendarClock } from "lucide-react";
import { loadCache, saveCache } from "@/lib/persist-cache";
import { ScheduleDevPanel } from "@/pages/Schedule";
import { useDevMode } from "@/hooks/use-dev-mode";

const CACHE_KEY = "gsi-cache:adaptive-schedule";

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

export default function AdaptiveScheduling() {
  const [payload, setPayload] = useState<Payload | null>(() => loadCache<Payload>(CACHE_KEY));
  const [generating, setGenerating] = useState(false);
  const { devMode } = useDevMode();

  const blocks = payload?.blocks || [];

  const rearrangeSchedule = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-schedule", { body: { adaptive: true } });
      if (error) throw error;
      const next: Payload = { ...(data || {}), blocks: data?.blocks || [] };
      setPayload(next);
      saveCache(CACHE_KEY, next);
      toast.success("Schedule adaptively rearranged!");
    } catch (err: any) {
      toast.error(err.message || "Failed to rearrange schedule");
    }
    setGenerating(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Adaptive Scheduling</h1>
          <p className="text-muted-foreground mt-1">Automatically rearranges tasks when new ones are added</p>
        </div>
        <Button onClick={rearrangeSchedule} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Rearrange Now
        </Button>
      </div>

      {payload && (
        <ScheduleDevPanel payload={payload} title="Adaptive engine — how priorities were re-ordered this run" />
      )}

      {blocks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarClock className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg">No adaptive schedule yet</p>
            <p className="text-sm mt-1">Add tasks and click "Rearrange Now" to let the AI adaptively reorder your calendar</p>
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
