import { describe, expect, it } from "vitest";

import {
  compareVersions,
  getAvailableUpdate,
  normalizeReleaseVersion,
  selectAndroidDownloadUrl,
  type GitHubRelease,
} from "../lib/github-releases";

describe("github release updates", () => {
  it("compares semantic versions without the v prefix", () => {
    expect(normalizeReleaseVersion("v1.2.3")).toBe("1.2.3");
    expect(compareVersions("1.2.3", "1.2.0")).toBe(1);
    expect(compareVersions("v1.2.0", "1.2.0")).toBe(0);
    expect(compareVersions("1.1.9", "1.2.0")).toBe(-1);
  });

  it("selects an APK asset and returns only a newer stable release", () => {
    const release: GitHubRelease = {
      tag_name: "v1.1.0",
      html_url: "https://github.com/mkassis37/masroofi/releases/tag/v1.1.0",
      body: "Bug fixes",
      assets: [
        {
          name: "checksums.txt",
          browser_download_url: "https://example.com/checksums.txt",
        },
        {
          name: "masroofi-v1.1.0.apk",
          browser_download_url: "https://example.com/masroofi.apk",
        },
      ],
    };

    expect(selectAndroidDownloadUrl(release)).toBe(
      "https://example.com/masroofi.apk",
    );
    expect(getAvailableUpdate(release, "1.0.0")).toEqual({
      version: "1.1.0",
      releaseUrl: release.html_url,
      downloadUrl: "https://example.com/masroofi.apk",
      notes: "Bug fixes",
    });
    expect(getAvailableUpdate(release, "1.1.0")).toBeNull();
    expect(
      getAvailableUpdate({ ...release, prerelease: true }, "1.0.0"),
    ).toBeNull();
  });
});
