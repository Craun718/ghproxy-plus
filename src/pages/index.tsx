"use client";
import { AlertCircle, Download, Link2, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type * as z from "zod";
import apiDocumentationUrl from "@/assets/api.md";
import type { CheckFormSchema } from "@/components/lib";
import MarkdownRenderer from "@/components/markdownRenderer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  getDefaultBranchSourceCode,
  getRepoInfo,
  getRepoReleases
} from "@/lib/ghApi";
import type { GhRelease } from "@/lib/ghResponse";
import { getDownloadAsset } from "@/lib/searchPkg";
import { extractRepoFromURL, resolve_url } from "@/lib/utils";

type CheckFormValues = z.infer<typeof CheckFormSchema>;

export default function Homepage() {
  const [searchParams, _] = useSearchParams();
  const navigate = useNavigate();

  const [apiDocumentation, setApiDocumentation] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitResult, setSubmitInfo] = useState("");
  const [tag, setTag] = useState("");
  const [tagList, setTagList] = useState([
    { label: "None", releaseId: "None" }
  ]);
  const [releases, setReleases] = useState<GhRelease[]>([]);
  const [asset, setAsset] = useState("");
  const [assetList, setAssetList] = useState([
    { label: "None", value: "None" }
  ]);

  const checkForm = useForm<CheckFormValues>({
    // don't use resolver here to avoid packup error
    defaultValues: {
      repoUrl: ""
    }
  });

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const keyword = searchParams.get("keyword") || "";

  const updateSearchParams = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    navigate(`?${params.toString()}`);
  };

  useEffect(() => {
    fetch(apiDocumentationUrl)
      .then((res) => res.text())
      .then(setApiDocumentation)
      .catch(() => setApiDocumentation("文档加载失败"));
  }, []);

  useEffect(() => {
    const url = searchParams.get("repo");
    if (url) {
      checkForm.setValue("repoUrl", url);
    }
  }, [searchParams, checkForm]);

  useEffect(() => {
    if (tag === "None" || tag === "") {
      setAssetList([{ label: "None", value: "None" }]);
      return;
    }

    console.log("Processing tag:", tag);
    const release = releases.find((release) => release.id.toString() === tag);
    console.debug("Selected release:", release);
    if (release) {
      console.debug("Release assets:", release.assets);
      const assets = release.assets.map((asset) => ({
        label: asset.name,
        value: asset.browser_download_url
      }));

      setAssetList(assets);
      setAsset(assets[0]?.value || "");

      const downloadAsset = getDownloadAsset(release.assets, ua, keyword);
      if (downloadAsset) {
        console.debug("set downloadAsset:", downloadAsset);
        setAsset(downloadAsset.browser_download_url);
      }
    }
  }, [tag, releases, ua, keyword]);

  useEffect(() => {
    if (tag && tag !== "None" && tag !== "" && releases.length > 0) {
      const release = releases.find((release) => release.id.toString() === tag);
      if (release && release.assets.length > 0) {
        const downloadAsset = getDownloadAsset(release.assets, ua, keyword);
        if (downloadAsset) {
          setAsset(downloadAsset.browser_download_url);
          console.debug(
            "Auto-selected asset based on keyword:",
            downloadAsset.name
          );
        }
      }
    }
  }, [keyword, ua, tag, releases]);

  const resetAssetAndTag = () => {
    setTag("");
    setAsset("");
    setTagList([{ label: "None", releaseId: "None" }]);
    setAssetList([{ label: "None", value: "None" }]);
    setReleases([]);
  };

  const onSubmitGetReleases = async (values: CheckFormValues) => {
    setLoading(true);
    values.repoUrl = resolve_url(values.repoUrl);
    checkForm.setValue("repoUrl", values.repoUrl);

    const repo = extractRepoFromURL(values.repoUrl);
    if (!repo) {
      setSubmitInfo("❌ Invalid GitHub repo URL.");
      resetAssetAndTag();
      setLoading(false);
      return;
    }

    const repoKey = `${repo.owner}/${repo.repo}`;

    // 刷新时清除 sessionStorage
    window.addEventListener("beforeunload", () => {
      sessionStorage.clear();
    });

    const cached = sessionStorage.getItem(repoKey);
    if (cached) {
      const releases = JSON.parse(cached) as GhRelease[];
      const tagNames = releases.map((release) => ({
        label: release.name,
        releaseId: release.id.toString()
      }));
      tagNames[0].label += " (latest)";
      setTagList(tagNames.slice(0, 5)); // Show only first 5 tags
      setTag(tagNames[0].releaseId);
      setReleases(releases);
      updateSearchParams("repo", values.repoUrl);
      setSubmitInfo("");
      setLoading(false);
      return;
    }

    const genFakeRepoReleases = async (
      owner: string,
      repo: string
    ): Promise<GhRelease> => {
      const repoInfo = await getRepoInfo(owner, repo);
      const defaultBranch = repoInfo.default_branch;
      const fakeAssets = getDefaultBranchSourceCode(owner, repo, defaultBranch);
      const fakeRelease: GhRelease = {
        tag_name: defaultBranch,
        assets: fakeAssets,
        id: 0,
        name: `Default branch - ${defaultBranch}`
      };
      return fakeRelease;
    };

    getRepoReleases(repo.owner, repo.repo)
      .then(async (releases) => {
        if (releases.length === 0) {
          try {
            releases = [await genFakeRepoReleases(repo.owner, repo.repo)];
          } catch (error) {
            setSubmitInfo(
              `❌ No releases found and unable to fetch default branch: ${error}`
            );
            resetAssetAndTag();
            return;
          }
        }
        const tagNames = releases.map((release) => ({
          label: release.name,
          releaseId: release.id.toString()
        }));
        tagNames[0].label += " (latest)";
        setTagList(tagNames.slice(0, 5)); // Show only first 5 tags
        setTag(tagNames[0].releaseId);
        setReleases(releases);
        updateSearchParams("repo", values.repoUrl);
        setSubmitInfo("");

        sessionStorage.setItem(repoKey, JSON.stringify(releases));
      })
      .catch((error) => {
        setSubmitInfo(`❌ Error fetching tags: ${error}`);
        resetAssetAndTag();
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const generateDownloadUrl = () => {
    if (!asset || asset === "None") {
      setSubmitInfo("❌ No asset selected.");
      return;
    }

    const baseUrl = window.location.origin;
    const url = `${baseUrl}/api/ghproxy/${asset}`;
    console.log("Generated URL: ", url);
    return url;
  };

  const handleDownload = () => {
    const url = generateDownloadUrl();
    if (!url) return;

    const link = document.createElement("a");
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyDownloadUrl = async () => {
    const url = generateDownloadUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast("Done!", {
      description: "The URL has been copied to clipboard.",
      action: {
        label: "get it",
        onClick: () => console.log("Click get it!")
      }
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {submitResult && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to fetch releases</AlertTitle>
          <AlertDescription>{submitResult}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg border-border/50">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Repository</CardTitle>
              <CardDescription>
                Enter a GitHub repository URL to get started
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...checkForm}>
            <form
              onSubmit={checkForm.handleSubmit(onSubmitGetReleases)}
              className="space-y-4"
            >
              <FormField
                control={checkForm.control}
                name="repoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      GitHub URL
                    </FormLabel>
                    <div className="flex gap-3">
                      <FormControl className="flex-1">
                        <Input
                          placeholder="https://github.com/username/repo"
                          {...field}
                          className="h-12 text-base"
                        />
                      </FormControl>
                      <Button
                        type="submit"
                        disabled={loading}
                        size="default"
                        className="h-12 px-8"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Loading
                          </span>
                        ) : (
                          "Check"
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {tagList.length > 1 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Release Tag</Label>
                  <Select value={tag} onValueChange={setTag}>
                    <SelectTrigger className="w-full h-12 text-base">
                      <SelectValue placeholder="Select a release" />
                    </SelectTrigger>
                    <SelectContent>
                      {tagList.map((tag) => (
                        <SelectItem key={tag.releaseId} value={tag.releaseId}>
                          {tag.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-medium">Asset</Label>
                  <Select value={asset} onValueChange={setAsset}>
                    <SelectTrigger className="w-full h-12 text-base">
                      <SelectValue placeholder="Select an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetList.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {tagList.length > 1 && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCopyDownloadUrl}
                disabled={!asset || asset === "None" || loading}
                variant="outline"
                className="flex-1 h-12 text-base"
              >
                <Link2 className="mr-2 h-5 w-5" />
                Copy URL
              </Button>
              <Button
                onClick={handleDownload}
                disabled={!asset || asset === "None" || loading}
                className="flex-1 h-12 text-base"
              >
                <Download className="mr-2 h-5 w-5" />
                Download
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Drawer>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
          >
            View API Documentation
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              API Documentation
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-5 pb-4 overflow-y-auto max-h-[60vh] select-text">
            <MarkdownRenderer content={apiDocumentation} />
          </div>
          <DrawerFooter />
        </DrawerContent>
      </Drawer>
    </div>
  );
}
