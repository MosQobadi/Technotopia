"use client";

import { useEffect, useId, useMemo, useRef, type ChangeEvent } from "react";
import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Button, Description, Label } from "@heroui/react";

export interface ImageUploadFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  description?: string;
  isRequired?: boolean;
  className?: string;
}

function ImagePreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  // Object URLs point to an in-memory blob, not a servable asset — next/image can't optimize it.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-20 w-20 rounded-md border border-gray-200 object-cover" />;
}

export function ImageUploadField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  isRequired,
  className,
}: ImageUploadFieldProps<TFieldValues>) {
  const { field, fieldState } = useController({ control, name });
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const value = field.value as File | string | null | undefined;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    field.onChange(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  return (
    <div className={className}>
      <Label htmlFor={inputId} isRequired={isRequired} isInvalid={!!fieldState.error}>
        {label}
      </Label>
      {description && <Description className="mt-1 block">{description}</Description>}

      <div className="mt-2 flex items-center gap-4">
        {value instanceof File ? (
          <ImagePreview file={value} />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-20 w-20 rounded-md border border-gray-200 object-cover" />
        ) : (
          <div className="text-muted flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs">
            No image
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onPress={() => fileInputRef.current?.click()}>
            {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onPress={() => field.onChange(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        name={field.name}
        onChange={handleFileChange}
        onBlur={field.onBlur}
      />

      {fieldState.error?.message && (
        <p className="text-danger mt-1 text-xs">{fieldState.error.message}</p>
      )}
    </div>
  );
}
