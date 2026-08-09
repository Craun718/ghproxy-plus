import { create } from 'zustand';
import { recommendAsset } from '@/lib/asset-matcher';
import { fetchRepository, RepositoryApiError } from '@/lib/repository-api';
import { parseRepositoryInput } from './repository-download-schema';
import type {
  AssetRecommendation,
  RepositoryAsset,
  RepositoryError,
  RepositoryErrorCode,
  RepositoryIdentifier,
  RepositoryRelease,
  RepositoryResponse,
  RepositorySummary
} from './repository-download-types';

export type RepositoryDownloadStatus =
  | 'idle'
  | 'validating'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error';

interface ResolveRepositoryOptions {
  releaseId?: string | null;
  assetId?: string | null;
  userAgent?: string;
}

type RepositoryFetcher = typeof fetchRepository;

export interface RepositoryDownloadModel {
  status: RepositoryDownloadStatus;
  input: string;
  repository: RepositorySummary | null;
  releases: RepositoryRelease[];
  selectedReleaseId: string | null;
  selectedAssetId: string | null;
  recommendation: AssetRecommendation | null;
  error: RepositoryError | null;
  notice: string | null;
  userAgent: string;
  resolveRepository: (
    input: string,
    options?: ResolveRepositoryOptions
  ) => Promise<void>;
  selectRelease: (releaseId: string) => void;
  selectAsset: (assetId: string) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as const,
  input: '',
  repository: null,
  releases: [],
  selectedReleaseId: null,
  selectedAssetId: null,
  recommendation: null,
  error: null,
  notice: null,
  userAgent: ''
};

function normalizeError(error: unknown): RepositoryError {
  if (error instanceof RepositoryApiError) {
    const supportedCodes: RepositoryErrorCode[] = [
      'not-found',
      'rate-limit',
      'network',
      'server'
    ];
    return {
      code: supportedCodes.includes(error.code as RepositoryErrorCode)
        ? (error.code as RepositoryErrorCode)
        : 'server',
      message: error.message
    };
  }

  return {
    code: 'server',
    message: 'The repository could not be loaded.'
  };
}

function findRelease(
  releases: RepositoryRelease[],
  releaseId?: string | null
): RepositoryRelease | undefined {
  return (
    releases.find(
      (release) => release.id === releaseId || release.tagName === releaseId
    ) ?? releases[0]
  );
}

export function createRepositoryDownloadModel(
  repositoryFetcher: RepositoryFetcher = fetchRepository
) {
  let requestId = 0;
  let abortController: AbortController | null = null;

  return create<RepositoryDownloadModel>((set, get) => ({
    ...initialState,

    resolveRepository: async (input, options = {}) => {
      const currentRequestId = ++requestId;
      abortController?.abort();
      abortController = new AbortController();

      set({
        status: 'validating',
        input,
        repository: null,
        releases: [],
        selectedReleaseId: null,
        selectedAssetId: null,
        recommendation: null,
        error: null,
        notice: null
      });

      let identifier: RepositoryIdentifier;
      try {
        identifier = parseRepositoryInput(input);
      } catch (error) {
        set({
          status: 'error',
          error: {
            code: 'invalid',
            message:
              error instanceof Error
                ? error.message
                : 'Enter a valid GitHub repository.'
          }
        });
        return;
      }

      const userAgent = options.userAgent ?? get().userAgent;
      set({
        status: 'loading',
        input: identifier.fullName,
        repository: null,
        releases: [],
        selectedReleaseId: null,
        selectedAssetId: null,
        recommendation: null,
        userAgent,
        error: null
      });

      try {
        const response: RepositoryResponse = await repositoryFetcher(
          identifier.owner,
          identifier.repo,
          abortController.signal
        );

        if (currentRequestId !== requestId) return;

        if (response.releases.length === 0) {
          set({
            status: 'empty',
            repository: response.repository,
            error: {
              code: 'empty-release',
              message: 'This repository has no releases or downloadable branch.'
            }
          });
          return;
        }

        const selectedRelease = findRelease(
          response.releases,
          options.releaseId
        );

        if (!selectedRelease || selectedRelease.assets.length === 0) {
          set({
            status: 'empty',
            repository: response.repository,
            releases: response.releases,
            selectedReleaseId: selectedRelease?.id ?? null,
            error: {
              code: 'empty-asset',
              message: 'The selected release has no downloadable assets.'
            }
          });
          return;
        }

        const recommendation = recommendAsset(
          selectedRelease.assets,
          userAgent
        );
        const restoredAsset = selectedRelease.assets.find(
          (asset) => asset.id === options.assetId
        );
        const releaseWasRestored = options.releaseId
          ? selectedRelease.id === options.releaseId ||
            selectedRelease.tagName === options.releaseId
          : true;
        const selectionNotice = !releaseWasRestored
          ? `Release “${options.releaseId}” is unavailable. The latest release was selected.`
          : options.assetId && !restoredAsset
            ? 'The shared asset is unavailable. A recommendation was selected when possible.'
            : null;

        set({
          status: 'ready',
          repository: response.repository,
          releases: response.releases,
          selectedReleaseId: selectedRelease.id,
          selectedAssetId: restoredAsset?.id ?? recommendation.assetId ?? null,
          recommendation,
          error: null,
          notice: selectionNotice
        });
      } catch (error) {
        if (
          currentRequestId !== requestId ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return;
        }

        set({ status: 'error', error: normalizeError(error) });
      }
    },

    selectRelease: (releaseId) => {
      const state = get();
      const release = state.releases.find((item) => item.id === releaseId);
      if (!release) return;

      const recommendation = recommendAsset(release.assets, state.userAgent);
      set({
        status: release.assets.length === 0 ? 'empty' : 'ready',
        selectedReleaseId: release.id,
        selectedAssetId: recommendation.assetId,
        recommendation,
        notice: null,
        error:
          release.assets.length === 0
            ? {
                code: 'empty-asset',
                message: 'The selected release has no downloadable assets.'
              }
            : null
      });
    },

    selectAsset: (assetId) => {
      const state = get();
      const release = selectCurrentRelease(state);
      if (!release?.assets.some((asset) => asset.id === assetId)) return;
      set({
        status: 'ready',
        selectedAssetId: assetId,
        error: null,
        notice: null
      });
    },

    reset: () => {
      requestId += 1;
      abortController?.abort();
      abortController = null;
      set(initialState);
    }
  }));
}

export function selectCurrentRelease(
  state: RepositoryDownloadModel
): RepositoryRelease | null {
  return (
    state.releases.find((release) => release.id === state.selectedReleaseId) ??
    null
  );
}

export function selectCurrentAsset(
  state: RepositoryDownloadModel
): RepositoryAsset | null {
  return (
    selectCurrentRelease(state)?.assets.find(
      (asset) => asset.id === state.selectedAssetId
    ) ?? null
  );
}

export function selectProxyPath(state: RepositoryDownloadModel): string | null {
  const asset = selectCurrentAsset(state);
  return asset ? `/api/ghproxy/${asset.downloadUrl}` : null;
}

export const useRepositoryDownloadModel = createRepositoryDownloadModel();
