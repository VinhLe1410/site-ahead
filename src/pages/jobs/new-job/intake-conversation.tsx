import { usePaginatedQuery } from "convex/react";
import { Loader2, RotateCcw } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { IntakeComposer } from "./intake-composer";

export function IntakeConversation({
  draft,
  disabled,
  isGenerating,
  hasUnsavedChanges,
  onSend,
  onRetry,
}: {
  draft: Doc<"jobDrafts"> | null;
  disabled: boolean;
  isGenerating: boolean;
  hasUnsavedChanges: boolean;
  onSend: (text: string) => Promise<void>;
  onRetry: () => void;
}) {
  const messages = usePaginatedQuery(
    api.jobDrafts.messages,
    draft === null ? "skip" : { draftId: draft._id },
    { initialNumItems: 20 },
  );

  return (
    <section
      aria-labelledby="conversation-heading"
      className="order-first flex min-w-0 flex-col border bg-card lg:sticky lg:top-6 lg:order-none"
    >
      <div className="px-5 pt-4 pb-3">
        <h2 id="conversation-heading" className="font-semibold">
          Conversation
        </h2>
      </div>
      <MessageScrollerProvider defaultScrollPosition="end">
        <MessageScroller className="h-56 lg:h-[clamp(12rem,calc(100dvh-25rem),24rem)]">
          <MessageScrollerViewport
            aria-label="Job intake messages"
            preserveScrollOnPrepend
          >
            <MessageScrollerContent
              className="gap-5 px-5 py-3"
              aria-busy={isGenerating}
            >
              {draft !== null && messages.status === "LoadingFirstPage" ? (
                <p
                  role="status"
                  className="m-auto text-sm text-muted-foreground"
                >
                  Loading conversation…
                </p>
              ) : messages.results.length === 0 ? (
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  Describe the work, paste a client message or record a voice
                  note. I'll help fill in the brief.
                </p>
              ) : (
                <>
                  {messages.status === "CanLoadMore" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mx-auto mb-4"
                      onClick={() => messages.loadMore(20)}
                    >
                      Load earlier messages
                    </Button>
                  )}
                  {messages.status === "LoadingMore" && (
                    <p
                      role="status"
                      className="mb-4 text-center text-xs text-muted-foreground"
                    >
                      Loading earlier messages…
                    </p>
                  )}
                  {[...messages.results].reverse().map((message) => (
                    <MessageScrollerItem
                      key={message._id}
                      messageId={message._id}
                    >
                      <Message
                        align={message.role === "user" ? "end" : "start"}
                      >
                        <MessageContent className="gap-1.5">
                          <MessageHeader className="px-0 text-[11px]">
                            {message.role === "user" ? "You" : "Site Ahead"}
                          </MessageHeader>
                          <Bubble
                            variant={
                              message.role === "user" ? "outline" : "ghost"
                            }
                            className="max-w-[92%]"
                          >
                            <BubbleContent className="rounded-sm whitespace-pre-wrap text-sm leading-6 wrap-anywhere">
                              {message.text}
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ))}
                </>
              )}
              {isGenerating && (
                <p
                  role="status"
                  className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Loader2 className="size-3.5 animate-spin" /> Updating your
                  draft…
                </p>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
      {draft?.error !== undefined && (
        <div
          role="alert"
          className="mx-5 mb-4 space-y-2 border border-destructive/20 bg-destructive/5 p-3"
        >
          <p className="text-sm text-destructive">{draft.error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || hasUnsavedChanges}
            onClick={onRetry}
          >
            <RotateCcw className="size-3.5" /> Retry response
          </Button>
          {hasUnsavedChanges && (
            <p className="text-xs text-muted-foreground">
              Save your draft changes, then send a new message.
            </p>
          )}
        </div>
      )}
      <IntakeComposer disabled={disabled} onSend={onSend} />
    </section>
  );
}
