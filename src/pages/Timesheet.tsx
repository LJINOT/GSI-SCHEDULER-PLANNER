import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTimeEntries, useStartTimer, useStopTimer } from "@/hooks/useTimeEntries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayCircle, StopCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Timesheet() {
  const { data: tasks = [] } = useTasks();
  const { data: entries = [] } = useTimeEntries();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const [selectedTask, setSelectedTask] = useState<string>("");

  const activeEntry = entries.find((e) => !e.end_time);
  const pendingTasks = tasks.filter((t) => t.status !== "completed");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Timesheet</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeEntry ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Timer running since {format(new Date(activeEntry.start_time), "h:mm a")}</p>
                <p className="text-sm text-muted-foreground">
                  Task: {(activeEntry as any).tasks?.title ?? "Unknown"}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => stopTimer.mutate(activeEntry.id, { onSuccess: () => toast.success("Timer stopped") })}
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {pendingTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!selectedTask}
                onClick={() =>
                  startTimer.mutate(selectedTask, {
                    onSuccess: () => {
                      toast.success("Timer started");
                      setSelectedTask("");
                    },
                  })
                }
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Start
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No time entries yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 20).map((entry) => (
                <div key={entry.id} className="flex justify-between items-center text-sm border border-border rounded p-2">
                  <span>{(entry as any).tasks?.title ?? "Unknown"}</span>
                  <div className="text-muted-foreground">
                    {format(new Date(entry.start_time), "MMM d, h:mm a")}
                    {entry.end_time ? ` – ${format(new Date(entry.end_time), "h:mm a")}` : " (running)"}
                    {entry.duration_minutes != null && <span className="ml-2 font-mono">{entry.duration_minutes}m</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
