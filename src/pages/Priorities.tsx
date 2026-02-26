import { useTasks } from "@/hooks/useTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function Priorities() {
  const { data: tasks = [] } = useTasks();

  const pending = tasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Priorities</h1>
      <p className="text-sm text-muted-foreground">Tasks ranked by AHP priority score</p>

      {pending.length === 0 ? (
        <p className="text-muted-foreground">No pending tasks.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((task, i) => (
            <Card key={task.id}>
              <CardContent className="flex items-center gap-4 py-3 px-4">
                <span className="text-lg font-bold text-muted-foreground w-8">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Progress value={(task.priority_score ?? 0) * 100} className="h-2 flex-1" />
                    <span className="text-sm font-mono text-muted-foreground w-12">{task.priority_score}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
