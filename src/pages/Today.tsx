import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useStartTimer } from "@/hooks/useTimeEntries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, PlayCircle } from "lucide-react";
import { isToday, isBefore, startOfTomorrow } from "date-fns";
import { toast } from "sonner";

export default function Today() {
  const { data: tasks = [] } = useTasks();
  const updateTask = useUpdateTask();
  const startTimer = useStartTimer();

  const todayTasks = tasks
    .filter((t) => {
      if (t.status === "completed") return false;
      if (!t.due_date) return false;
      return isBefore(new Date(t.due_date), startOfTomorrow());
    })
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Today</h1>

      {todayTasks.length === 0 ? (
        <p className="text-muted-foreground">No tasks for today. Great job!</p>
      ) : (
        <div className="space-y-2">
          {todayTasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Priority: {task.priority_score} • {task.estimated_minutes}min
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      startTimer.mutate(task.id, { onSuccess: () => toast.success("Timer started") })
                    }
                  >
                    <PlayCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      updateTask.mutate(
                        { id: task.id, status: "completed", completed_at: new Date().toISOString() },
                        { onSuccess: () => toast.success("Task completed!") }
                      )
                    }
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
