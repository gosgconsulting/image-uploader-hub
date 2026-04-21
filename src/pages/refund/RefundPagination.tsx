import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type RefundPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function RefundPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}: RefundPaginationProps) {
  const rangeFrom = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeTo = Math.min(totalCount, currentPage * pageSize);

  const go = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (clamped !== currentPage) onPageChange(clamped);
  };

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-mono text-xs text-muted-foreground tabular-nums">
        {totalCount === 0 ? (
          "No results"
        ) : (
          <>
            Showing {rangeFrom}–{rangeTo} of {totalCount}
          </>
        )}
      </p>
      {totalPages > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                className={currentPage <= 1 ? "pointer-events-none opacity-40" : undefined}
                aria-disabled={currentPage <= 1}
                onClick={(e) => {
                  e.preventDefault();
                  go(currentPage - 1);
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="flex h-9 min-w-[7rem] items-center justify-center px-2 font-mono text-xs text-muted-foreground tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                className={
                  currentPage >= totalPages ? "pointer-events-none opacity-40" : undefined
                }
                aria-disabled={currentPage >= totalPages}
                onClick={(e) => {
                  e.preventDefault();
                  go(currentPage + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
