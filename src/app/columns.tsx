import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "./components/ui/button";
import { Modal } from "./components/ui/modal";
import { useState } from "react";

export type DepData = {
  dep: string;
  currVersion: {
    version: string;
    size: number;
    date: string;
    sizePublish: number;
  };
  latestVersion: { version: string; size: number; date: string };
  isOutdated_bydate: boolean;
  isOutdated_byversion: boolean;
  parent: string;
  rootPath: string;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes.toFixed(2)} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(2)} KB`;
  const megabytes = kilobytes / 1024;
  if (megabytes < 1024) return `${megabytes.toFixed(2)} MB`;
  const gigabytes = megabytes / 1024;
  return `${gigabytes.toFixed(2)} GB`;
};

const getRootParents = (dependency, version, child_parent) => {
  const rootParents = new Map();

  const findRootParents = (dependency, version, path = []) => {
    const parentSet = child_parent.get(dependency);

    if (!parentSet) {
      return [{ path: [...path, `${dependency}@${version}`] }];
    }

    let rootPaths = [];
    for (const parentInfo of parentSet) {
      if (parentInfo.version === version) {
        for (const parentDep of parentInfo.parDep) {
          const lastOcc = parentDep.lastIndexOf("@");
          const parentDepName = parentDep.substring(0, lastOcc);
          const parentVersion = parentDep.substring(lastOcc + 1);

          if (path.includes(`${dependency}@${version}`)) {
            continue;
          }

          const newPath = [...path, `${dependency}@${version}`];
          const parentRootPaths = findRootParents(
            parentDepName,
            parentVersion,
            newPath,
          );
          rootPaths = rootPaths.concat(parentRootPaths);
        }
      }
    }

    return rootPaths;
  };

  const rootParentsSet = new Set();
  const rootParentDeps = findRootParents(dependency, version);
  rootParentDeps.forEach(({ path }) => {
    rootParentsSet.add(`${path.join("->")}`);
  });
  rootParents.set(`${dependency}@${version}`, rootParentsSet);

  return rootParents;
};

export const columns: ColumnDef<DepData>[] = [
  {
    accessorKey: "dep",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="sorting-button"
        >
          Dependencies
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "parent",
    header: "Parents",
    cell: ({ row }) => {
      const [isModalOpen, setModalOpen] = useState(false);
      const [modalContent, setModalContent] = useState<string | null>(null);

      const handleParentClick = () => {
        setModalContent(row.original.rootPath);
        setModalOpen(true);
      };

      const formatParentDependencies = () => {
        const uniqueParents = Array.from(
          new Set(row.original.parent.split(",").map((chain) => chain)),
        );

        const trimmedParents = uniqueParents.map((parent) => {
          const lastAt = parent?.lastIndexOf("@");
          return lastAt !== -1 ? parent?.substring(0, lastAt) : parent;
        });

        return trimmedParents.join("\n ");
      };

      return (
        <>
          <div
            onClick={handleParentClick}
            style={{
              cursor: "pointer",
              color: "blue",
              textDecoration: "underline",
            }}
          >
            {formatParentDependencies()}
          </div>
          <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
            <pre>{modalContent}</pre>
          </Modal>
        </>
      );
    },
  },
  {
    accessorKey: "currVersion.version",
    header: "Current Version",
    cell: ({ row }) => row.original.currVersion.version,
  },
  {
    accessorKey: "currVersion.sizePublish",
    cell: ({ row }) => formatSize(row.original.currVersion.sizePublish),
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Curr. Publish Size
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    sortingFn: (rowA, rowB) => {
      const sizeA = rowA.original.currVersion.sizePublish;
      const sizeB = rowB.original.currVersion.sizePublish;
      return sizeA - sizeB;
    },
  },
  {
    accessorKey: "currVersion.size",
    cell: ({ row }) => formatSize(row.original.currVersion.size),
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Curr. Install Size
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    sortingFn: (rowA, rowB) => {
      const sizeA = rowA.original.currVersion.size;
      const sizeB = rowB.original.currVersion.size;
      return sizeA - sizeB;
    },
  },
  {
    accessorKey: "currVersion.date",
    header: "Current Publish Date",
    cell: ({ row }) => formatDate(row.original.currVersion.date),
  },
  {
    accessorKey: "latestVersion.version",
    header: "Latest Version",
  },
  {
    accessorKey: "latestVersion.size",
    cell: ({ row }) => formatSize(row.original.latestVersion.size),
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Latest Install Size
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    sortingFn: (rowA, rowB) => {
      const sizeA = rowA.original.latestVersion.size;
      const sizeB = rowB.original.latestVersion.size;
      return sizeA - sizeB;
    },
  },
  {
    accessorKey: "latestVersion.date",
    header: "Latest Publish Date",
    cell: ({ row }) => formatDate(row.original.latestVersion.date),
  },
];
