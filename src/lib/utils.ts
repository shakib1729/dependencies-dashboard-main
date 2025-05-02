import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type Dependency = {
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
};

type ParentInfo = {
  version: string;
  parDep: string[];
};

type ChildParentMap = Map<string, Set<ParentInfo>>;

type RootPath = {
  path: string[];
};

type RootParentsMap = Map<string, Set<string>>;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getRootParents = (child_parent: ChildParentMap): RootParentsMap => {
  const rootParents: RootParentsMap = new Map();

  const findRootParents = (
    dependency: string,
    version: string,
    path: string[] = [],
  ): RootPath[] => {
    const parentSet = child_parent.get(dependency);

    if (!parentSet) {
      return [{ path: [...path, `${dependency}@${version}`] }];
    }

    let rootPaths: RootPath[] = [];
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

  child_parent.forEach((parentSet, dependency) => {
    for (const parentInfo of parentSet) {
      const rootParentsSet = new Set<string>();
      const rootParentDeps = findRootParents(dependency, parentInfo.version);
      rootParentDeps.forEach(({ path }) => {
        rootParentsSet.add(path.join("->"));
      });
      rootParents.set(
        `${dependency}@${parentInfo.version}`,
        Array.from(rootParentsSet).join("\n"),
      );
    }
  });
  return rootParents;
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

export const getTotalSize = (result) => {
  if (result) {
    const totalBytes = result.reduce((sum, dep) => {
      const size = dep.currVersion.sizePublish;
      if (size === "N/A" || size === undefined) return sum;
      //const numericSize = parseFloat(size.split(' ')[0]);
      return sum + size;
    }, 0);
    return formatSize(totalBytes);
  }
  return "0 KB";
};

export const getTotalOutdatedDependencies = (result) => {
  if (result) {
    return result.filter(
      (dep) => dep.isOutdated_bydate || dep.isOutdated_byversion,
    ).length;
  }
  return 0;
};

export const getTotalRepetitiveDependencies = (result) => {
  if (result) {
    const dependencyCountMap = result.reduce(
      (countMap, dep) => {
        countMap[dep.dep] = (countMap[dep.dep] || 0) + 1;
        return countMap;
      },
      {} as { [key: string]: number },
    );
    return Object.values(dependencyCountMap).filter((count) => count > 1)
      .length;
  }
  return 0;
};

export const processData = (data) => {
  const data1 = data[0];
  let data2 = data[1];

  if (Array.isArray(data2)) {
    const childParentMap = new Map<
      string,
      Set<{ version: string; parDep: string[] }>
    >(data1.map(([key, array]) => [key, new Set(array)]));

    if (!(childParentMap instanceof Map)) {
      throw new Error("child_parent is not a Map");
    }

    const rootPath = getRootParents(childParentMap);

    data2 = data2.map((pkg) => {
      const pkgName = pkg.dep;
      const pkgVersion = pkg.currVersion.version;
      const pkgNameWithVersion = `${pkgName}@${pkgVersion}`;
      const pkgRootPath = rootPath.get(pkgNameWithVersion);
      return {
        ...pkg,
        rootPath: pkgRootPath || "N/A",
      };
    });

    return data2;
  } else {
    throw new Error("Unexpected response format");
  }
};
