"use client";

import type { ChangeEvent } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FieldError, Input, Label, TextField as HeroTextField } from "@heroui/react";

const groupFormatter = new Intl.NumberFormat("en-US");

function toDisplay(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "";
  return groupFormatter.format(value);
}

function parseAmount(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits === "" ? Number.NaN : Number(digits);
}

export interface RialInputProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  isRequired?: boolean;
  className?: string;
}

export function RialInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  isRequired,
  className,
}: RialInputProps<TFieldValues>) {
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
            inputMode="numeric"
            placeholder={placeholder}
            name={field.name}
            value={toDisplay(field.value as number | undefined)}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              field.onChange(parseAmount(event.target.value))
            }
            onBlur={field.onBlur}
            ref={field.ref}
          />
          <FieldError>{fieldState.error?.message}</FieldError>
        </HeroTextField>
      )}
    />
  );
}
