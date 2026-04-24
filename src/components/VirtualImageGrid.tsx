import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

function subscribeMinWidth640(onStoreChange: () => void) {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMinWidth640() {
  return window.matchMedia("(min-width: 640px)").matches;
}

/** 3 columns at sm+ (matches Tailwind sm:), 2 below — for virtual row math only. */
export function usePreviewGridColumns(): 2 | 3 {
  return useSyncExternalStore(subscribeMinWidth640, getMinWidth640, () => false)
    ? 3
    : 2;
}

function subscribeMinWidth640Gallery(onStoreChange: () => void) {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMinWidth640GalleryCols(): 3 | 4 {
  return window.matchMedia("(min-width: 640px)").matches ? 4 : 3;
}

/** Matches grid-cols-3 sm:grid-cols-4 in modals. */
export function useGalleryPickerGridColumns(): 3 | 4 {
  return useSyncExternalStore(
    subscribeMinWidth640Gallery,
    getMinWidth640GalleryCols,
    () => 4,
  );
}

export interface VirtualImageGridProps<T> {
  items: readonly T[];
  columns: number;
  /** Initial row height hint (px); rows are measured after paint. */
  estimateRowHeight: number;
  /** Vertical gap between virtual rows (px), aligned with Tailwind `gap-3` (12). */
  rowGapPx?: number;
  overscan?: number;
  scrollClassName?: string;
  gridClassName?: string;
  renderCell: (item: T, index: number) => ReactNode;
}

export function VirtualImageGrid<T>({
  items,
  columns,
  estimateRowHeight,
  rowGapPx = 12,
  overscan = 6,
  scrollClassName = "overflow-y-auto min-h-0",
  gridClassName = "gap-3",
  renderCell,
}: VirtualImageGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
    gap: rowGapPx,
  });

  if (rowCount === 0) {
    return <div ref={parentRef} className={scrollClassName} />;
  }

  return (
    <div ref={parentRef} className={scrollClassName}>
      <div
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        className="relative w-full"
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * columns;
          const rowItems = items.slice(start, start + columns);
          return (
            <div
              key={virtualRow.key}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className={`grid w-full ${gridClassName}`}
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {rowItems.map((item, j) => (
                  <div key={start + j} className="min-w-0">
                    {renderCell(item, start + j)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
