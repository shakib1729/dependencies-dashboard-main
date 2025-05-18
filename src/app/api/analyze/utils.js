import axios from 'axios';
const semver = require('semver');

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}


// Dependency mapping with exact version. 
// Map structure: {dependencyNameWithNeededVersion => usedVersion}
export const getDepMappingWithExactVersion = (parsedLockFile) => {
    try {
      let dependency_map = new Map();
      
      for (const [packageNameVersion, metadata] of Object.entries(parsedLockFile)) {
        const dependencies = packageNameVersion.split(',').map(dep => dep.trim());
        dependencies.forEach(dep => {
          const lastOcc = dep.lastIndexOf('@');
          const dependencyName = dep.substring(0, lastOcc);
          let neededVersion = dep.split(':')[1]; 
          if (neededVersion == undefined) {
            neededVersion = dep.substring(lastOcc, dep.length);
          }
          const name = `${dependencyName}@${neededVersion}`;
          dependency_map.set(name, metadata.version);
        });
      }
      return dependency_map;
    }
    catch (error) {
      console.error("Failed to get Dependency mapping with exact version", error.message);
    }
}

// returns the map of set which stores the duplicate dependencies (same dependency with different version).
// child_parent Map structure: {dependencyName => (Set){version: version, parentDeps: []}}
export const getDuplicateDependency = async (parsedLockFile) => {
    try {
      let child_parent = new Map();
      let exactDep = getDepMappingWithExactVersion(parsedLockFile);
      for (const [packageNameVersion, metadata] of Object.entries(parsedLockFile)) {
        let parDep;
        if (metadata.resolution)
          parDep = metadata.resolution;
        else
          parDep = packageNameVersion;

        let parExactDep;
        const lastOcc = parDep.lastIndexOf('@');
        if (lastOcc == -1) continue;
        const dependencyname = parDep.substring(0, lastOcc);
        parExactDep = `${dependencyname}@${metadata.version}`;
  
        if (metadata.dependencies) {
          Object.keys(metadata.dependencies).forEach(dependency => {
            const depWithVersion = `${dependency}@${metadata.dependencies[dependency]}`;
            let versionExact = metadata.dependencies[dependency];
            if (exactDep.has(depWithVersion)) versionExact = exactDep.get(depWithVersion); 
  
            if (!child_parent.has(dependency)) {
              child_parent.set(dependency, new Set());
            }
  
            const existingSet = child_parent.get(dependency);
            let existingEntry = Array.from(existingSet).find(entry => entry.version === versionExact);
            
            if (existingEntry) {
              existingEntry.parDep.push(parExactDep);
            } else {
              const newEntry = { version: versionExact, parDep: [parExactDep] };
              existingSet.add(newEntry);
            }
          });
        }
      }
      return child_parent;
    } catch (error) {
      console.error('Failed to get child-parent:', error);
      throw new Error('Failed to process child-parent data');
    }
}

// returns published date as well as latestversion using npm registry. 
export const getPublishedDateAndLatestVersion = async (name, version) => {
    try {
      const response_date = await axios.get(`https://registry.npmjs.org/${name}`);

      const data = response_date.data;
      const latestVersion = data['dist-tags'].latest;

      const publishDate_Latest = data.time[latestVersion];
      const publishDate_Curr = data.time[version];

      return { publishDate_Curr, publishDate_Latest, latestVersion };
    } catch (error) {
      console.error(`Failed to get time for ${name}@${version}:`, error.message);
      return { publishDate_Curr: 'N/A', publishDate_Latest: 'N/A', latestVersion: '0.0.0' };
    }
};

// returns outdated dependencies calculated based on date and major version.
export const getOutdatedDep = (dependency, metadata, publishDate_Curr, publishDate_Latest, latestVersion) => {
    try {
    const date1 = new Date(publishDate_Curr);
    const date2 = new Date(publishDate_Latest);
    const diffInMillis = date2 - date1;
    const millisInAYear = 365.25 * 24 * 60 * 60 * 1000;
    const yearsDifference = diffInMillis / millisInAYear;

    const majorv = semver.major(metadata.version);
    const majorvLatest = semver.major(latestVersion);

    let isOutdated_byversion;
    if (majorv == majorvLatest) isOutdated_byversion = false;
    else isOutdated_byversion = true;

    let isOutdated_bydate;
    if (yearsDifference.toFixed(2) >= 1.5) isOutdated_bydate = true;
    else isOutdated_bydate = false;

    return { isOutdated_bydate, isOutdated_byversion };
    }
    catch (error) {
      console.error("failed to get outdated dep", error.message);
      return {isOutdated_bydate: 'N/A', isOutdated_byversion: 'N/A' };
    }
  }

// install size of the package via packagephobia api.
export const getPackageInstallSize = async (name, version) => {
    try {
        const response_packagePhobia = await axios.get(`https://packagephobia.com/api.json?p=${name}@${version}`, {'headers':{'User-Agent': 'shakib1729/dependencies-dashboard-main'}});
        return {installSize: response_packagePhobia.data.installSize, publishSize: response_packagePhobia.data.publishSize};
    } catch (error) {
        console.error(`Failed to get size for ${name}@${version} from packagephobia:`, error.message);
        return 'N/A';
    }
};


//  rootParents Map structure: {dependencyWithExactVersion => (Set)([parentDependencyMapping])}
export const getRootParents = (child_parent) => {
  const rootParents = new Map();

  const findRootParents = (dependency, version, path = []) => {
      const parentSet = child_parent.get(dependency);
      
      if (!parentSet) {
          return [{ dependency, version }];
      }
  
      let rootDeps = [];
      for (const parentInfo of parentSet) {
          if (parentInfo.version === version) {
              for (const parentDep of parentInfo.parDep) {
                  const lastOcc = parentDep.lastIndexOf('@');
                  const parentDepName = parentDep.substring(0, lastOcc);
                  const parentVersion = parentDep.substring(lastOcc + 1);

                  if (!path.includes(`${dependency}@${version}`)) {
                      const parentRootDeps = findRootParents(parentDepName, parentVersion, [...path, `${dependency}@${version}`]);
                      rootDeps = rootDeps.concat(parentRootDeps);
                  }
              }
          }
      }

      return rootDeps.length ? rootDeps : [{ dependency, version }];
  };

  child_parent.forEach((parentSet, dependency) => {
      for (const childVersion_parentInfo of parentSet) {
          const rootParentsSet = new Set();
          const rootParentDeps = findRootParents(dependency, childVersion_parentInfo.version);
          rootParentDeps.forEach(({ dependency, version }) => {
              rootParentsSet.add(`${dependency}@${version}`);
          });
          rootParents.set(`${dependency}@${childVersion_parentInfo.version}`, rootParentsSet);
      }
  });
  return rootParents;
};
