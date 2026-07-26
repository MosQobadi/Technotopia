"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FormActions,
  ImageUploadField,
  SelectField,
  TagsInput,
  TextareaField,
  TextField,
  ToggleField,
} from "@/components/admin/form";

const demoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  tags: z.array(z.string()).min(1, "Add at least one tag"),
  image: z.union([z.instanceof(File), z.string()]).nullable(),
  isActive: z.boolean(),
});

type DemoValues = z.infer<typeof demoSchema>;

export function FormFieldsDemo() {
  const { control, handleSubmit, formState } = useForm<DemoValues>({
    resolver: zodResolver(demoSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      tags: [],
      image: null,
      isActive: true,
    },
  });

  function onSubmit(values: DemoValues) {
    console.log("Demo form submitted", values);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-md flex-col gap-5">
      <TextField control={control} name="name" label="Name" isRequired />
      <TextareaField control={control} name="description" label="Description" isRequired />
      <SelectField
        control={control}
        name="category"
        label="Category"
        isRequired
        options={[
          { label: "Cameras", value: "cameras" },
          { label: "Microphones", value: "microphones" },
          { label: "Lights", value: "lights" },
        ]}
      />
      <TagsInput control={control} name="tags" label="Tags" isRequired />
      <ImageUploadField control={control} name="image" label="Image" description="PNG or JPG" />
      <ToggleField control={control} name="isActive" label="Active" />
      <FormActions isSubmitting={formState.isSubmitting} onCancel={() => undefined} />
    </form>
  );
}
