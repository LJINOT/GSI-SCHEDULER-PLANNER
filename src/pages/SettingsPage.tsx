import { useState, useEffect } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTasks } from "@/hooks/useTasks";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: tasks = [] } = useTasks();

  const [displayName, setDisplayName] = useState("");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [breakDuration, setBreakDuration] = useState(15);
  const [peakStart, setPeakStart] = useState("09:00");
  const [peakEnd, setPeakEnd] = useState("12:00");
  const [dailyHours, setDailyHours] = useState(8);
  const [wUrgency, setWUrgency] = useState(40);
  const [wGrade, setWGrade] = useState(35);
  const [wDifficulty, setWDifficulty] = useState(25);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setWorkStart(profile.work_start_time ?? "09:00");
      setWorkEnd(profile.work_end_time ?? "17:00");
      setBreakDuration(profile.break_duration_minutes ?? 15);
      setPeakStart(profile.peak_hours_start ?? "09:00");
      setPeakEnd(profile.peak_hours_end ?? "12:00");
      setDailyHours(profile.daily_work_hours ?? 8);
      setWUrgency((profile.ahp_weight_urgency ?? 0.4) * 100);
      setWGrade((profile.ahp_weight_grade ?? 0.35) * 100);
      setWDifficulty((profile.ahp_weight_difficulty ?? 0.25) * 100);
    }
  }, [profile]);

  const saveProfile = () => {
    updateProfile.mutate(
      {
        display_name: displayName,
        work_start_time: workStart,
        work_end_time: workEnd,
        break_duration_minutes: breakDuration,
        peak_hours_start: peakStart,
        peak_hours_end: peakEnd,
        daily_work_hours: dailyHours,
        ahp_weight_urgency: wUrgency / 100,
        ahp_weight_grade: wGrade / 100,
        ahp_weight_difficulty: wDifficulty / 100,
      },
      { onSuccess: () => toast.success("Settings saved!") }
    );
  };

  const exportCSV = () => {
    const headers = "Title,Status,Due Date,Priority Score,Estimated Minutes,Urgency,Difficulty,Grade Weight\n";
    const rows = tasks
      .map(
        (t) =>
          `"${t.title}",${t.status},${t.due_date ?? ""},${t.priority_score},${t.estimated_minutes},${t.urgency},${t.difficulty},${t.grade_weight}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Tabs defaultValue="general">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ahp">AHP Weights</TabsTrigger>
          <TabsTrigger value="personalization">Personalization</TabsTrigger>
          <TabsTrigger value="data">Data & Export</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Daily Work Hours</Label>
                <Input type="number" min={1} max={24} value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ahp" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Priority Weights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Urgency</Label>
                  <span className="text-sm text-muted-foreground">{wUrgency}%</span>
                </div>
                <Slider min={0} max={100} value={[wUrgency]} onValueChange={([v]) => setWUrgency(v)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Grade Weight</Label>
                  <span className="text-sm text-muted-foreground">{wGrade}%</span>
                </div>
                <Slider min={0} max={100} value={[wGrade]} onValueChange={([v]) => setWGrade(v)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Difficulty</Label>
                  <span className="text-sm text-muted-foreground">{wDifficulty}%</span>
                </div>
                <Slider min={0} max={100} value={[wDifficulty]} onValueChange={([v]) => setWDifficulty(v)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {wUrgency + wGrade + wDifficulty}% (values are normalized automatically)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personalization" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Work Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Work Start</Label>
                  <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Work End</Label>
                  <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Break Duration (minutes)</Label>
                <Input type="number" min={0} value={breakDuration} onChange={(e) => setBreakDuration(Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Peak Hours Start</Label>
                  <Input type="time" value={peakStart} onChange={(e) => setPeakStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Peak Hours End</Label>
                  <Input type="time" value={peakEnd} onChange={(e) => setPeakEnd(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={exportCSV}>Export Tasks as CSV</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={saveProfile} className="w-full" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
