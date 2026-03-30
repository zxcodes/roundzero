import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const PAGE_SIBLINGS = 1;

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  const rangeStart = Math.max(2, current - PAGE_SIBLINGS);
  const rangeEnd = Math.min(total - 1, current + PAGE_SIBLINGS);

  if (rangeStart > 2) pages.push("ellipsis");
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < total - 1) pages.push("ellipsis");

  pages.push(total);
  return pages;
}

function PaginationNav({
  currentPage,
  totalPages,
  className,
}: {
  currentPage: number;
  totalPages: number;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <Pagination className={className}>
      <PaginationContent>
        {/* Previous */}
        <PaginationItem>
          <Button
            asChild
            variant="ghost"
            size="default"
            className={cn("pl-2!", currentPage <= 1 && "pointer-events-none opacity-50")}
            aria-disabled={currentPage <= 1}
          >
            <Link
              to="."
              search={(prev) => ({ ...prev, page: currentPage - 1 })}
              aria-label="Go to previous page"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} data-icon="inline-start" />
              <span className="hidden sm:block">Previous</span>
            </Link>
          </Button>
        </PaginationItem>

        {/* Page numbers */}
        {pages.map((page, idx) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <Button asChild variant={page === currentPage ? "outline" : "ghost"} size="icon">
                <Link
                  to="."
                  search={(prev) => ({ ...prev, page })}
                  aria-current={page === currentPage ? "page" : undefined}
                >
                  {page}
                </Link>
              </Button>
            </PaginationItem>
          ),
        )}

        {/* Next */}
        <PaginationItem>
          <Button
            asChild
            variant="ghost"
            size="default"
            className={cn("pr-2!", currentPage >= totalPages && "pointer-events-none opacity-50")}
            aria-disabled={currentPage >= totalPages}
          >
            <Link
              to="."
              search={(prev) => ({ ...prev, page: currentPage + 1 })}
              aria-label="Go to next page"
            >
              <span className="hidden sm:block">Next</span>
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} data-icon="inline-end" />
            </Link>
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export { PaginationNav };
