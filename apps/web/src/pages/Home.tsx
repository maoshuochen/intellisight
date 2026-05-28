import { ArrowRightIcon, BookOpenIcon, FileTextIcon, LightbulbIcon, MapIcon, PencilLineIcon, TagsIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { Annotation, CanvasDocument, Code, Interview, Outline, Paragraph, Participant, Report } from "@intellisight/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBadge, EmptyState, InlineAlert, PageTitle, TextMuted } from "@/components/ui/app-kit";
import { api } from "../lib/api";
import { useAppStore } from "../lib/store";

type HighlightAnnotation = Annotation & {
  interviewId?: string;
  interviewName?: string;
  paragraphSortOrder?: number;
};

export function Home() {
  const projectId = useAppStore((state) => state.projectId);
  const enabled = Boolean(projectId);
  const interviews = useQuery({
    queryKey: ["interviews", projectId],
    enabled,
    queryFn: () => api.get<Interview[]>(`/interviews?projectId=${projectId}`)
  });
  const outlines = useQuery({
    queryKey: ["outlines", projectId],
    enabled,
    queryFn: () => api.get<Outline[]>(`/outlines?projectId=${projectId}`)
  });
  const codes = useQuery({
    queryKey: ["codes", projectId],
    enabled,
    queryFn: () => api.get<Code[]>(`/codes?projectId=${projectId}`)
  });
  const annotations = useQuery({
    queryKey: ["annotations", projectId],
    enabled,
    queryFn: () => api.get<HighlightAnnotation[]>(`/annotations?projectId=${projectId}`)
  });
  const reports = useQuery({
    queryKey: ["reports", projectId],
    enabled,
    queryFn: () => api.get<Report[]>(`/reports?projectId=${projectId}`)
  });
  const participants = useQuery({
    queryKey: ["participants", projectId],
    enabled,
    queryFn: () => api.get<Participant[]>(`/participants?projectId=${projectId}`)
  });
  const canvases = useQuery({
    queryKey: ["canvases", projectId],
    enabled,
    queryFn: () => api.get<CanvasDocument[]>(`/canvases?projectId=${projectId}`)
  });
  const firstInterviewId = interviews.data?.[0]?.id;
  const paragraphs = useQuery({
    queryKey: ["paragraphs", firstInterviewId],
    enabled: Boolean(firstInterviewId),
    queryFn: () => api.get<Paragraph[]>(`/interviews/${firstInterviewId}/paragraphs`)
  });

  if (!projectId) {
    return (
      <div className="page">
        <EmptyState description="Create or select a project to start a research workspace." />
      </div>
    );
  }

  const error = interviews.error ?? outlines.error ?? codes.error ?? annotations.error ?? reports.error ?? participants.error ?? canvases.error ?? paragraphs.error;
  const codedParagraphIds = new Set((annotations.data ?? []).map((item) => item.paragraphId));
  const paragraphCount = paragraphs.data?.length ?? 0;
  const codedParagraphCount = paragraphCount ? (paragraphs.data ?? []).filter((item) => codedParagraphIds.has(item.id)).length : 0;
  const uncodedParagraphCount = Math.max(0, paragraphCount - codedParagraphCount);
  const canvasAnnotationIds = new Set<string>();
  let themeCount = 0;
  for (const canvas of canvases.data ?? []) {
    for (const node of canvas.nodes as Array<{ data?: { annotationId?: string; sourceType?: string } }>) {
      if (node.data?.annotationId) canvasAnnotationIds.add(node.data.annotationId);
      if (node.data?.sourceType === "theme") themeCount += 1;
    }
  }
  const highlightsNotOnCanvas = (annotations.data ?? []).filter((annotation) => !canvasAnnotationIds.has(annotation.id)).length;
  const sampleGroupCount = new Set((participants.data ?? []).map((item) => item.sampleGroup).filter(Boolean)).size;
  const interviewCoverage = interviews.data?.length
    ? Math.round(((interviews.data ?? []).filter((item) => item.participantId || item.participantName).length / (interviews.data?.length ?? 1)) * 100)
    : 0;
  const nextStep = getNextStep({
    interviews: interviews.data?.length ?? 0,
    outlines: outlines.data?.length ?? 0,
    codes: codes.data?.length ?? 0,
    highlights: annotations.data?.length ?? 0,
    reports: reports.data?.length ?? 0,
    uncodedParagraphs: uncodedParagraphCount,
    highlightsNotOnCanvas,
    themes: themeCount
  });

  return (
    <div className="page">
      <PageTitle
        title="Research workspace"
        description="Track the path from interview preparation to evidence-backed synthesis."
        action={
          <Button render={<Link to={nextStep.href} />}>
            {nextStep.action}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        }
      />
      {error && <InlineAlert variant="destructive">{error.message}</InlineAlert>}

      <div className="workflow-strip">
        <WorkflowStep icon={BookOpenIcon} label="Plan" complete={(outlines.data?.length ?? 0) > 0} href="/outlines" />
        <WorkflowStep icon={PencilLineIcon} label="Import" complete={(interviews.data?.length ?? 0) > 0} href="/interviews" />
        <WorkflowStep icon={TagsIcon} label="Code" complete={(annotations.data?.length ?? 0) > 0} href="/codes" />
        <WorkflowStep icon={LightbulbIcon} label="Evidence" complete={(annotations.data?.length ?? 0) > 0} href="/highlights" />
        <WorkflowStep icon={MapIcon} label="Synthesize" complete={themeCount > 0} href="/canvas" />
        <WorkflowStep icon={FileTextIcon} label="Report" complete={(reports.data?.length ?? 0) > 0} href="/reports" />
      </div>

      <div className="dashboard-grid">
        <Card className="dashboard-primary">
          <CardHeader>
            <CardTitle>Next best action</CardTitle>
          </CardHeader>
          <CardContent className="next-action-card">
            <nextStep.icon />
            <div>
              <strong>{nextStep.title}</strong>
              <TextMuted>{nextStep.description}</TextMuted>
            </div>
            <Button variant="outline" render={<Link to={nextStep.href} />}>
              {nextStep.action}
            </Button>
          </CardContent>
        </Card>
        <StatCard title="Interviews" value={interviews.data?.length ?? 0} note={`${paragraphCount} paragraphs in current interview`} />
        <StatCard title="Participants" value={participants.data?.length ?? 0} note={`${sampleGroupCount} sample groups · ${interviewCoverage}% interview coverage`} />
        <StatCard title="Coding progress" value={paragraphCount ? `${codedParagraphCount}/${paragraphCount}` : "0"} note={`${annotations.data?.length ?? 0} saved highlights`} />
        <StatCard title="Reports" value={reports.data?.length ?? 0} note={reports.data?.[0]?.title ?? "No synthesis saved yet"} />
      </div>

      <div className="home-columns">
        <Card>
          <CardHeader>
            <CardTitle>Recent interviews</CardTitle>
          </CardHeader>
          <CardContent className="list-stack">
            {(interviews.data ?? []).slice(0, 4).map((item) => (
              <Link key={item.id} className="list-row clickable-row" to={`/interviews?interviewId=${item.id}`}>
                <strong>{item.name}</strong>
                <TextMuted>{[item.participant?.displayName ?? item.participantName, item.participant?.sampleGroup].filter(Boolean).join(" / ") || item.sample || "Transcript"}</TextMuted>
              </Link>
            ))}
            {!(interviews.data ?? []).length && <EmptyState description="No interviews yet. Import a transcript so the project has paragraphs to code." action={<Button render={<Link to="/interviews" />}>Import transcript</Button>} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Evidence queue</CardTitle>
          </CardHeader>
          <CardContent className="list-stack">
            {(annotations.data ?? []).slice(0, 4).map((item) => (
              <Link key={item.id} className="list-row clickable-row" to={`/highlights?annotationId=${item.id}`}>
                <strong>{item.text}</strong>
                <TextMuted>{item.interviewName ?? "Interview"} · {item.codeIds.length} codes</TextMuted>
              </Link>
            ))}
            {!(annotations.data ?? []).length && <EmptyState description="No highlights yet. Select a participant quote inside Interviews and save it with at least one code." action={<Button render={<Link to="/interviews" />}>Start coding</Button>} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getNextStep(counts: { outlines: number; interviews: number; codes: number; highlights: number; reports: number; uncodedParagraphs: number; highlightsNotOnCanvas: number; themes: number }) {
  if (!counts.outlines && !counts.interviews) {
    return { icon: BookOpenIcon, title: "Create an interview outline", description: "Start with the research questions you want each interview to answer.", href: "/outlines", action: "Create outline" };
  }
  if (!counts.interviews) {
    return { icon: PencilLineIcon, title: "Import the first transcript", description: "Bring in raw interview text so the project has evidence to code.", href: "/interviews", action: "Import transcript" };
  }
  if (!counts.codes) {
    return { icon: TagsIcon, title: "Create a starter codebook", description: "Define the categories you expect to use while coding quotes.", href: "/codes", action: "Create codes" };
  }
  if (!counts.highlights) {
    return { icon: LightbulbIcon, title: "Code the first evidence", description: "Select participant quotes and attach codes to build the evidence base.", href: "/interviews", action: "Open transcript" };
  }
  if (counts.uncodedParagraphs > 0) {
    return { icon: LightbulbIcon, title: "Finish coding uncoded paragraphs", description: `${counts.uncodedParagraphs} paragraphs in the current interview still have no saved highlights.`, href: "/interviews", action: "Continue coding" };
  }
  if (counts.highlightsNotOnCanvas > 0) {
    return { icon: MapIcon, title: "Move evidence into synthesis", description: `${counts.highlightsNotOnCanvas} saved highlights are not on a canvas yet.`, href: "/highlights", action: "Add to canvas" };
  }
  if (!counts.themes) {
    return { icon: MapIcon, title: "Create synthesis themes", description: "Cluster or group canvas evidence into themes before report writing.", href: "/canvas", action: "Open canvas" };
  }
  if (!counts.reports) {
    return { icon: MapIcon, title: "Synthesize highlights", description: "Move evidence into themes and generate a working report draft.", href: "/canvas", action: "Open canvas" };
  }
  return { icon: FileTextIcon, title: "Review the latest report", description: "Refine the generated synthesis and export a shareable Markdown report.", href: "/reports", action: "Open report" };
}

function WorkflowStep({ icon: Icon, label, complete, href }: { icon: typeof BookOpenIcon; label: string; complete: boolean; href: string }) {
  return (
    <Link className={`workflow-step ${complete ? "complete" : ""}`} to={href}>
      <Icon />
      <span>{label}</span>
      <CodeBadge tone={complete ? "green" : "gray"}>{complete ? "Done" : "Next"}</CodeBadge>
    </Link>
  );
}

function StatCard({ title, value, note }: { title: string; value: number | string; note: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="stat-value">{value}</div>
        <TextMuted>{note}</TextMuted>
      </CardContent>
    </Card>
  );
}
