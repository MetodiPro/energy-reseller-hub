import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StepAssignment {
  step_id: string;
  assigned_to: string;
  assigned_by: string;
  profile_name?: string;
}

export const useStepAssignments = (projectId: string | null) => {
  const [assignments, setAssignments] = useState<Record<string, StepAssignment>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setAssignments({});
      setProfiles({});
      return;
    }

    const fetchAssignments = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('step_assignments')
        .select('step_id, assigned_to, assigned_by')
        .eq('project_id', projectId);

      if (data && data.length > 0) {
        const assignmentMap: Record<string, StepAssignment> = {};
        const userIds = new Set<string>();

        data.forEach(a => {
          assignmentMap[a.step_id] = a;
          userIds.add(a.assigned_to);
        });

        // Fetch profile names
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(userIds));

        const profileMap: Record<string, string> = {};
        profilesData?.forEach(p => {
          profileMap[p.id] = p.full_name || 'Utente';
        });

        setAssignments(assignmentMap);
        setProfiles(profileMap);
      } else {
        setAssignments({});
      }
      setLoading(false);
    };

    fetchAssignments();
  }, [projectId]);

  const getAssigneeName = (stepId: string): string | null => {
    const assignment = assignments[stepId];
    if (!assignment) return null;
    return profiles[assignment.assigned_to] || 'Utente';
  };

  return { assignments, getAssigneeName, loading };
};
