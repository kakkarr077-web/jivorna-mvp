import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  Repeat,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoCard, InfoRow, LoadingSkeleton, PageHeader, StatusBadge } from "@/components/crm/CrmPrimitives";
import { Timeline, type TimelineItem } from "@/components/crm/Timeline";
import { NotesPanel, type CrmNote } from "@/components/crm/NotesPanel";
import { CommunicationTimeline } from "@/components/crm/CommunicationTimeline";
import { TasksPanel } from "@/components/crm/TasksPanel";
import { formatDate, formatDateTime, dash } from "@/lib/crm";
import { cn } from "@/lib/utils";
import {
  EditLeadDialog,
  DeleteLeadDialog,
  ConvertLeadDialog,
} from "@/components/admin/LeadDialogs";
import {
  fetchLeadDetail,
  addLeadActivity,
  updateLeadActivity,
  deleteLeadActivity,
  toggleLeadActivityComplete,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONES,
  LEAD_PRIORITY_LABELS,
  LEAD_PRIORITY_TONES,
} from "@/lib/admin-leads";

export const Route = createFileRoute("/_authenticated/admin/leads/$leadId")({
  component: AdminLeadDetail,
});

const ACTIVITY_ICON: Record<string, typeof MessageSquare> = {
  note: MessageSquare,
  call: PhoneCall,
  email: Mail,
  meeting: Users,
  task: CheckCircle2,
};

function AdminLeadDetail() {
  const { leadId } = useParams({ strict: false }) as { leadId: string };
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-lead", leadId],
    queryFn: () => fetchLeadDetail(leadId),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-lead", leadId] });

  const addActivity = useMutation({
    mutationFn: addLeadActivity,
    onSuccess: () => {
      toast.success("Activity logged.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not log activity"),
  });

  const toggleComplete = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => toggleLeadActivityComplete(id, completed),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update task"),
  });

  const removeActivity = useMutation({
    mutationFn: deleteLeadActivity,
    onSuccess: () => {
      toast.success("Removed.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove"),
  });

  const updateActivity = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => updateLeadActivity(id, { body }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update note"),
  });

  const [taskOpen, setTaskOpen] = useState(false);
  const [taskBody, setTaskBody] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskType, setTaskType] = useState("task");

  if (isLoading) return <LoadingSkeleton variant="profile" />;
  if (error || !data) return <div className="text-sm text-destructive">Could not load this lead.</div>;

  const { lead, activities, assignedName, convertedSchoolName } = data;

  const timelineItems: TimelineItem[] = activities.map((a) => ({
    id: a.id,
    title: a.activity_type === "note" ? "Note added" : `${a.activity_type.charAt(0).toUpperCase()}${a.activity_type.slice(1)} logged`,
    description: a.body,
    at: a.created_at,
    icon: ACTIVITY_ICON[a.activity_type] ?? MessageSquare,
    meta: a.authorName ? <span className="text-xs text-muted-foreground">by {a.authorName}</span> : undefined,
  }));

  const tasks = activities.filter((a) => a.due_at);
  const notes: CrmNote[] = activities
    .filter((a) => a.activity_type === "note")
    .map((a) => ({ id: a.id, body: a.body, author: a.authorName, created_at: a.created_at }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.school_name}
        description={lead.contact_person ? `Contact: ${lead.contact_person}` : ""}
        action={
          <div className="flex flex-wrap gap-2">
            <EditLeadDialog
              lead={lead}
              trigger={
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              }
            />
            {!lead.converted_school_id && lead.status !== "won" && (
              <ConvertLeadDialog
                lead={lead}
                trigger={
                  <Button variant="gold">
                    <ShieldCheck className="mr-2 h-4 w-4" /> Convert to school
                  </Button>
                }
                onConverted={(schoolId) => void navigate({ to: "/admin/schools/$schoolId", params: { schoolId } })}
              />
            )}
            <DeleteLeadDialog
              leadId={lead.id}
              trigger={
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              }
              onDeleted={() => void navigate({ to: "/admin/leads" })}
            />
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <StatusBadge label={LEAD_STATUS_LABELS[lead.status]} tone={LEAD_STATUS_TONES[lead.status]} />
        <StatusBadge label={LEAD_PRIORITY_LABELS[lead.priority]} tone={LEAD_PRIORITY_TONES[lead.priority]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <InfoCard title="Overview">
            <div className="grid gap-x-6 sm:grid-cols-2">
              <InfoRow label="Phone" value={dash(lead.phone)} />
              <InfoRow label="Email" value={dash(lead.email)} />
              <InfoRow label="City" value={dash(lead.city)} />
              <InfoRow label="Board" value={dash(lead.board)} />
              <InfoRow label="Source" value={dash(lead.source)} />
              <InfoRow label="Notes" value={dash(lead.notes)} />
            </div>
          </InfoCard>

          <InfoCard
            title="Tasks & reminders"
            action={
              <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Add task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add task or reminder</DialogTitle>
                    <DialogDescription>Log a follow-up activity for this lead.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Select value={taskType} onValueChange={setTaskType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea value={taskBody} onChange={(e) => setTaskBody(e.target.value)} placeholder="What needs to happen?" rows={3} />
                    <Input type="datetime-local" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setTaskOpen(false)}>Cancel</Button>
                    <Button
                      disabled={!taskBody.trim()}
                      onClick={() => {
                        addActivity.mutate(
                          {
                            lead_id: lead.id,
                            activity_type: taskType,
                            body: taskBody.trim(),
                            due_at: taskDue ? new Date(taskDue).toISOString() : null,
                          },
                          {
                            onSuccess: () => {
                              setTaskOpen(false);
                              setTaskBody("");
                              setTaskDue("");
                              setTaskType("task");
                            },
                          },
                        );
                      }}
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            }
          >
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet. Add one to stay on top of follow-ups.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => {
                  const overdue = !t.completed && t.due_at && new Date(t.due_at).getTime() < Date.now();
                  return (
                    <li
                      key={t.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border border-border p-3",
                        overdue && "border-destructive/40 bg-destructive/5",
                      )}
                    >
                      <Checkbox
                        checked={t.completed}
                        onCheckedChange={(v) => toggleComplete.mutate({ id: t.id, completed: Boolean(v) })}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm", t.completed && "text-muted-foreground line-through")}>{t.body}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {formatDateTime(t.due_at)}
                          {overdue && <span className="ml-1 text-destructive">Overdue</span>}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeActivity.mutate(t.id)} aria-label="Delete task">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </InfoCard>

          <InfoCard title="Activity timeline" description="Every call, email and update logged for this lead.">
            <Timeline items={timelineItems} />
          </InfoCard>

          <CommunicationTimeline entityType="lead" entityId={lead.id} />

          <TasksPanel relatedType="lead" relatedId={lead.id} />

          <NotesPanel
            notes={notes}
            onAdd={(body) => addActivity.mutateAsync({ lead_id: lead.id, activity_type: "note", body })}
            onUpdate={(id, body) => updateActivity.mutateAsync({ id, body })}
            onDelete={(id) => removeActivity.mutateAsync(id)}
          />
        </div>

        <div className="space-y-6">
          <InfoCard title="Details">
            <InfoRow label="Status" value={<StatusBadge label={LEAD_STATUS_LABELS[lead.status]} tone={LEAD_STATUS_TONES[lead.status]} />} />
            <InfoRow label="Priority" value={<StatusBadge label={LEAD_PRIORITY_LABELS[lead.priority]} tone={LEAD_PRIORITY_TONES[lead.priority]} />} />
            <InfoRow label="Next follow-up" value={formatDate(lead.next_follow_up)} />
            <InfoRow label="Assigned to" value={dash(assignedName)} />
            <InfoRow label="Source" value={dash(lead.source)} />
            <InfoRow label="Created" value={formatDate(lead.created_at)} />
            {lead.converted_school_id && (
              <InfoRow
                label="Converted"
                value={
                  <Link to="/admin/schools/$schoolId" params={{ schoolId: lead.converted_school_id }} className="text-primary hover:underline">
                    {convertedSchoolName ?? "View school"}
                  </Link>
                }
              />
            )}
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
