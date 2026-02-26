import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateTask } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { calculatePriorityScore } from "@/lib/ahp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AddTask() {
  const navigate = useNavigate();
  const createTask = useCreateTask();
  const { data: profile } = useProfile();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [difficulty, setDifficulty] = useState(3);
  const [urgency, setUrgency] = useState(3);
  const [gradeWeight, setGradeWeight] = useState(3);

  const weights = {
    urgency: profile?.ahp_weight_urgency ?? 0.4,
    grade: profile?.ahp_weight_grade ?? 0.35,
    difficulty: profile?.ahp_weight_difficulty ?? 0.25,
  };

  const priorityScore = calculatePriorityScore(urgency, gradeWeight, difficulty, weights);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");

    createTask.mutate(
      {
        title,
        description,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        estimated_minutes: estimatedMinutes,
        difficulty,
        urgency,
        grade_weight: gradeWeight,
        priority_score: priorityScore,
      },
      {
        onSuccess: () => {
          toast.success("Task created!");
          navigate("/tasks");
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Add Task</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Task Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Estimated Time (minutes)</Label>
              <Input type="number" min={5} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AHP Priority Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Urgency</Label>
                <span className="text-sm text-muted-foreground">{urgency}/5</span>
              </div>
              <Slider min={1} max={5} step={1} value={[urgency]} onValueChange={([v]) => setUrgency(v)} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Grade Weight</Label>
                <span className="text-sm text-muted-foreground">{gradeWeight}/5</span>
              </div>
              <Slider min={1} max={5} step={1} value={[gradeWeight]} onValueChange={([v]) => setGradeWeight(v)} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Difficulty</Label>
                <span className="text-sm text-muted-foreground">{difficulty}/5</span>
              </div>
              <Slider min={1} max={5} step={1} value={[difficulty]} onValueChange={([v]) => setDifficulty(v)} />
            </div>

            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Priority Score</p>
              <p className="text-3xl font-bold text-primary">{priorityScore}</p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={createTask.isPending}>
          {createTask.isPending ? "Creating..." : "Create Task"}
        </Button>
      </form>
    </div>
  );
}
