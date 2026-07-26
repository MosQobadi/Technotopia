"use client";

import { useState, type Key, type KeyboardEvent } from "react";
import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FieldError, Input, Label, Tag, TagGroup, TextField as HeroTextField } from "@heroui/react";

export interface TagsInputProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  isRequired?: boolean;
  className?: string;
}

export function TagsInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Add and press Enter",
  isRequired,
  className,
}: TagsInputProps<TFieldValues>) {
  const { field, fieldState } = useController({ control, name });
  const [draft, setDraft] = useState("");
  const tags = (field.value as string[] | undefined) ?? [];

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value || tags.includes(value)) return;
    field.onChange([...tags, value]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      field.onChange(tags.slice(0, -1));
    }
  }

  function handleRemove(keys: Set<Key>) {
    field.onChange(tags.filter((tag) => !keys.has(tag)));
  }

  return (
    <HeroTextField
      isRequired={isRequired}
      isInvalid={!!fieldState.error}
      fullWidth
      className={className}
    >
      <Label>{label}</Label>
      <Input
        placeholder={placeholder}
        name={field.name}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={field.onBlur}
      />
      {tags.length > 0 && (
        <TagGroup aria-label={`${label} tags`} onRemove={handleRemove} className="mt-2">
          <TagGroup.List items={tags.map((tag) => ({ id: tag }))}>
            {(item) => (
              <Tag id={item.id} textValue={item.id}>
                {item.id}
                <Tag.RemoveButton />
              </Tag>
            )}
          </TagGroup.List>
        </TagGroup>
      )}
      <FieldError>{fieldState.error?.message}</FieldError>
    </HeroTextField>
  );
}
