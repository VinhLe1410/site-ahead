import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeading } from "@/components/layout/page-heading";
import { JobForm } from "./components/job-form";
import {
  VoiceRecorder,
  type ExtractionResult,
} from "./components/voice-recorder";

function findMatchingCategory(
  categories: Array<{ _id: Id<"categories">; title: string }>,
  jobType: "carpentry" | "electrical" | "other",
): Id<"categories"> | null {
  if (jobType === "carpentry") {
    const match = categories.find((c) => /carpent|timber|deck/i.test(c.title));

    return match ? match._id : null;
  }

  if (jobType === "electrical") {
    const match = categories.find((c) => /electric/i.test(c.title));

    return match ? match._id : null;
  }

  return null;
}

export function NewJobPage() {
  const create = useMutation(api.jobs.create);
  const navigate = useNavigate();

  const categories = usePaginatedQuery(
    api.categories.list,
    {},
    { initialNumItems: 20 },
  );

  const [formKey, setFormKey] = useState(0);

  const [initialValues, setInitialValues] = useState<{
    processedText: string;
    addressText: string;
    categoryId: Id<"categories"> | null;
  }>({
    processedText: "",
    addressText: "",
    categoryId: null,
  });

  const [extractionInfo, setExtractionInfo] = useState<{
    jobType: string;
    location: string;
  } | null>(null);

  function handleAudioComplete({
    transcript,
    extraction,
  }: {
    transcript: string;
    extraction: ExtractionResult;
  }) {
    const matchedId = findMatchingCategory(
      categories.results,
      extraction.jobType,
    );

    setInitialValues({
      processedText: extraction.description || transcript,
      addressText: extraction.location,
      categoryId: matchedId,
    });

    setExtractionInfo({
      jobType: extraction.jobType,
      location: extraction.location,
    });

    setFormKey((prev) => prev + 1);
  }

  return (
    <>
      <PageHeading title="New job" />

      <div className="max-w-2xl space-y-6">
        <VoiceRecorder onTranscriptionComplete={handleAudioComplete} />

        {extractionInfo !== null && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
            <Sparkles className="size-4 text-primary" />
            <span>
              Extracted from ElevenLabs audio:{" "}
              <strong>{extractionInfo.jobType.replace(/_/g, " ")}</strong> at{" "}
              <strong>{extractionInfo.location}</strong>. Review and submit
              below.
            </span>
          </div>
        )}

        <div className="border bg-card p-5 sm:p-6">
          <JobForm
            key={formKey}
            initialValues={initialValues}
            onSubmit={async (values) => {
              const jobId = await create(values);
              void navigate(`/app/jobs/${jobId}`);
            }}
          />
        </div>
      </div>
    </>
  );
}
