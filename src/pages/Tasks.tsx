import { useState } from "react";
import { useTasks, useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, CheckCircle, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Tasks() {
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = (id: string, status: string) => {
    updateTask.mutate(
      { id, status, completed_at: status === "completed" ? new Date().toISOString() : null },
      { onSuccess: () => toast.success("Task updated") }
    );
  };

  const handleDelete = (id: string) => {
    deleteTask.mutate(id, { onSuccess: () => toast.success("Task deleted") });
  };

  const statusColor = (s: string | null) => {
    if (s === "completed") return "default";
    if (s === "in-progress") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tasks</h1>
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search tasks..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No tasks found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {task.due_date && <span>Due: {format(new Date(task.due_date), "MMM d")}</span>}
                    <span>Score: {task.priority_score}</span>
                    <Badge variant={statusColor(task.status)}>{task.status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {task.status !== "completed" && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStatusChange(task.id, "in-progress")}
                        title="Start"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStatusChange(task.id, "completed")}
                        title="Complete"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(task.id)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
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
