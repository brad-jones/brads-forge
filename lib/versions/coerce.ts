// @ts-types="@types/semver"
import * as nodeSemVer from "semver";
import * as semver from "@std/semver";

export function coerceSemVer(version: string) {
  const parsedVersion = semver.tryParse(version);
  if (parsedVersion) return semver.format(parsedVersion);

  const coercedVersion = nodeSemVer.coerce(version, { loose: true, includePrerelease: true });
  if (coercedVersion) {
    const parsedVersion = semver.tryParse(coercedVersion.format());
    if (parsedVersion) return semver.format(parsedVersion);
  }

  throw new Error(`Could not coerce version ${version}`);
}
