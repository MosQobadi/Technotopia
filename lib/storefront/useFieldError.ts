import { useTranslations } from "next-intl";
import type { FieldError } from "react-hook-form";
import { fieldErrorKey } from "./form-errors";

/**
 * A field's validation error in the reader's language, or undefined when the
 * field has none — the shape HeroUI's `FieldError` takes as its children. The
 * schema's own message is never shown: it is English, and it serves the API.
 */
export function useFieldError(): (error: FieldError | undefined) => string | undefined {
  const t = useTranslations("common.fieldError");
  return (error) => (error ? t(fieldErrorKey(error.type)) : undefined);
}
