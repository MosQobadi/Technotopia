"use client";

import type { ComponentProps } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FieldError, Input, Label, TextField as HeroTextField } from "@heroui/react";

export interface TextFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  type?: ComponentProps<typeof Input>["type"];
  placeholder?: string;
  isRequired?: boolean;
  className?: string;
}

export function TextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  placeholder,
  isRequired,
  className,
}: TextFieldProps<TFieldValues>) {
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
          <Input
            type={type}
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
