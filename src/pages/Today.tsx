import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Zap } from "lucide-react";
import { loadCache, saveCache } from "@/lib/persist-cache";
import { DevPanel, DevStat, DevBar } from "@/components/DevPanel";
import { useDevMode } from "@/hooks/use-dev-mode";

const CACHE_KEY = "gsi-cache:today-picks";

type Breakdown = { urgency: number; quick_win: number; flow: number; cognitive_fit: number };
type SmartPick = { id: string; title: string; reason: string; priority: string; score?: number; breakdown?: Breakdown };
type Payload = {
  picks: SmartPick[];
  weights?: { urgency: number; quickWin: number; flow: number; cognitive: number };
  peak_window?: string;
  peak_source?: string;
  algorithm?: string;
  timestamp?: string;
};

export default function Today() {
  const [payload, setPayload] = useState<Payload | null>(() => loadCache<Payload>(CACHE_KEY));
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { devMode } = useDevMode();

  const picks = payload?.picks || [];
  const w = payload?.weights;

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase.from("tasks").select("*").eq("due_date", today).neq("status", "done").then(({ data }) => setTasks(data || []));
  }, []);

  const getSmartPicks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-picks", { body: {} });
      if (error) throw error;
      const next: Payload = { ...(data || {}), picks: data?.picks || [] };
      setPayload(next);
      saveCache(CACHE_KEY, next);
    } catch (err: any) {
      toast.error(err.message || "Failed to get recommendations");
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Today AI Recommendation</h1>
          <p className="text-muted-foreground mt-1">What to focus on right now</p>
        </div>
        <Button onClick={getSmartPicks} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
          Smart Picks
        </Button>
      </div>

      {picks.length > 0 && (
        <DevPanel
          title="Recommendation engine — scoring behind today's picks"
          subtitle={`${payload?.algorithm || "ahp-smart-picks"} · run at ${payload?.timestamp ? new Date(payload.timestamp).toLocaleString() : "—"}`}
          raw={payload}
        >
          <p className="text-[11px] text-muted-foreground">
            score = (urgency×0.50 + quick-win×0.20 + flow×0.15 + cognitive-fit×0.15) × 100, recomputed against the
            current clock hour and your peak window.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <DevStat label="Peak window" value={payload?.peak_window || "—"} />
            <DevStat label="Peak source" value={payload?.peak_source || "—"} />
            <DevStat label="Picks returned" value={picks.length} />
            <DevStat label="Due today (raw)" value={tasks.length} />
          </div>
        </DevPanel>
      )}

      {tasks.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Due Today</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                <span className="font-medium">{t.title}</span>
                <Badge variant="secondary">{t.status?.replace("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {picks.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-display text-lg flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> AI Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {picks.map((p) => (
              <div key={p.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.reason}</p>
                  </div>
                  {devMode && p.score !== undefined && (
                    <span className="font-mono text-sm font-semibold text-primary shrink-0">{p.score.toFixed(1)}</span>
                  )}
                </div>
                {devMode && p.breakdown && (
                  <div className="rounded-md border border-dashed border-primary/40 bg-primary/[0.03] p-3 space-y-2">
                    <DevBar label="urgency" value={p.breakdown.urgency} weight={w?.urgency} />
                    <DevBar label="quick win" value={p.breakdown.quick_win} weight={w?.quickWin} />
                    <DevBar label="flow" value={p.breakdown.flow} weight={w?.flow} />
                    <DevBar label="cognitive fit" value={p.breakdown.cognitive_fit} weight={w?.cognitive} />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tasks.length === 0 && picks.length === 0 && (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Zap className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p>No tasks due today. Click "Smart Picks" for AI recommendations.</p>
        </CardContent></Card>
      )}
    </motion.div>
  );
}
