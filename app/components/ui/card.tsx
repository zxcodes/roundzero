import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "group/card flex flex-col text-sm text-card-foreground has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-4xl *:[img:last-child]:rounded-b-4xl",
  {
    variants: {
      variant: {
        default:
          "gap-6 overflow-hidden rounded-4xl bg-card py-6 shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10",
        /** Flat bordered card — keep default py for Header/Content/Footer composition. */
        bordered:
          "gap-0 overflow-hidden rounded-3xl border border-border/60 shadow-none ring-0",
        /** Single CardContent supplies p-* / py-* — never pair with CardHeader. */
        "bordered-inset":
          "gap-0 overflow-hidden rounded-3xl border border-border/60 bg-muted-foreground/[0.045] py-0 shadow-none ring-0 dark:bg-muted/10",
        "dashboard-tile": "gap-0 overflow-hidden rounded-xl p-4 shadow-none ring-0",
        "dashboard-panel":
          "gap-0 overflow-hidden rounded-2xl bg-muted-foreground/[0.085] shadow-none ring-0 dark:bg-muted/30",
      },
      tileTone: {
        emphasis: "",
        default: "",
        subtle: "",
      },
    },
    compoundVariants: [
      {
        variant: "dashboard-tile",
        tileTone: "emphasis",
        class: "bg-muted-foreground/7 dark:bg-muted/25",
      },
      {
        variant: "dashboard-tile",
        tileTone: "default",
        class: "bg-muted-foreground/[0.055] dark:bg-muted/20",
      },
      {
        variant: "dashboard-tile",
        tileTone: "subtle",
        class: "bg-muted-foreground/4 dark:bg-muted/15",
      },
    ],
    defaultVariants: {
      variant: "default",
      tileTone: "default",
    },
  },
);

function Card({
  className,
  variant = "default",
  tileTone,
  size = "default",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & {
    size?: "default" | "sm";
  }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        cardVariants({
          variant,
          tileTone: variant === "dashboard-tile" ? (tileTone ?? "default") : undefined,
        }),
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-t-4xl px-6 group-data-[size=sm]/card:px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-heading text-base font-medium", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 group-data-[size=sm]/card:px-4", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-4xl px-6 group-data-[size=sm]/card:px-4 [.border-t]:pt-6 group-data-[size=sm]/card:[.border-t]:pt-4",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };