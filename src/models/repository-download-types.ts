export type AssetKind = 'binary' | 'source' | 'checksum' | 'signature';

export type RecommendationConfidence = 'exact' | 'likely' | 'none';

export interface RepositoryAsset {
  id: string;
  name: string;
  downloadUrl: string;
  size: number | null;
  downloadCount: number | null;
  contentType: string | null;
  kind: AssetKind;
  format: string | null;
  platform: string | null;
  architecture: string | null;
}

export interface RepositoryRelease {
  id: string;
  name: string;
  tagName: string;
  publishedAt: string | null;
  prerelease: boolean;
  assets: RepositoryAsset[];
}

export interface RepositorySummary {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  defaultBranch: string;
}

export interface RepositoryResponse {
  repository: RepositorySummary;
  releases: RepositoryRelease[];
}

export interface AssetRecommendation {
  assetId: string | null;
  confidence: RecommendationConfidence;
  reasons: string[];
  platform: string | null;
  architecture: string | null;
}

export type RepositoryErrorCode =
  | 'invalid'
  | 'not-found'
  | 'rate-limit'
  | 'network'
  | 'empty-release'
  | 'empty-asset'
  | 'server';

export interface RepositoryError {
  code: RepositoryErrorCode;
  message: string;
}

export interface RepositoryIdentifier {
  owner: string;
  repo: string;
  fullName: string;
}
