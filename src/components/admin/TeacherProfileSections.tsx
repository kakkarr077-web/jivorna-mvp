import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, InfoCard, InfoRow, StatusBadge } from "@/components/crm/CrmPrimitives";
import { formatDate, formatDateTime, dash } from "@/lib/crm";
import { stageLabel } from "@/lib/pipeline";
import {
  formatBytes,
  type TeacherApplication,
  type TeacherDocument,
  type TeacherInterview,
  type TeacherInternalComment,
  type TeacherProfileRow,
} from "@/lib/admin-teachers";

export function OverviewSection({ profile }: { profile: TeacherProfileRow }) {
  return (
    <InfoCard title="Overview">
      <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
        <InfoRow label="Full name" value={profile.full_name} />
        <InfoRow label="Email" value={profile.email} />
        <InfoRow label="Phone" value={profile.phone} />
        <InfoRow label="Headline" value={profile.headline} />
        <InfoRow label="City" value={profile.city} />
        <InfoRow label="State" value={profile.state} />
        <InfoRow label="Location" value={profile.location} />
        <InfoRow label="Current school" value={profile.current_school} />
      </dl>
      {profile.bio && <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{profile.bio}</p>}
    </InfoCard>
  );
}

export function EducationSection({ profile }: { profile: TeacherProfileRow }) {
  return (
    <InfoCard title="Education & qualification">
      <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
        <InfoRow label="Qualification" value={profile.qualification} />
        <InfoRow label="Experience" value={`${profile.experience_years} years`} />
        <InfoRow label="Current salary" value={profile.current_salary ? `₹${profile.current_salary.toLocaleString("en-IN")}` : null} />
        <InfoRow label="Notice period" value={profile.notice_period_days ? `${profile.notice_period_days} days` : null} />
      </dl>
    </InfoCard>
  );
}

export function TagsSection({
  subjects,
  boards,
  grades,
  cities,
  languages,
}: {
  subjects: string[];
  boards: string[];
  grades: string[];
  cities: string[];
  languages: string[];
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <InfoCard title="Subjects">
        <TagList items={subjects} />
      </InfoCard>
      <InfoCard title="Preferred boards">
        <TagList items={boards} />
      </InfoCard>
      <InfoCard title="Grades">
        <TagList items={grades} />
      </InfoCard>
      <InfoCard title="Preferred cities">
        <TagList items={cities} />
      </InfoCard>
      <InfoCard title="Languages" className="sm:col-span-2">
        <TagList items={languages} />
      </InfoCard>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Not recorded</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant="outline">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export function DocumentsSection({
  documents,
  onDownload,
}: {
  documents: TeacherDocument[];
  onDownload: (path: string) => void;
}) {
  return (
    <InfoCard title="Resume & certifications">
      {documents.length === 0 ? (
        <EmptyState title="No documents uploaded" description="This teacher hasn't uploaded any files yet." />
      ) : (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.doc_type} · {formatBytes(d.file_size_bytes)} · {formatDate(d.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {d.verified && <StatusBadge label="Verified" tone="default" />}
                <Button size="sm" variant="outline" onClick={() => onDownload(d.file_url)}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </InfoCard>
  );
}

export function ApplicationsSection({ applications }: { applications: TeacherApplication[] }) {
  return (
    <InfoCard title="Applications">
      {applications.length === 0 ? (
        <EmptyState title="No applications yet" description="This teacher hasn't applied to any jobs." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Interview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.jobTitle}</TableCell>
                  <TableCell>{a.schoolName}</TableCell>
                  <TableCell>
                    <StatusBadge label={stageLabel(a.status)} tone="outline" />
                  </TableCell>
                  <TableCell>{formatDate(a.created_at)}</TableCell>
                  <TableCell>{a.interviewAt ? formatDateTime(a.interviewAt) : dash(null)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </InfoCard>
  );
}

export function InterviewsSection({ interviews }: { interviews: TeacherInterview[] }) {
  return (
    <InfoCard title="Interview history">
      {interviews.length === 0 ? (
        <EmptyState title="No interviews yet" description="Interviews scheduled with this teacher will appear here." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Interviewer</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.jobTitle}</TableCell>
                  <TableCell>{formatDateTime(i.scheduled_at)}</TableCell>
                  <TableCell className="capitalize">{i.mode.replace("_", " ")}</TableCell>
                  <TableCell>
                    <StatusBadge label={i.status} tone="outline" />
                  </TableCell>
                  <TableCell>{dash(i.interviewer_name)}</TableCell>
                  <TableCell>{dash(i.outcome)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </InfoCard>
  );
}

export function InternalCommentsSection({ comments }: { comments: TeacherInternalComment[] }) {
  return (
    <InfoCard title="Internal notes" description="Internal comments from application reviews across all this teacher's applications.">
      {comments.length === 0 ? (
        <EmptyState title="No internal notes" description="Internal comments left on this teacher's applications will show here." />
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-surface p-4">
              <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {c.author ?? "Admin"} · {c.jobTitle} · {formatDateTime(c.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </InfoCard>
  );
}
