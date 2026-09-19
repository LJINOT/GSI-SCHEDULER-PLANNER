import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  PlusCircle, Loader2, AlertTriangle, Focus, RefreshCw, BarChart3, ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatPH } from "@/lib/date-utils";
import { statusLabel, statusBadgeClass, priorityFromScore, PRIORITY_STYLES } from "@/lib/status";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { loadCache } from "@/lib/persist-cache";
import { format, isToday, isTomorrow, isPast } from "date-fns";

const fadeIn = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

const TODAY_CACHE_KEY = "gsi-cache:today-picks";
const ADAPTIVE_CACHE_KEY = "gsi-cache:adaptive-schedule";
const AUTO_CACHE_KEY = "gsi-cache:schedule-blocks";

type Task = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  start_time: string | null;
  priority_score: number | null;
  category: string | null;
  project_id: string | null;
  estimated_duration?: number | null;
};

type TodayPick = {
  id: string;
  title: string;
  reason: string;
  priority: string;
  score?: number;
};

function dueShort(due: string | null): string {
  if (!due) return "—";
  try {
    const d = new Date(due);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isPast(d)) return `Overdue ${format(d, "MMM d")}`;
    return format(d, "MMM d");
  } catch {
    return "—";
  }
}

function scheduleTimeRange(t: Task): string {
  if (t.start_time) {
    const start = formatPH(t.start_time, "h:mm a");
    const dur = t.estimated_duration;
    if (dur && dur > 0) {
      try {
        const endDate = new Date(new Date(t.start_time).getTime() + dur * 60_000);
        return `${start} – ${formatPH(endDate.toISOString(), "h:mm a")}`;
      } catch {
        return start;
      }
    }
    return start;
  }
  return "—";
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deadlineRiskCount, setDeadlineRiskCount] = useState(0);
  const [focusTaskTitle, setFocusTaskTitle] = useState<string | null>(null);
  const [productivityScore, setProductivityScore] = useState<number | null>(null);
  const [adaptiveStatus, setAdaptiveStatus] = useState<string>("Up to date");
  const [todayPicks, setTodayPicks] = useState<TodayPick[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: taskData } = await supabase
      .from("tasks")
      .select("id, title, status, due_date, start_time, priority_score, category, project_id, estimated_duration")
      .eq("user_id", user.id);
    setTasks((taskData as Task[]) || []);
  };

  const checkStartTimes = useCallback(async () => {
    const now = new Date();
    const tasksToUpdate = tasks.filter(
      (t) => t.status === "todo" && t.start_time && new Date(t.start_time) <= now
    );
    for (const task of tasksToUpdate) {
      await supabase.from("tasks").update({ status: "in_progress" }).eq("id", task.id);
    }
    if (tasksToUpdate.length > 0) fetchTasks();
  }, [tasks]);

  const fetchModuleSummaries = async () => {
    const todayPH = formatPH(new Date(), "yyyy-MM-dd");

    const { data: riskData } = await supabase
      .from("tasks")
      .select("due_date, status")
      .not("due_date", "is", null)
      .neq("status", "done");

    const atRisk = (riskData || []).filter((t) => {
      const duePH = formatPH(t.due_date!, "yyyy-MM-dd");
      const dueDate = new Date(duePH + "T00:00:00");
      const todayDate = new Date(todayPH + "T00:00:00");
      const daysLeft = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 3;
    });
    setDeadlineRiskCount(atRisk.length);

    const { data: focusData } = await supabase
      .from("tasks")
      .select("title")
      .neq("status", "done")
      .order("priority_score", { ascending: false, nullsFirst: false })
      .limit(1);
    setFocusTaskTitle(focusData?.[0]?.title || null);

    const { data: behaviorData } = await supabase
      .from("behavior_logs")
      .select("value")
      .eq("metric_type", "productivity_score")
      .order("recorded_at", { ascending: false })
      .limit(1);
    if (behaviorData?.[0]) {
      const val = behaviorData[0].value;
      setProductivityScore(typeof val === "number" ? val : (val as any)?.score ?? null);
    } else {
      setProductivityScore(null);
    }
  };

  const loadTodayRecommendations = async () => {
    const cached = loadCache<{ picks?: TodayPick[] }>(TODAY_CACHE_KEY);
    if (cached?.picks?.length) {
      setTodayPicks(cached.picks.slice(0, 3));
      return;
    }
    setLoadingPicks(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-picks", { body: {} });
      if (!error && data?.picks) {
        setTodayPicks((data.picks as TodayPick[]).slice(0, 3));
      }
    } catch {
      // dashboard still works without picks
    }
    setLoadingPicks(false);
  };

  const loadAdaptiveStatus = () => {
    const adaptive = loadCache<{ blocks?: unknown[] }>(ADAPTIVE_CACHE_KEY);
    const auto = loadCache<{ blocks?: unknown[] }>(AUTO_CACHE_KEY);
    if (!adaptive?.blocks?.length && !auto?.blocks?.length) {
      setAdaptiveStatus("No schedule yet");
      return;
    }
    setAdaptiveStatus("Schedule up to date");
  };

  useEffect(() => {
    fetchTasks();
    fetchModuleSummaries();
    loadTodayRecommendations();
    loadAdaptiveStatus();
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel("dashboard-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        fetchTasks();
        fetchModuleSummaries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    checkStartTimes();
    const interval = setInterval(checkStartTimes, 30000);
    return () => clearInterval(interval);
  }, [checkStartTimes]);

  const todayPH = formatPH(new Date(), "yyyy-MM-dd");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter((t) => t.status === "done");
  const todoCount = tasks.filter((t) => t.status === "todo").length;

  const todaysSchedule = useMemo(() => {
    const withStart = tasks.filter((t) => {
      if (!t.start_time || t.status === "done") return false;
      return formatPH(t.start_time, "yyyy-MM-dd") === todayPH;
    });
    if (withStart.length > 0) {
      return [...withStart].sort(
        (a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime()
      );
    }
    return tasks
      .filter((t) => t.due_date && t.status !== "done" && formatPH(t.due_date, "yyyy-MM-dd") === todayPH)
      .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));
  }, [tasks, todayPH]);

  const thisWeekTasks = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return tasks
      .filter((t) => {
        if (!t.due_date || t.status === "done") return false;
        const dueDate = new Date(t.due_date);
        return dueDate >= startOfWeek && dueDate <= endOfWeek;
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }, [tasks]);

  const statusBreakdown = [
    { name: "To Do", value: todoCount, color: "hsl(var(--muted-foreground))" },
    { name: "In Progress", value: inProgressTasks.length, color: "hsl(var(--warning))" },
    { name: "Completed", value: completedTasks.length, color: "hsl(var(--success))" },
  ].filter((s) => s.value > 0);

  const totalTasks = todoCount + inProgressTasks.length + completedTasks.length;

  const taskMeta = useMemo(() => {
    const m: Record<string, Task> = {};
    tasks.forEach((t) => {
      m[t.id] = t;
    });
    return m;
  }, [tasks]);

  const weekPreview = thisWeekTasks.slice(0, 8);
  const hasMoreWeek = thisWeekTasks.length > 8;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">GSI</h1>
          <p className="font-display text-lg font-semibold tracking-widest uppercase text-muted-foreground">
            Schedule Planner
          </p>
        </div>
        <Button asChild>
          <Link to="/add-task">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Task
          </Link>
        </Button>
      </div>

      {/* 1. Task Overview */}
      <motion.div variants={fadeIn}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Task Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {totalTasks === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tasks yet</p>
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {statusBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 2. Today's AI Recommendation */}
      <motion.div variants={fadeIn}>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="font-display text-lg">Today&apos;s AI Recommendation</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">What should you work on today?</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/today">
                View All Recommendations
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingPicks ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : todayPicks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 px-4">
                No recommendations yet. Open Today AI Recommendation to generate them.
              </p>
            ) : (
              <div className="divide-y">
                {todayPicks.map((p, i) => {
                  const t = taskMeta[p.id];
                  const pr = t
                    ? priorityFromScore(t.priority_score)
                    : ((p.priority as "high" | "medium" | "low") || "medium");
                  const style = PRIORITY_STYLES[pr] || PRIORITY_STYLES.medium;
                  const dur = t?.estimated_duration;
                  return (
                    <div key={p.id} className="px-4 py-3 flex gap-3 items-start">
                      <span className="text-sm font-display font-bold text-muted-foreground w-6 shrink-0">
                        #{i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                          <Badge variant="outline" className={`text-[10px] ${style.className}`}>
                            {style.label}
                          </Badge>
                          <span>{dueShort(t?.due_date ?? null)}</span>
                          {dur != null && <span>{dur} min</span>}
                        </p>
                        {p.reason && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.reason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 3. Today's Schedule */}
      <motion.div variants={fadeIn}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {todaysSchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 px-4">
                No tasks scheduled for today.{" "}
                <Link to="/add-task" className="text-primary hover:underline">
                  Add one?
                </Link>
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs w-36">Time</TableHead>
                      <TableHead className="text-xs">Task</TableHead>
                      <TableHead className="text-xs w-24">Priority</TableHead>
                      <TableHead className="text-xs w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todaysSchedule.map((t) => {
                      const pr = priorityFromScore(t.priority_score);
                      const style = PRIORITY_STYLES[pr];
                      return (
                        <TableRow key={t.id} className="text-sm">
                          <TableCell className="py-2 font-mono text-xs whitespace-nowrap">
                            {t.start_time ? scheduleTimeRange(t) : "Unscheduled"}
                            {t.due_date && (
                              <span className="block text-[10px] text-muted-foreground mt-0.5">
                                Due {formatPH(t.due_date, "h:mm a")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 font-medium max-w-[200px] truncate">{t.title}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className={`text-[10px] ${style.className}`}>
                              {style.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className={`text-[10px] ${statusBadgeClass[t.status] || ""}`}>
                              {statusLabel(t.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 4. This Week */}
      <motion.div variants={fadeIn}>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="font-display text-lg">This Week</CardTitle>
            {(hasMoreWeek || thisWeekTasks.length > 0) && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/this-week">
                  View This Week
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {weekPreview.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 px-4">No tasks due this week.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs w-28">Date</TableHead>
                      <TableHead className="text-xs">Task</TableHead>
                      <TableHead className="text-xs w-24">Priority</TableHead>
                      <TableHead className="text-xs w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weekPreview.map((t) => {
                      const pr = priorityFromScore(t.priority_score);
                      const style = PRIORITY_STYLES[pr];
                      let dateLabel = "—";
                      if (t.due_date) {
                        try {
                          const d = new Date(t.due_date);
                          dateLabel = isToday(d) ? "Today" : format(d, "EEE");
                        } catch {
                          dateLabel = formatPH(t.due_date, "EEE");
                        }
                      }
                      return (
                        <TableRow key={t.id} className="text-sm">
                          <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                            {dateLabel}
                          </TableCell>
                          <TableCell className="py-2 font-medium max-w-[200px] truncate">{t.title}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className={`text-[10px] ${style.className}`}>
                              {style.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className={`text-[10px] ${statusBadgeClass[t.status] || ""}`}>
                              {statusLabel(t.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 5. Attention */}
      <motion.div variants={fadeIn}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Attention</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              <Link to="/deadline-risk" className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Deadline Risk</p>
                  <p className="text-xs text-muted-foreground">
                    {deadlineRiskCount} task{deadlineRiskCount === 1 ? "" : "s"} at risk
                  </p>
                </div>
                <span className="text-xs text-primary shrink-0">View</span>
              </Link>

              <Link to="/focus-mode" className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors">
                <Focus className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Focus Task</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {focusTaskTitle ? `Current focus: ${focusTaskTitle}` : "No focus task"}
                  </p>
                </div>
                <span className="text-xs text-primary shrink-0">Start Focus</span>
              </Link>

              <Link to="/adaptive-scheduling" className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors">
                <RefreshCw className="h-4 w-4 text-info shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Adaptive Schedule</p>
                  <p className="text-xs text-muted-foreground">{adaptiveStatus}</p>
                </div>
                <span className="text-xs text-primary shrink-0">View</span>
              </Link>

              <Link to="/productivity-insights" className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors">
                <BarChart3 className="h-4 w-4 text-warning shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Productivity</p>
                  <p className="text-xs text-muted-foreground">
                    {productivityScore != null ? `${productivityScore}%` : "Not available yet"}
                  </p>
                </div>
                <span className="text-xs text-primary shrink-0">View</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
