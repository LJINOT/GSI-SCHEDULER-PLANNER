import { useTasks } from "@/hooks/useTasks";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { subDays, format, isAfter } from "date-fns";

const COLORS = ["hsl(222, 47%, 11%)", "hsl(210, 40%, 50%)", "hsl(215, 16%, 47%)", "hsl(0, 84%, 60%)", "hsl(210, 40%, 96%)"];

export default function Analytics() {
  const { data: tasks = [] } = useTasks();
  const { data: timeEntries = [] } = useTimeEntries();

  // Weekly completion data (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const completed = tasks.filter(
      (t) => t.completed_at && format(new Date(t.completed_at), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
    ).length;
    return { day: format(day, "EEE"), completed };
  });

  // Time by difficulty
  const timeByDifficulty = [1, 2, 3, 4, 5].map((d) => {
    const taskIds = tasks.filter((t) => t.difficulty === d).map((t) => t.id);
    const mins = timeEntries
      .filter((e) => taskIds.includes(e.task_id))
      .reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
    return { difficulty: `Level ${d}`, minutes: mins };
  });

  // Status breakdown
  const statusData = [
    { name: "Pending", value: tasks.filter((t) => t.status === "pending").length },
    { name: "In Progress", value: tasks.filter((t) => t.status === "in-progress").length },
    { name: "Completed", value: tasks.filter((t) => t.status === "completed").length },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="completed" fill="hsl(222, 47%, 11%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Task Status</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {statusData.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tasks yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Time Tracked by Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeByDifficulty}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="difficulty" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="minutes" fill="hsl(210, 40%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
