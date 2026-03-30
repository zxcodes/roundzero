import { Add01Icon, Cancel01Icon, Link01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppForm } from "@/shared/form";

export function ApplyForm({
  onSubmit,
}: {
  onSubmit: (data: { resumeUrl: string | null; links: string[] }) => void;
}) {
  const [linkInput, setLinkInput] = useState("");

  const form = useAppForm({
    defaultValues: {
      resumeUrl: "",
      links: [] as string[],
    },
    onSubmit: ({ value }) => {
      onSubmit({
        resumeUrl: value.resumeUrl.trim() || null,
        links: value.links,
      });
    },
  });

  const onAddLink = () => {
    const trimmed = linkInput.trim();
    if (trimmed && !form.getFieldValue("links").includes(trimmed)) {
      try {
        new URL(trimmed);
        form.pushFieldValue("links", trimmed);
        setLinkInput("");
      } catch {
        // invalid URL — do nothing
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddLink();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.AppField
        name="resumeUrl"
        children={(field) => (
          <field.TextField
            label="Resume URL"
            placeholder="https://drive.google.com/file/your-resume"
            type="url"
            description="Link to your resume (Google Drive, Dropbox, etc.). File upload coming soon."
          />
        )}
      />

      <form.Field name="links" mode="array">
        {(linksField) => (
          <div className="space-y-2">
            <Label>
              Links <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
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
            <p className="text-xs text-muted-foreground">
              GitHub, portfolio, LinkedIn, or any relevant links.
            </p>
            {linksField.state.value.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {linksField.state.value.map((link, i) => (
                  <li
                    key={`${link}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <HugeiconsIcon
                        icon={Link01Icon}
                        strokeWidth={2}
                        className="size-3.5 shrink-0 text-muted-foreground"
                      />
                      <span className="truncate">{link}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => linksField.removeValue(i)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </form.Field>

      <form.AppForm>
        <form.SubmitButton label="Submit application" submittingLabel="Submitting..." />
      </form.AppForm>
    </form>
  );
}
