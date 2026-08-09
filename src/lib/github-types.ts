export interface GitHubUser {
  login: string;
  avatar_url: string;
}

export interface GitHubReleaseAsset {
  id?: number;
  name: string;
  content_type?: string;
  size?: number;
  download_count?: number;
  browser_download_url: string;
}

export interface GitHubRelease {
  id: number;
  name: string | null;
  tag_name: string;
  assets: GitHubReleaseAsset[];
  html_url?: string;
  prerelease?: boolean;
  published_at?: string;
}

export interface GitHubRepository {
  name: string;
  full_name: string;
  owner: GitHubUser;
  default_branch: string;
  description: string | null;
  html_url: string;
}
