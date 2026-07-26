"use client";

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FieldError, Switch } from "@heroui/react";

export interface ToggleFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  className?: string;
}

export function ToggleField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  className,
}: ToggleFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Switch.Root
          isSelected={!!field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          isInvalid={!!fieldState.error}
          name={field.name}
          ref={field.ref}
          className={className}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            {label}
          </Switch.Content>
          <FieldError>{fieldState.error?.message}</FieldError>
        </Switch.Root>
      )}
    />
  );
}
