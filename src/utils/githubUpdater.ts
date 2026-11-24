import { APP_VERSION, GithubBuildInfo } from '../types/launcher';

export const STORAGE_KEY_GITHUB_INSTALLED_TAG = 'w800i_github_installed_tag_v1';

export function normalizeGithubRepo(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const cleanedUrl = trimmed
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  const parts = cleanedUrl.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0].replace(/[^a-zA-Z0-9._-]/g, '');
  const repo = parts[1].replace(/[^a-zA-Z0-9._-]/g, '');
  if (!owner || !repo) return null;

  return `${owner}/${repo}`;
}

export function createInitialGithubBuildInfo(repo: string): GithubBuildInfo {
  return {
    repo,
    checking: false,
    releaseTag: null,
    releaseName: null,
    publishedAt: null,
    apkUrl: null,
    apkName: null,
    apkSizeMb: null,
    releaseNotes: null,
    latestRunStatus: null,
    latestRunConclusion: null,
    latestRunUrl: null,
    latestRunSha: null,
    updateAvailable: false,
    error: null,
    lastCheckedAt: null,
  };
}

interface GithubAsset {
  name?: string;
  browser_download_url?: string;
  size?: number;
}

interface GithubReleaseResponse {
  tag_name?: string;
  name?: string;
  published_at?: string;
  body?: string;
  assets?: GithubAsset[];
}

interface GithubActionsRun {
  status?: string;
  conclusion?: string | null;
  html_url?: string;
  head_sha?: string;
  updated_at?: string;
}

export async function fetchGithubBuildInfo(repoInput: string): Promise<GithubBuildInfo> {
  const normalized = normalizeGithubRepo(repoInput);
  const nowLabel = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  if (!normalized) {
    return {
      ...createInitialGithubBuildInfo(repoInput),
      error: 'Introduce un repositorio válido (ej. usuario/w800i-launcher).',
      lastCheckedAt: nowLabel,
    };
  }

  const baseHeaders = {
    Accept: 'application/vnd.github+json',
  };

  try {
    const [latestRes, runsRes] = await Promise.allSettled([
      fetch(`https://api.github.com/repos/${normalized}/releases/latest`, { headers: baseHeaders }),
      fetch(`https://api.github.com/repos/${normalized}/actions/runs?per_page=1`, { headers: baseHeaders }),
    ]);

    let releaseData: GithubReleaseResponse | null = null;
    let repoNotFound = false;

    if (latestRes.status === 'fulfilled') {
      if (latestRes.value.ok) {
        releaseData = (await latestRes.value.json()) as GithubReleaseResponse;
      } else if (latestRes.value.status === 404) {
        // Could be no "latest" release yet, check list of releases or repo existence
        const listRes = await fetch(`https://api.github.com/repos/${normalized}/releases?per_page=1`, {
          headers: baseHeaders,
        });
        if (listRes.ok) {
          const list = (await listRes.json()) as GithubReleaseResponse[];
          if (Array.isArray(list) && list.length > 0) {
            releaseData = list[0];
          }
        } else if (listRes.status === 404) {
          repoNotFound = true;
        }
      } else if (latestRes.value.status === 403) {
        return {
          ...createInitialGithubBuildInfo(normalized),
          error: 'Límite temporal de API GitHub alcanzado. Reintenta en unos minutos.',
          lastCheckedAt: nowLabel,
        };
      }
    }

    let latestRun: GithubActionsRun | null = null;
    if (runsRes.status === 'fulfilled' && runsRes.value.ok) {
      const runsJson = (await runsRes.value.json()) as { workflow_runs?: GithubActionsRun[] };
      if (Array.isArray(runsJson.workflow_runs) && runsJson.workflow_runs.length > 0) {
        latestRun = runsJson.workflow_runs[0];
      }
    }

    if (repoNotFound && !latestRun) {
      return {
        ...createInitialGithubBuildInfo(normalized),
        error: `Repositorio "${normalized}" no encontrado o privado.`,
        lastCheckedAt: nowLabel,
      };
    }

    const assets = Array.isArray(releaseData?.assets) ? releaseData.assets : [];
    const apkAsset =
      assets.find((a) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk')) || null;

    const releaseTag = releaseData?.tag_name || null;
    const publishedAt = releaseData?.published_at || latestRun?.updated_at || null;
    const installedMarker =
      typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_GITHUB_INSTALLED_TAG) : null;

    const releaseMarker = releaseTag
      ? `${releaseTag}:${publishedAt || ''}`
      : latestRun?.head_sha || null;

    const hasApk = Boolean(apkAsset?.browser_download_url);
    const baseVer = APP_VERSION.replace(/-HYPER$/i, '');
    const tagNorm = releaseTag ? releaseTag.replace(/^v/i, '') : '';
    const updateAvailable = Boolean(
      hasApk &&
        ((installedMarker && releaseMarker && installedMarker !== releaseMarker) ||
          (!installedMarker && (!tagNorm || tagNorm !== baseVer)))
    );

    return {
      repo: normalized,
      checking: false,
      releaseTag,
      releaseName: releaseData?.name || null,
      publishedAt,
      apkUrl: apkAsset?.browser_download_url || null,
      apkName: apkAsset?.name || null,
      apkSizeMb:
        typeof apkAsset?.size === 'number'
          ? `${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB`
          : null,
      releaseNotes: releaseData?.body || null,
      latestRunStatus: latestRun?.status || null,
      latestRunConclusion: latestRun?.conclusion || null,
      latestRunUrl: latestRun?.html_url || `https://github.com/${normalized}/actions`,
      latestRunSha: latestRun?.head_sha ? latestRun.head_sha.slice(0, 7) : null,
      updateAvailable,
      error: !hasApk && !latestRun ? 'Aún no hay compilación APK publicada en Releases.' : null,
      lastCheckedAt: nowLabel,
    };
  } catch {
    return {
      ...createInitialGithubBuildInfo(normalized),
      error: 'Sin conexión para consultar GitHub.',
      lastCheckedAt: nowLabel,
    };
  }
}

export function triggerGithubApkDownload(apkUrl: string, apkName?: string | null, marker?: string | null): void {
  if (typeof document === 'undefined' || !apkUrl) return;
  if (marker) {
    try {
      localStorage.setItem(STORAGE_KEY_GITHUB_INSTALLED_TAG, marker);
    } catch {
      // ignore storage errors
    }
  }
  const a = document.createElement('a');
  a.href = apkUrl;
  a.download = apkName || 'w800i-walkman-launcher.apk';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
