export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  content_type?: string;
}

export interface GitHubRelease {
  tag_name: string;
  html_url: string;
  name?: string | null;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GitHubReleaseAsset[];
}

export interface AvailableUpdate {
  version: string;
  releaseUrl: string;
  downloadUrl: string | null;
  notes: string;
}

export const MASROOFI_GITHUB_REPOSITORY = "mkassis37/masroofi";
export const LATEST_RELEASE_URL = `https://api.github.com/repos/${MASROOFI_GITHUB_REPOSITORY}/releases/latest`;

function parseVersion(value: string) {
  const normalized = value.trim().replace(/^v/i, "").split(/[+-]/, 1)[0];
  const parts = normalized.split(".").map((part) => Number.parseInt(part, 10));
  if (
    parts.length < 1 ||
    parts.some((part) => Number.isNaN(part) || part < 0)
  ) {
    return null;
  }
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0] as const;
}

export function normalizeReleaseVersion(tagName: string) {
  return tagName.trim().replace(/^v/i, "");
}

export function compareVersions(left: string, right: string) {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);
  if (!leftVersion || !rightVersion) return 0;

  for (let index = 0; index < leftVersion.length; index += 1) {
    if (leftVersion[index] !== rightVersion[index]) {
      return leftVersion[index] > rightVersion[index] ? 1 : -1;
    }
  }
  return 0;
}

export function selectAndroidDownloadUrl(release: GitHubRelease) {
  return (
    release.assets?.find((asset) => /\.apk$/i.test(asset.name))
      ?.browser_download_url ?? null
  );
}

export function getAvailableUpdate(
  release: GitHubRelease,
  currentVersion: string,
): AvailableUpdate | null {
  const version = normalizeReleaseVersion(release.tag_name);
  if (
    release.draft ||
    release.prerelease ||
    !version ||
    compareVersions(version, currentVersion) <= 0
  ) {
    return null;
  }

  return {
    version,
    releaseUrl: release.html_url,
    downloadUrl: selectAndroidDownloadUrl(release),
    notes: release.body?.trim() ?? "",
  };
}

export async function fetchLatestRelease(
  signal?: AbortSignal,
): Promise<GitHubRelease> {
  const response = await fetch(LATEST_RELEASE_URL, {
    headers: {
      Accept: "application/vnd.github+json",
    },
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `GitHub release request failed with status ${response.status}`,
    );
  }
  return (await response.json()) as GitHubRelease;
}
