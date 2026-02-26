import { useTasks } from "@/hooks/useTasks";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export default function Completed() {
  const { data: tasks = [] } = useTasks("completed");
  const { data: timeEntries = [] } = useTimeEntries();

  const getTimeSpent = (taskId: string) =>
    timeEntries
      .filter((e) => e.task_id === taskId)
      .reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Completed</h1>

      {tasks.length === 0 ? (
        <p className="text-muted-foreground">No completed tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="font-medium line-through text-muted-foreground">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Completed: {task.completed_at ? format(new Date(task.completed_at), "MMM d, yyyy") : "—"}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">{getTimeSpent(task.id)}min tracked</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
