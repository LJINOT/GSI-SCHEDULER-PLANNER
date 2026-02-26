import { useTasks } from "@/hooks/useTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startOfWeek, endOfWeek, addDays, format, isSameDay, isBefore } from "date-fns";

export default function ThisWeek() {
  const { data: tasks = [] } = useTasks();

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekTasks = tasks.filter((t) => {
    if (t.status === "completed") return false;
    if (!t.due_date) return false;
    const due = new Date(t.due_date);
    return isBefore(due, endOfWeek(today, { weekStartsOn: 1 })) || isBefore(due, today);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">This Week</h1>

      <div className="space-y-4">
        {days.map((day) => {
          const dayTasks = weekTasks
            .filter((t) => t.due_date && isSameDay(new Date(t.due_date), day))
            .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));

          return (
            <Card key={day.toISOString()}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {format(day, "EEEE, MMM d")}
                  {isSameDay(day, today) && <Badge variant="secondary">Today</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dayTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks.</p>
                ) : (
                  <ul className="space-y-1">
                    {dayTasks.map((t) => (
                      <li key={t.id} className="flex justify-between text-sm border border-border rounded p-2">
                        <span>{t.title}</span>
                        <Badge variant="outline">{t.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
