const semver = require("semver");
const { parseSyml } = require("@yarnpkg/parsers");

import {
  getDuplicateDependency,
  getPublishedDateAndLatestVersion,
  getOutdatedDep,
  getPackageInstallSize,
  getRootParents,
} from "./utils";
import { redis } from "../../../lib/redis";

const fetchAPICalls = async (
  packageNameVersion,
  metadata,
  installSizes,
  publishSizes,
  rootParents,
) => {
  try {
    const getInstallSizeWithCache = async (dependency, version) => {
      const cacheKey = `${dependency}@${version}`;
      if (installSizes[cacheKey] && publishSizes[cacheKey]) {
        return {
          installSize: installSizes[cacheKey],
          publishSize: publishSizes[cacheKey],
        };
      } else {
        const { installSize, publishSize } = await getPackageInstallSize(
          dependency,
          version,
        );
        installSizes[cacheKey] = installSize;
        publishSizes[cacheKey] = publishSize;
        return { installSize: installSize, publishSize: publishSize };
      }
    };

    let depName;
    if (metadata.resolution) depName = metadata.resolution;
    else depName = packageNameVersion;

    const lastOcc = depName.lastIndexOf("@");
    if (lastOcc === -1) return null;

    const dependency = depName.substring(0, lastOcc);
    const version = metadata.version;

    if (depName.includes("workspace")) {
      return null;
    }

    let parent = "N/A";
    const exactDep = `${dependency}@${version}`;
    if (rootParents.has(exactDep)) {
      const parentSet = rootParents.get(exactDep);
      if (parentSet) {
        parent = Array.from(parentSet).join(",");
      }
    }

    const { publishDate_Curr, publishDate_Latest, latestVersion } =
      await getPublishedDateAndLatestVersion(dependency, version);
    const [
      { installSize: size, publishSize: sizePublish },
      { installSize: sizeLatest, publishSize: sizeLatestPublish },
    ] = await Promise.all([
      getInstallSizeWithCache(dependency, version),
      getInstallSizeWithCache(dependency, latestVersion),
    ]);
    const { isOutdated_bydate, isOutdated_byversion } = getOutdatedDep(
      dependency,
      metadata,
      publishDate_Curr,
      publishDate_Latest,
      latestVersion,
    );

    if (
      size !== "N/A" &&
      size !== undefined &&
      sizePublish !== "N/A" &&
      sizePublish !== undefined &&
      sizeLatest !== "N/A" &&
      sizeLatest !== undefined &&
      publishDate_Curr !== null &&
      publishDate_Latest !== null &&
      isOutdated_bydate !== null &&
      isOutdated_byversion !== null &&
      latestVersion !== null
    ) {
      return {
        dep: dependency,
        currVersion: {
          version: version || "N/A",
          size: size || "N/A",
          date: publishDate_Curr || "N/A",
          sizePublish: sizePublish,
        },
        latestVersion: {
          version: latestVersion || "N/A",
          size: sizeLatest || "N/A",
          date: publishDate_Latest || "N/A",
        },
        isOutdated_bydate: isOutdated_bydate,
        isOutdated_byversion: isOutdated_byversion,
        parent: parent,
      };
    }
    return null;
  } catch (error) {
    console.error(`Couldn't get size for ${packageNameVersion}`, error.message);
    return null;
  }
};

const fetchAllPackageDetails = async (parsedLockFile) => {
  const depArr = [];
  const promises = [];

  let installSizes = await redis.get("installSizes");
  installSizes = installSizes ? JSON.parse(installSizes) : {};

  let publishSizes = await redis.get("publishSizes");
  publishSizes = publishSizes ? JSON.parse(publishSizes) : {};

  const child_parent = await getDuplicateDependency(parsedLockFile);
  const rootParents = getRootParents(child_parent);

  let i = 0;
  let k = 0;

  for (const [packageNameVersion, metadata] of Object.entries(parsedLockFile)) {
    promises.push(
      fetchAPICalls(
        packageNameVersion,
        metadata,
        installSizes,
        publishSizes,
        rootParents,
      ),
    );
    if (promises.length == 300) {
      console.log(i, "started!");
      const results = await Promise.all(promises);
      console.log(i++, "finished!");
      for (const result of results) {
        if (result) depArr.push(result);
      }
      promises.length = 0;
    }
  }

  if (promises.length) {
    const results = await Promise.all(promises);
    for (const result of results) {
      if (result) depArr.push(result);
    }
    promises.length = 0;
  }
  const childParentArray = Array.from(child_parent).map(([key, set]) => {
    const arrayFromSet = Array.from(set);
    return [key, arrayFromSet];
  });

  const depNewArr = [childParentArray, depArr];
  await redis.set("installSizes", JSON.stringify(installSizes));
  await redis.set("publishSizes", JSON.stringify(publishSizes));
  return depNewArr;
};

export async function POST(req) {
  const { fileContent } = await req.json();
  let parsedLockFile;

  try {
    parsedLockFile = parseSyml(fileContent);
  } catch (error) {
    console.error("Failed to parse yarn.lock file:", error.message);
    return new Response(
      JSON.stringify({ error: "Failed to parse yarn.lock file" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const packageSizes = await fetchAllPackageDetails(parsedLockFile);
    return new Response(JSON.stringify(packageSizes), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch package sizes" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
