"use client";

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FieldError, Label, TextArea, TextField as HeroTextField } from "@heroui/react";

export interface TextareaFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  rows?: number;
  isRequired?: boolean;
  className?: string;
}

export function TextareaField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  rows = 4,
  isRequired,
  className,
}: TextareaFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <HeroTextField
          isRequired={isRequired}
          isInvalid={!!fieldState.error}
          fullWidth
          className={className}
        >
          <Label>{label}</Label>
          <TextArea
            rows={rows}
            placeholder={placeholder}
            name={field.name}
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
          />
          <FieldError>{fieldState.error?.message}</FieldError>
        </HeroTextField>
      )}
    />
  );
}
