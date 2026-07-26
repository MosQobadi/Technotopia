"use client";

import type { Key } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FieldError, Label, ListBox, ListBoxItem, Select } from "@heroui/react";

export interface SelectFieldOption {
  label: string;
  value: string;
}

export interface SelectFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  options: SelectFieldOption[];
  placeholder?: string;
  isRequired?: boolean;
  className?: string;
}

export function SelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = "Select...",
  isRequired,
  className,
}: SelectFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Select.Root
          selectedKey={field.value || null}
          onSelectionChange={(key: Key | null) => field.onChange(key ?? "")}
          onBlur={field.onBlur}
          isRequired={isRequired}
          isInvalid={!!fieldState.error}
          placeholder={placeholder}
          name={field.name}
          fullWidth
          className={className}
        >
          <Label>{label}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {options.map((option) => (
                <ListBoxItem key={option.value} id={option.value}>
                  {option.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Select.Popover>
          <FieldError>{fieldState.error?.message}</FieldError>
        </Select.Root>
      )}
    />
  );
}
