import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-2xl bg-muted",
        "bg-linear-to-r from-muted via-muted/70 to-muted bg-size-[200%_100%] animate-shimmer-scan",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
