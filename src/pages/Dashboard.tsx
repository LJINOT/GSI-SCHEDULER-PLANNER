import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks } from "@/hooks/useTasks";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { ListTodo, CalendarDays, CheckSquare, Timer } from "lucide-react";
import { isToday, isThisWeek } from "date-fns";

export default function Dashboard() {
  const { data: tasks = [] } = useTasks();
  const { data: timeEntries = [] } = useTimeEntries();

  const totalTasks = tasks.length;
  const dueToday = tasks.filter((t) => t.due_date && isToday(new Date(t.due_date))).length;
  const completedThisWeek = tasks.filter(
    (t) => t.status === "completed" && t.completed_at && isThisWeek(new Date(t.completed_at))
  ).length;
  const trackedToday = timeEntries
    .filter((e) => isToday(new Date(e.start_time)))
    .reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);

  const todayTasks = tasks
    .filter((t) => t.status !== "completed" && t.due_date && isToday(new Date(t.due_date)))
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0))
    .slice(0, 5);

  const stats = [
    { label: "Total Tasks", value: totalTasks, icon: ListTodo },
    { label: "Due Today", value: dueToday, icon: CalendarDays },
    { label: "Completed This Week", value: completedThisWeek, icon: CheckSquare },
    { label: "Tracked Today", value: `${trackedToday}m`, icon: Timer },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Priority Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks due today.</p>
          ) : (
            <ul className="space-y-2">
              {todayTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="font-medium">{task.title}</span>
                  <span className="text-xs text-muted-foreground">Score: {task.priority_score}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
