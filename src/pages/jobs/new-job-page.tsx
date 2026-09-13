import { useMutation } from "convex/react";
import { useNavigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import { PageHeading } from "@/components/layout/page-heading";
import { JobForm } from "./components/job-form";

export function NewJobPage() {
  const create = useMutation(api.jobs.create);
  const navigate = useNavigate();

  return (
    <>
      <PageHeading title="New job" />
      <div className="max-w-2xl border bg-card p-5 sm:p-6">
        <JobForm
          onSubmit={async (values) => {
            const jobId = await create(values);
            void navigate(`/app/jobs/${jobId}`);
          }}
        />
      </div>
    </>
  );
}
