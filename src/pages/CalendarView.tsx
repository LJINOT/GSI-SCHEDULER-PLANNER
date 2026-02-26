import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";

export default function CalendarView() {
  const { data: tasks = [] } = useTasks();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const tasksForDate = selectedDate
    ? tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), selectedDate))
    : [];

  // Dates that have tasks
  const datesWithTasks = tasks
    .filter((t) => t.due_date)
    .map((t) => new Date(t.due_date!));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendar</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="pointer-events-auto"
              modifiers={{ hasTasks: datesWithTasks }}
              modifiersStyles={{ hasTasks: { fontWeight: "bold", textDecoration: "underline" } }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksForDate.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tasks on this date.</p>
            ) : (
              <ul className="space-y-2">
                {tasksForDate.map((task) => (
                  <li key={task.id} className="flex items-center justify-between border border-border rounded-md p-3">
                    <span className="font-medium">{task.title}</span>
                    <Badge variant={task.status === "completed" ? "default" : "outline"}>{task.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
