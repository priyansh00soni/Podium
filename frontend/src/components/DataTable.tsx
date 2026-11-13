import React from "react";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
  emptyState?: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  rowClassName,
  emptyState,
  className = "",
  headerClassName = "border-b border-[#26262b]",
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <div className="p-8 text-center">{emptyState}</div>;
  }

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead className={`sticky top-0 bg-[#111113] z-10 ${headerClassName}`}>
          <tr className="h-10 text-[#8b8b94] font-medium">
            {columns.map((col) => {
              const alignClass =
                col.align === "right"
                  ? "text-right"
                  : col.align === "center"
                    ? "text-center"
                    : "text-left";
              return (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-4 py-2 font-normal ${alignClass} ${col.className || ""}`}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#26262b]/50">
          {data.map((row, index) => {
            const customRowClass = rowClassName ? rowClassName(row, index) : "";
            const isClickable = Boolean(onRowClick);

            return (
              <tr
                key={keyExtractor(row, index)}
                onClick={() => onRowClick && onRowClick(row, index)}
                className={`h-[44px] transition-colors border-l-2 border-l-transparent hover:border-l-[#6D4AFF] hover:bg-[#17171a] ${
                  isClickable ? "cursor-pointer" : ""
                } ${customRowClass}`}
              >
                {columns.map((col) => {
                  const alignClass =
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left";

                  const cellContent = col.render
                    ? col.render(row, index)
                    : (row as any)[col.key];

                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-2 text-[#ededf0] ${alignClass} ${col.className || ""}`}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

