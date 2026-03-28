import { Add01Icon, Cancel01Icon, Link01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApplyForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (data: { resumeUrl: string | null; links: string[] }) => void;
  isSubmitting: boolean;
}) {
  const resumeId = useId();
  const linkInputId = useId();

  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");

  const onAddLink = () => {
    const trimmed = linkInput.trim();
    if (trimmed && !links.includes(trimmed)) {
      try {
        new URL(trimmed);
        setLinks([...links, trimmed]);
        setLinkInput("");
      } catch {
        // invalid URL — do nothing
      }
    }
  };

  const onRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddLink();
    }
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const resumeUrl = (formData.get("resumeUrl") as string).trim() || null;

    onSubmit({ resumeUrl, links });
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={resumeId}>
          Resume URL <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id={resumeId}
          name="resumeUrl"
          type="url"
          placeholder="https://drive.google.com/file/your-resume"
        />
        <p className="text-muted-foreground text-xs">
          Link to your resume (Google Drive, Dropbox, etc.). File upload coming soon.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={linkInputId}>
          Links <span className="text-muted-foreground">(optional)</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id={linkInputId}
            type="url"
            placeholder="https://github.com/username"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <Button type="button" variant="outline" size="icon" onClick={onAddLink}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          GitHub, portfolio, LinkedIn, or any relevant links.
        </p>
        {links.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {links.map((link, i) => (
              <li
                key={`${link}-${i}`}
                className="bg-muted flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <HugeiconsIcon
                    icon={Link01Icon}
                    strokeWidth={2}
                    className="text-muted-foreground size-3.5 shrink-0"
                  />
                  <span className="truncate">{link}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveLink(i)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit application"}
      </Button>
    </form>
  );
}
