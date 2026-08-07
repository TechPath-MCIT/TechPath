// Shared between ResumeUploadContainer (writer) and ResumeReviewContainer (reader).
// The parsed resume is held client-side only until the user confirms it — it's
// never written to the database until POST /api/profiles is called from the
// review page, so a plain sessionStorage handoff (no server-side draft state)
// is enough and avoids persisting anything before the user has reviewed it.
export const PARSED_RESUME_STORAGE_KEY = "techpath:parsedResume";
