import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Button } from "./button";
import { Input } from "./input";

import { HoverCard, HoverCardTrigger, HoverCardContent } from "./hover-card";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "./dropdown-menu";

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./collapsible";

import { Modal } from "./modal";

import { List } from "react-virtualized";

// import { FixedSizeList as WindowList } from "react-window";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [filterMode, setFilterMode] = useState<string>("default");
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [openRows, setOpenRows] = useState<{ [key: string]: boolean }>({});
  const [itemHeightList, setItemHeightList] = useState([]);
  const [filterValue, setFilterValue] = useState<string>("");

  useEffect(() => {
    const temp: any = {};
    data.forEach((item) => (temp[item.dep] = false));
    setOpenRows(temp);
  }, []);
  const listRef = useRef<List>(null);

  const duplicates = useMemo(() => {
    const depCount: Map<string, number> = new Map();
    data.forEach((dep) => {
      if (depCount.has(dep.dep))
        depCount.set(dep.dep, depCount.get(dep.dep)! + 1);
      else depCount.set(dep.dep, 1);
    });
    return depCount;
  }, [data]);

  const dupSizes = useMemo(() => {
    const dupSize: Map<string, number> = new Map();
    data.forEach((dep) => {
      if (dupSize.has(dep.dep))
        dupSize.set(
          dep.dep,
          dupSize.get(dep.dep) + dep.currVersion.sizePublish,
        );
      else dupSize.set(dep.dep, dep.currVersion.sizePublish);
    });
    return dupSize;
  }, [data]);

  //const getItemSize = index => rowHeights[index];

  const filteredData = useMemo(() => {
    switch (filterMode) {
      case "duplicates":
        return data.filter((dep) => duplicates.get(dep.dep)! > 1);
      case "outdatedByDate":
        return data.filter((dep) => dep.isOutdated_bydate);
      case "outdatedByVersion":
        return data.filter((dep) => dep.isOutdated_byversion);
      case "outdatedByDateAndVersion":
        return data.filter(
          (dep) => dep.isOutdated_bydate && dep.isOutdated_byversion,
        );
      default:
        return data;
    }
  }, [data, duplicates, filterMode]);

  const uniqueDeps = useMemo(() => {
    const uniqueDepsSet = new Set();
    return filteredData.filter((dep) => {
      if (uniqueDepsSet.has(dep.dep)) {
        return false;
      } else {
        uniqueDepsSet.add(dep.dep);
        return true;
      }
    });
  }, [filteredData]);

  const filteredUniqueDeps = useMemo(() => {
    if (!filterValue) return uniqueDeps;
    return uniqueDeps.filter((dep) =>
      dep.dep.toLowerCase().includes(filterValue.toLowerCase()),
    );
  }, [uniqueDeps, filterValue]);

  const table = useReactTable({
    data: filteredUniqueDeps,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const getRowStyle = (row: TData) => {
    const { isOutdated_bydate, isOutdated_byversion } = row as any;
    if (isOutdated_bydate && isOutdated_byversion) return "bg-red-200";
    if (isOutdated_bydate) return "bg-yellow-200";
    if (isOutdated_byversion) return "bg-orange-200";
    return "";
  };

  const handleParentClick = (content: string) => {
    setModalContent(content);
    setModalOpen(true);
  };

  const toggleRow = (rowId) => {
    setOpenRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  const renderRow = ({ index, key, style }) => {
    const renderCollapsibleContent = (
      data: any[],
      row: any,
      columns: any[],
      columnVisibility: { [key: string]: boolean },
      handleParentClick: (content: string) => void,
    ) => {
      const getRowStyle = (row: any) => {
        const { isOutdated_bydate, isOutdated_byversion } = row;
        if (isOutdated_bydate && isOutdated_byversion) return "bg-red-200";
        if (isOutdated_bydate) return "bg-yellow-200";
        if (isOutdated_byversion) return "bg-orange-200";
        return "";
      };

      const filteredData = data.filter(
        (dependency: any) => dependency.dep === row.original.dep,
      );

      function formatDate(dateString: string) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }

      const formatParentDependencies = (parent) => {
        const uniqueParents = Array.from(
          new Set(parent.split(",").map((chain) => chain)),
        );

        const trimmedParents = uniqueParents.map((parent) => {
          const lastAt = parent?.lastIndexOf("@");
          return lastAt !== -1 ? parent?.substring(0, lastAt) : parent;
        });

        return trimmedParents.join("\n ");
      };

      return (
        <>
          {filteredData.map((dep, index) => (
            <TableRow className={getRowStyle(dep)} key={index}>
              <TableCell style={{ width: "50px" }}>
                <div>&rarr;</div>
              </TableCell>
              <TableCell style={{ width: "120px" }}></TableCell>

              <TableCell
                style={{
                  width: "150px",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <HoverCard>
                  <HoverCardTrigger>
                    <div
                      onClick={() => handleParentClick(dep.rootPath)}
                      style={{
                        cursor: "pointer",
                        color: "blue",
                        textDecoration: "underline",
                        width: "150px",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      {formatParentDependencies(dep.parent.split("->").pop())}
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent
                    style={{ overflow: "scroll", whiteSpace: "pre-line" }}
                  >
                    <div
                      onClick={() => handleParentClick(dep.rootPath)}
                      style={{
                        cursor: "pointer",
                        color: "blue",
                        textDecoration: "underline",
                      }}
                    >
                      {formatParentDependencies(dep.parent)}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </TableCell>
              <TableCell style={{ width: "150px" }}>
                {dep.currVersion.version}
              </TableCell>
              <TableCell style={{ width: "150px" }}>
                {formatSize(dep.currVersion.sizePublish)}
              </TableCell>
              <TableCell style={{ width: "150px" }}>
                {formatSize(dep.currVersion.size)}
              </TableCell>
              {!columnVisibility["currVersion_date"] && (
                <TableCell style={{ width: "150px" }}>
                  {formatDate(dep.currVersion.date)}
                </TableCell>
              )}
              {!columnVisibility["latestVersion_version"] && (
                <TableCell style={{ width: "150px" }}></TableCell>
              )}
              {!columnVisibility["latestVersion_size"] && (
                <TableCell style={{ width: "150px" }}></TableCell>
              )}
              {!columnVisibility["latestVersion_date"] && (
                <TableCell style={{ width: "150px" }}></TableCell>
              )}
              <TableCell style={{ width: "150px" }}></TableCell>
            </TableRow>
          ))}
        </>
      );
    };

    const row = table.getRowModel().rows[index];
    if (!row) return null;

    const isOpen = !!openRows[row.original.dep];
    const handleItemExpanded = (id: string) => {
      toggleRow(id);
      if (listRef?.current) {
        listRef.current.recomputeRowHeights();
        listRef.current.forceUpdate();
      }
    };
    return (
      <div style={{ ...style, height: "auto" }} key={row.id}>
        <Collapsible open={isOpen} className="border-b">
          <TableRow
            data-state={row.getIsSelected() && "selected"}
            className={`${getRowStyle(row.original)} flex`}
          >
            <TableCell className="w-[50px] flex-shrink-0">
              {duplicates.get(row.original.dep)! > 1 && (
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleItemExpanded(row.original.dep)}
                  >
                    {isOpen ? "-" : "+"}
                  </Button>
                </CollapsibleTrigger>
              )}
            </TableCell>
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                style={{
                  width: "150px",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent
                    style={{ overflow: "scroll", whiteSpace: "pre-line" }}
                  >
                    <div>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </TableCell>
            ))}
            <TableCell className="w-[120px] flex-shrink-0">
              {formatSize(dupSizes.get(row.original.dep))}
            </TableCell>
          </TableRow>

          <CollapsibleContent>
            <div>
              {renderCollapsibleContent(
                data,
                row,
                columns,
                columnVisibility,
                handleParentClick,
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const rowHeightCalculation = ({ index }: any) => {
    const expanded = openRows[table.getRowModel().rows[index].original.dep];
    // console.log(expanded, openRows, openRows[table.getRowModel().rows[index].original.dep])
    if (expanded) {
      console.log(
        filteredUniqueDeps[index].dep,
        duplicates.get(filteredUniqueDeps[index].dep),
        expanded,
      );
    }
    return expanded
      ? duplicates.get(filteredUniqueDeps[index].dep)! * 70 + 60
      : 60;
  };

  return (
    <div className="flex flex-col p-4 items-center gap-4">
      <div className="flex items-center space-x-4">
        <Input
          placeholder="Filter deps..."
          value={filterValue}
          onChange={(event) => setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={filterMode}
              onValueChange={(value) => setFilterMode(value)}
            >
              <DropdownMenuRadioItem value="default">
                Default
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="duplicates">
                Show Duplicates Only
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="outdatedByDate">
                Show Outdated by Date Only
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="outdatedByVersion">
                Show Outdated by Version Only
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="outdatedByDateAndVersion">
                Show Outdated by Date and Version
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => {
                return column.getCanHide();
              })
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className="rounded-md border"
        style={{
          height: "fit-content",
          width: "1550px",
        }}
      >
        <Table style={{ tableLayout: "fixed" }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                <TableCell style={{ width: "50px" }} />
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: "120px" }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
                <TableHead style={{ width: "120px" }}>
                  Accumulated Size
                </TableHead>
              </TableRow>
            ))}
          </TableHeader>
        </Table>
        <List
          height={550}
          width={1550}
          ref={listRef}
          rowCount={table.getRowCount()}
          rowHeight={rowHeightCalculation}
          rowRenderer={renderRow}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <pre>{modalContent}</pre>
      </Modal>
    </div>
  );
}

function formatSize(bytes: number | undefined) {
  if (bytes === undefined) return "N/A";
  if (bytes < 1024) return `${bytes.toFixed(2)} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(2)} KB`;
  const megabytes = kilobytes / 1024;
  if (megabytes < 1024) return `${megabytes.toFixed(2)} MB`;
  const gigabytes = megabytes / 1024;
  return `${gigabytes.toFixed(2)} GB`;
}

// function formatSize(size: number | undefined) {
//   if (size === undefined) return 'N/A';
//   return `${(size / 1024).toFixed(2)} KB`;
// }
