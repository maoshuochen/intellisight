import { XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Option = { label: string; value: string };

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PanelCard({ title, description, children, className }: { title?: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ description, action }: { description: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <p>{description}</p>
      {action}
    </div>
  );
}

export function LoadingBlock() {
  return (
    <div className="center-screen">
      <Skeleton className="size-9 rounded-full" />
    </div>
  );
}

export function InlineAlert({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "destructive" }) {
  return (
    <Alert variant={variant}>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function OptionSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  allowClear,
  size = "default"
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  options: Option[];
  placeholder: string;
  className?: string;
  allowClear?: boolean;
  size?: "sm" | "default";
}) {
  return (
    <NativeSelect className={className} size={size} value={value ?? ""} onChange={(event) => onChange(event.target.value || undefined)}>
      {(allowClear || !value) && <NativeSelectOption value="">{placeholder}</NativeSelectOption>}
      {options.map((option) => (
        <NativeSelectOption key={option.value} value={option.value}>
          {option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

export function CodeBadge({
  children,
  selected,
  tone,
  onClick,
  onClose
}: {
  children: ReactNode;
  selected?: boolean;
  tone?: string | null;
  onClick?: () => void;
  onClose?: () => void;
}) {
  const colorClass = toneToClass(tone, selected);
  const content = (
    <>
      <span>{children}</span>
      {onClose && <XIcon data-icon="inline-end" />}
    </>
  );

  if (onClick || onClose) {
    return (
      <button type="button" className={cn("code-badge", colorClass)} onClick={onClick}>
        {onClose ? (
          <>
            <span>{children}</span>
            <span
              className="badge-close"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
            >
              <XIcon data-icon="inline-end" />
            </span>
          </>
        ) : (
          content
        )}
      </button>
    );
  }

  return <Badge className={cn("code-badge", colorClass)}>{content}</Badge>;
}

export function TextMuted({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-muted", className)}>{children}</p>;
}

export function ColorSwatchPicker({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="color-swatch-picker" aria-label="Code group color">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={cn("color-swatch", `swatch-${option}`, value === option && "active")}
          title={option}
          aria-label={option}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        />
      ))}
    </div>
  );
}

function toneToClass(tone?: string | null, selected?: boolean) {
  if (selected) return "tone-selected";
  switch (tone) {
    case "green":
      return "tone-green";
    case "orange":
      return "tone-orange";
    case "purple":
      return "tone-purple";
    case "red":
      return "tone-red";
    case "gray":
      return "tone-gray";
    case "blue":
    case "arcoblue":
    default:
      return "tone-blue";
  }
}
