import {
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  Github,
  KeyRound,
  LoaderCircle
} from 'lucide-react';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@/components/ui/input-group';
import type { RepositoryDownloadStatus } from '@/models/repository-download-model';

interface RepositorySearchFormProps {
  value: string;
  token: string;
  status: RepositoryDownloadStatus;
  errorMessage?: string;
  promptForToken?: boolean;
  onValueChange: (value: string) => void;
  onTokenChange: (token: string) => void;
  onSubmit: (value: string, token: string) => void;
}

export function RepositorySearchForm({
  value,
  token,
  status,
  errorMessage,
  promptForToken = false,
  onValueChange,
  onTokenChange,
  onSubmit
}: RepositorySearchFormProps) {
  const [tokenOpen, setTokenOpen] = useState(false);
  const [tokenVisible, setTokenVisible] = useState(false);
  const isBusy = status === 'validating' || status === 'loading';
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const tokenId = useId();
  const tokenUsageId = useId();
  const tokenSecurityId = useId();

  useEffect(() => {
    if (promptForToken) setTokenOpen(true);
  }, [promptForToken]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value, token);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errorMessage)}>
          <FieldContent>
            <FieldLabel htmlFor={inputId}>GitHub repository</FieldLabel>
            <FieldDescription id={descriptionId}>
              Paste a repository URL, release URL, or enter owner/repo.
            </FieldDescription>
          </FieldContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <InputGroup className="h-11 flex-1">
              <InputGroupInput
                id={inputId}
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                placeholder="owner/repository"
                autoComplete="url"
                spellCheck="false"
                aria-describedby={
                  errorMessage ? `${descriptionId} ${errorId}` : descriptionId
                }
                aria-invalid={Boolean(errorMessage)}
              />
              <InputGroupAddon align="inline-start">
                <Github aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
            <Button
              type="submit"
              size="lg"
              disabled={isBusy}
              className="h-11 min-w-32"
            >
              {isBusy ? (
                <>
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                  Checking
                </>
              ) : (
                <>
                  Find assets
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
          <FieldError id={errorId}>{errorMessage}</FieldError>
        </Field>

        <Collapsible
          open={tokenOpen}
          onOpenChange={setTokenOpen}
          className="w-full"
        >
          <CollapsibleTrigger
            render={<Button type="button" variant="ghost" size="sm" />}
            className="group -ml-3 w-fit text-muted-foreground mx-0.5"
          >
            <KeyRound aria-hidden="true" />
            Use a GitHub token
            <Badge variant="outline" className="ml-1 text-foreground">
              Optional
            </Badge>
            <ChevronDown
              data-icon="inline-end"
              className="transition-transform group-data-panel-open:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="rounded-3xl bg-muted/45 p-4 sm:p-5">
              <Field>
                <FieldContent>
                  <FieldLabel htmlFor={tokenId}>GitHub token</FieldLabel>
                  <FieldDescription
                    id={tokenUsageId}
                    className="text-foreground/80"
                  >
                    Use a fine-grained token with read-only public repository
                    access when anonymous requests are rate-limited.
                  </FieldDescription>
                </FieldContent>
                <InputGroup className="h-11 border-border/70 bg-background">
                  <InputGroupInput
                    id={tokenId}
                    name="github-token"
                    type={tokenVisible ? 'text' : 'password'}
                    value={token}
                    onChange={(event) => onTokenChange(event.target.value)}
                    placeholder="github_pat_…"
                    autoComplete="off"
                    spellCheck="false"
                    maxLength={255}
                    aria-describedby={`${tokenUsageId} ${tokenSecurityId}`}
                  />
                  <InputGroupAddon align="inline-start">
                    <KeyRound aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-sm"
                      aria-label={tokenVisible ? 'Hide token' : 'Show token'}
                      aria-pressed={tokenVisible}
                      onClick={() => setTokenVisible((visible) => !visible)}
                    >
                      {tokenVisible ? (
                        <EyeOff aria-hidden="true" />
                      ) : (
                        <Eye aria-hidden="true" />
                      )}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription
                  id={tokenSecurityId}
                  className="text-xs text-foreground/80"
                >
                  Sent directly from this browser to GitHub, kept only in page
                  memory, and never sent to this deployment, the URL, or browser
                  storage.
                </FieldDescription>
              </Field>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </FieldGroup>
    </form>
  );
}
