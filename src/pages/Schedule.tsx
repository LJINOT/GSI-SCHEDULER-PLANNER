import { useTasks } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isToday, addDays, format, isBefore, isAfter, startOfDay } from "date-fns";

export default function Schedule() {
  const { data: tasks = [] } = useTasks();
  const { data: profile } = useProfile();

  const workStart = profile?.work_start_time ?? "09:00";
  const workEnd = profile?.work_end_time ?? "17:00";

  // Generate schedule for next 7 days
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const pendingTasks = tasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));

  // Simple scheduling: assign tasks to days based on due date, then fill by priority
  const schedule = days.map((day) => {
    const dayTasks = pendingTasks.filter((t) => {
      if (!t.due_date) return false;
      return isBefore(new Date(t.due_date), addDays(day, 1)) && !isBefore(new Date(t.due_date), day);
    });
    return { date: day, tasks: dayTasks };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Schedule</h1>
      <p className="text-sm text-muted-foreground">
        Work hours: {workStart} – {workEnd}
      </p>

      <div className="space-y-4">
        {schedule.map(({ date, tasks }) => (
          <Card key={date.toISOString()}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {format(date, "EEEE, MMM d")}
                {isToday(date) && <Badge variant="secondary">Today</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks scheduled.</p>
              ) : (
                <ul className="space-y-1">
                  {tasks.map((task) => (
                    <li key={task.id} className="flex justify-between items-center text-sm border border-border rounded p-2">
                      <span>{task.title}</span>
                      <span className="text-muted-foreground">{task.estimated_minutes}min</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
