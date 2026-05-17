import { PanelCard, PageTitle, TextMuted } from "@/components/ui/app-kit";

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="page">
      <PageTitle title={title} />
      <PanelCard>
        <TextMuted>This MVP page is scaffolded and ready for the next feature slice.</TextMuted>
      </PanelCard>
    </div>
  );
}
