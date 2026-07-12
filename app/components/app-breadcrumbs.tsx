import { Link } from "@tanstack/react-router";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type AppBreadcrumbItem = {
  label: string;
  to?: string;
  params?: Record<string, string>;
};

type MobileBreadcrumbLayout = {
  prefix: AppBreadcrumbItem[];
  collapsed: AppBreadcrumbItem[];
  suffix: AppBreadcrumbItem[];
};

function splitBreadcrumbsForMobile(items: AppBreadcrumbItem[]): MobileBreadcrumbLayout {
  if (items.length <= 1) {
    return { prefix: items, collapsed: [], suffix: [] };
  }

  if (items.length === 2) {
    return {
      prefix: [],
      collapsed: [items[0]],
      suffix: [items[1]],
    };
  }

  if (items.length === 3) {
    return {
      prefix: [items[0]],
      collapsed: [items[1]],
      suffix: [items[2]],
    };
  }

  return {
    prefix: [items[0]],
    collapsed: items.slice(1, -2),
    suffix: items.slice(-2),
  };
}

function CrumbContent({
  item,
  isLast,
  truncateLast = false,
}: {
  item: AppBreadcrumbItem;
  isLast: boolean;
  truncateLast?: boolean;
}) {
  if (isLast) {
    return (
      <BreadcrumbPage className={truncateLast ? "block truncate" : undefined}>
        {item.label}
      </BreadcrumbPage>
    );
  }

  if (item.to) {
    return (
      <BreadcrumbLink asChild className={truncateLast ? "block max-w-full truncate" : undefined}>
        <Link
          to={item.to}
          params={item.params}
          className={truncateLast ? "block truncate" : undefined}
        >
          {item.label}
        </Link>
      </BreadcrumbLink>
    );
  }

  return <span className="text-muted-foreground">{item.label}</span>;
}

function BreadcrumbSegments({
  items,
  truncateLast = false,
}: {
  items: AppBreadcrumbItem[];
  truncateLast?: boolean;
}) {
  return items.map((item, index) => {
    const isLast = index === items.length - 1;
    const key = `${item.label}-${index}`;

    return (
      <Fragment key={key}>
        <BreadcrumbItem
          className={
            isLast
              ? "min-w-0 max-w-full flex-1 overflow-hidden"
              : "max-w-[45%] shrink-0 overflow-hidden"
          }
        >
          <CrumbContent
            item={item}
            isLast={isLast}
            truncateLast={truncateLast && (isLast || items.length === 1)}
          />
        </BreadcrumbItem>
        {isLast ? null : <BreadcrumbSeparator />}
      </Fragment>
    );
  });
}

function CollapsedBreadcrumbMenu({ items }: { items: AppBreadcrumbItem[] }) {
  return (
    <BreadcrumbItem className="shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="size-7">
            <BreadcrumbEllipsis />
            <span className="sr-only">Show breadcrumb path</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {items.map((item) => (
            <DropdownMenuItem key={item.label} asChild={item.to ? true : undefined}>
              {item.to ? (
                <Link to={item.to} params={item.params}>
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </BreadcrumbItem>
  );
}

function MobileCollapsedBreadcrumbs({ items }: { items: AppBreadcrumbItem[] }) {
  const { prefix, collapsed, suffix } = splitBreadcrumbsForMobile(items);

  if (collapsed.length === 0) {
    return <BreadcrumbSegments items={prefix} truncateLast />;
  }

  return (
    <>
      {prefix.length > 0 ? <BreadcrumbSegments items={prefix} /> : null}
      <CollapsedBreadcrumbMenu items={collapsed} />
      <BreadcrumbSeparator />
      <BreadcrumbSegments items={suffix} truncateLast />
    </>
  );
}

const breadcrumbListClassName = "flex min-w-0 flex-nowrap items-center gap-1.5 sm:gap-2.5";

export function AppBreadcrumbs({
  items,
  className,
}: {
  items: AppBreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className={cn("min-w-0", className)}>
      <BreadcrumbList className={cn(breadcrumbListClassName, "hidden md:flex")}>
        <BreadcrumbSegments items={items} />
      </BreadcrumbList>
      <BreadcrumbList className={cn(breadcrumbListClassName, "md:hidden")}>
        <MobileCollapsedBreadcrumbs items={items} />
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function BreadcrumbSkeleton({ segments = 3 }: { segments?: number }) {
  const showCollapsed = segments > 1;

  return (
    <>
      <div className={cn(breadcrumbListClassName, "hidden md:flex")}>
        {Array.from({ length: segments }).map((_, index) => (
          <Fragment key={index}>
            {index > 0 ? <Skeleton className="size-3.5 shrink-0 rounded-sm" /> : null}
            <Skeleton className="h-4 w-16 shrink-0 rounded-sm" />
          </Fragment>
        ))}
      </div>
      <div className={cn(breadcrumbListClassName, "md:hidden")}>
        {showCollapsed ? (
          <>
            <Skeleton className="size-7 shrink-0 rounded-sm" />
            <Skeleton className="size-3.5 shrink-0 rounded-sm" />
          </>
        ) : null}
        <Skeleton className="h-4 min-w-0 flex-1 rounded-sm" />
      </div>
    </>
  );
}
