import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useTimeEntries(taskId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["time_entries", user?.id, taskId],
    queryFn: async () => {
      let query = supabase
        .from("time_entries")
        .select("*, tasks(title)")
        .eq("user_id", user!.id)
        .order("start_time", { ascending: false });
      if (taskId) query = query.eq("task_id", taskId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useStartTimer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({ task_id: taskId, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
    },
  });
}

export function useStopTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const now = new Date().toISOString();
      // First get the entry to calculate duration
      const { data: entry } = await supabase
        .from("time_entries")
        .select("start_time")
        .eq("id", entryId)
        .single();

      const durationMinutes = entry
        ? Math.round((new Date(now).getTime() - new Date(entry.start_time).getTime()) / 60000)
        : 0;

      const { data, error } = await supabase
        .from("time_entries")
        .update({ end_time: now, duration_minutes: durationMinutes })
        .eq("id", entryId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
    },
  });
}
