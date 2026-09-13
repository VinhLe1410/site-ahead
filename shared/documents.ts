import { ConvexError } from "convex/values";

export const MAX_DOCUMENT_BYTES = 10_000_000;

export const MAX_ITEM_DOCUMENTS = 10;

export const DOCUMENT_ACCEPT = ".pdf,.doc,.docx";

const fileTypes = [
  { extension: ".pdf", contentType: "application/pdf" },
  { extension: ".doc", contentType: "application/msword" },
  {
    extension: ".docx",
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
];

export function validateDocumentFile(
  filename: string,
  contentType: string,
  size: number,
) {
  const fileType = fileTypes.find((type) =>
    filename.toLowerCase().endsWith(type.extension),
  );

  if (fileType === undefined)
    throw new ConvexError("Choose a PDF or Word file (.pdf, .doc, or .docx).");

  // Browsers may omit the MIME type or report a generic binary type.
  if (
    contentType !== "" &&
    contentType !== "application/octet-stream" &&
    contentType !== fileType.contentType
  )
    throw new ConvexError("The file type does not match its filename.");

  if (!Number.isInteger(size) || size <= 0)
    throw new ConvexError("Choose a file that is not empty.");

  if (size > MAX_DOCUMENT_BYTES)
    throw new ConvexError("Files must be 10 MB or smaller.");

  return fileType.contentType;
}
