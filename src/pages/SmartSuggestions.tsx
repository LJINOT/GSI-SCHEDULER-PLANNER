import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Lightbulb, Clock } from "lucide-react";
import { loadCache, saveCache } from "@/lib/persist-cache";
import { DevPanel, DevStat, DevBar } from "@/components/DevPanel";
import { useDevMode } from "@/hooks/use-dev-mode";

const CACHE_KEY = "gsi-cache:smart-suggestions";

type Breakdown = { urgency: number; quick_win: number; flow: number; cognitive_fit: number };
type Suggestion = {
  id: string;
  title: string;
  reason: string;
  priority: string;
  score?: number;
  suggested_time?: string;
  breakdown?: Breakdown;
};
type Payload = {
  picks: Suggestion[];
  weights?: { urgency: number; quickWin: number; flow: number; cognitive: number };
  peak_source?: string;
  peak_window?: string;
  break_style?: string;
  algorithm?: string;
  timestamp?: string;
};

export default function SmartSuggestions() {
  const [payload, setPayload] = useState<Payload | null>(() => loadCache<Payload>(CACHE_KEY));
  const [loading, setLoading] = useState(false);
  const { devMode } = useDevMode();

  const suggestions = payload?.picks || [];
  const w = payload?.weights;

  const getSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-picks", { body: {} });
      if (error) throw error;
      const next: Payload = { ...(data || {}), picks: data?.picks || [] };
      setPayload(next);
      saveCache(CACHE_KEY, next);
      toast.success("Smart suggestions generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to get suggestions");
    }
    setLoading(false);
  };

  const priorityColors: Record<string, string> = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-warning/10 text-warning",
    low: "bg-success/10 text-success",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Smart Suggestions</h1>
          <p className="text-muted-foreground mt-1">AI-recommended best time slots based on your behavior patterns</p>
        </div>
        <Button onClick={getSuggestions} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
          Get Suggestions
        </Button>
      </div>

      {payload && suggestions.length > 0 && (
        <DevPanel
          title="Decision engine — why these suggestions fired"
          subtitle={`${payload.algorithm || "ahp-smart-picks"} · run at ${payload.timestamp ? new Date(payload.timestamp).toLocaleString() : "—"}`}
          raw={payload}
        >
          <p className="text-[11px] text-muted-foreground">
            Every pending task is scored for <em>right now</em>: score = (urgency×0.50 + quick-win×0.20 + flow×0.15 +
            cognitive-fit×0.15) × 100. The top 5 become suggestions. Cognitive fit depends on the current clock hour
            versus your peak window, so re-running later in the day changes the ranking — that is the adaptive part.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <DevStat label="Peak window" value={payload.peak_window || "—"} />
            <DevStat label="Peak source" value={payload.peak_source || "—"} />
            <DevStat label="Break style" value={payload.break_style || "—"} />
            <DevStat label="Candidates scored" value={`top ${suggestions.length} shown`} />
          </div>
          {w && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <DevStat label="w urgency" value={w.urgency.toFixed(2)} />
              <DevStat label="w quick win" value={w.quickWin.toFixed(2)} />
              <DevStat label="w flow" value={w.flow.toFixed(2)} />
              <DevStat label="w cognitive" value={w.cognitive.toFixed(2)} />
            </div>
          )}
        </DevPanel>
      )}

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Lightbulb className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg">No suggestions yet</p>
            <p className="text-sm mt-1">Click "Get Suggestions" for AI-powered time slot recommendations based on your behavior learning</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <Card key={s.id || i} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                    {s.suggested_time && <p className="text-xs text-primary mt-1">{s.suggested_time}</p>}
                  </div>
                  {devMode && s.score !== undefined && (
                    <span className="font-mono text-sm font-semibold text-primary shrink-0">{s.score.toFixed(1)}</span>
                  )}
                  <Badge className={priorityColors[s.priority] || priorityColors.medium}>{s.priority}</Badge>
                </div>

                {devMode && s.breakdown && (
                  <div className="rounded-md border border-dashed border-primary/40 bg-primary/[0.03] p-3 space-y-2">
                    <p className="text-[10px] font-semibold text-primary">Suggestion #{i + 1} · trigger breakdown</p>
                    <DevBar label="urgency (deadline)" value={s.breakdown.urgency} weight={w?.urgency} />
                    <DevBar label="quick win (duration)" value={s.breakdown.quick_win} weight={w?.quickWin} />
                    <DevBar label="flow (current status)" value={s.breakdown.flow} weight={w?.flow} />
                    <DevBar label="cognitive fit (hour vs peak)" value={s.breakdown.cognitive_fit} weight={w?.cognitive} />
                    <p className="text-[10px] text-muted-foreground">
                      Slot rule: hard tasks are pushed into the peak window, easy tasks after it, and every slot is
                      clamped inside your work hours — that is how the adaptive time above was chosen.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
