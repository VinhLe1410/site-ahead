import { usePaginatedQuery } from "convex/react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import { DocumentDownload } from "@/components/documents/document-download";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DocumentUploadDialog } from "./components/document-upload-dialog";

export function LibraryPage() {
  const [parameters, setParameters] = useSearchParams();
  const search = parameters.get("q") ?? "";

  const documents = usePaginatedQuery(
    api.documents.list,
    { search },
    { initialNumItems: 20 },
  );

  function changeSearch(value: string) {
    setParameters(
      (current) => {
        if (value.length === 0) current.delete("q");
        else current.set("q", value);

        return current;
      },
      { replace: true },
    );
  }

  return (
    <>
      <PageHeading title="Library" action={<DocumentUploadDialog />} />
      <div className="mb-6 flex items-end gap-3">
        <Field className="flex-1">
          <FieldLabel htmlFor="library-search">
            Search titles and descriptions
          </FieldLabel>
          <Input
            id="library-search"
            type="search"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
          />
        </Field>
        {search.length > 0 && (
          <Button variant="outline" onClick={() => changeSearch("")}>
            Clear search
          </Button>
        )}
      </div>
      {documents.status === "LoadingFirstPage" ? (
        <p className="text-sm text-muted-foreground">Loading documents...</p>
      ) : documents.results.length === 0 ? (
        <div className="border bg-card px-5 py-8 text-sm text-muted-foreground">
          {search.trim().length > 0
            ? "No documents match your search. Change or clear the search."
            : "No documents yet. Upload guidance or a blank form to start your library."}
        </div>
      ) : (
        <ul className="divide-y border bg-card">
          {documents.results.map(({ document, version }) => (
            <li
              key={document._id}
              className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <Link
                  to={`/app/library/${document._id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {document.title}
                </Link>
                {document.description.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {document.description}
                  </p>
                )}
                <p className="break-words text-xs text-muted-foreground">
                  {version.filename} · Version {version.number}
                </p>
              </div>
              <DocumentDownload version={version} />
            </li>
          ))}
        </ul>
      )}
      {documents.status === "CanLoadMore" && (
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => documents.loadMore(20)}
        >
          Load more documents
        </Button>
      )}
      {documents.status === "LoadingMore" && (
        <p className="mt-4 text-sm text-muted-foreground">
          Loading more documents...
        </p>
      )}
    </>
  );
}
