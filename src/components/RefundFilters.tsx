import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export type StatusOption = "completed" | "processing" | "pending" | "failed";
export type StatusFilter = StatusOption[];
export type ConfidenceFilter = "high" | "medium" | "low" | "all";
export type DateSort = "desc" | "asc" | "none";

interface RefundFiltersProps {
  statusFilter: StatusFilter;
  dateSort: DateSort;
  onStatusChange: (status: StatusFilter) => void;
  onDateSortChange: (sort: DateSort) => void;
  onClearFilters: () => void;
}

export function RefundFilters({
  statusFilter,
  dateSort,
  onStatusChange,
  onDateSortChange,
  onClearFilters,
}: RefundFiltersProps) {
  const allStatuses: StatusOption[] = ["completed", "processing", "pending", "failed"];
  const allSelected = statusFilter.length === allStatuses.length;
  
  const hasActiveFilters =
    statusFilter.length !== allStatuses.length ||
    dateSort !== "none";

  const handleStatusToggle = (status: StatusOption) => {
    if (statusFilter.includes(status)) {
      // Prevent unchecking if it's the last one
      if (statusFilter.length === 1) {
        return; // Don't allow unchecking the last status
      }
      onStatusChange(statusFilter.filter((s) => s !== status));
    } else {
      onStatusChange([...statusFilter, status]);
    }
  };

  const handleSelectAll = () => {
    if (allSelected) {
      // When unchecking "All", keep at least one status selected
      // Keep the first status as a minimum
      onStatusChange([allStatuses[0]]);
    } else {
      onStatusChange([...allStatuses]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1.5 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Status</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={allSelected}
          onCheckedChange={(checked) => {
            handleSelectAll();
          }}
          onSelect={(e) => {
            e.preventDefault();
          }}
        >
          All
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={statusFilter.includes("completed")}
          disabled={statusFilter.length === 1 && statusFilter.includes("completed")}
          onCheckedChange={() => {
            handleStatusToggle("completed");
          }}
          onSelect={(e) => {
            e.preventDefault();
          }}
        >
          Completed
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={statusFilter.includes("processing")}
          disabled={statusFilter.length === 1 && statusFilter.includes("processing")}
          onCheckedChange={() => {
            handleStatusToggle("processing");
          }}
          onSelect={(e) => {
            e.preventDefault();
          }}
        >
          Processing
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={statusFilter.includes("pending")}
          disabled={statusFilter.length === 1 && statusFilter.includes("pending")}
          onCheckedChange={() => {
            handleStatusToggle("pending");
          }}
          onSelect={(e) => {
            e.preventDefault();
          }}
        >
          Pending
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={statusFilter.includes("failed")}
          disabled={statusFilter.length === 1 && statusFilter.includes("failed")}
          onCheckedChange={() => {
            handleStatusToggle("failed");
          }}
          onSelect={(e) => {
            e.preventDefault();
          }}
        >
          Failed
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Date</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={dateSort}
          onValueChange={(value) => onDateSortChange(value as DateSort)}
        >
          <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">Most Recent First</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="asc">Oldest First</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        {hasActiveFilters && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearFilters}>
              Clear Filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
