"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Modal } from "@heroui/react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/admin/form";

const stockEditFormSchema = z.object({
  addStock: z
    .string()
    .min(1, "Add Stock is required")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) > 0,
      "Enter a whole number greater than 0",
    ),
});

type StockEditFormValues = z.infer<typeof stockEditFormSchema>;

export interface StockEditModalItem {
  productId: string;
  name: string;
  stock: number;
}

interface StockEditModalProps {
  item: StockEditModalItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function StockEditModal({ item, onClose, onSaved }: StockEditModalProps) {
  return (
    <Modal.Root isOpen={!!item} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Edit Stock</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            {item && (
              <StockEditForm key={item.productId} item={item} onClose={onClose} onSaved={onSaved} />
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

interface StockEditFormProps {
  item: StockEditModalItem;
  onClose: () => void;
  onSaved: () => void;
}

function StockEditForm({ item, onClose, onSaved }: StockEditFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<StockEditFormValues>({
    resolver: zodResolver(stockEditFormSchema),
    defaultValues: { addStock: "" },
  });

  const addStockWatch = useWatch({ control, name: "addStock" });
  const addStockAmount = Number(addStockWatch);
  const newTotal =
    addStockWatch && Number.isFinite(addStockAmount) ? item.stock + addStockAmount : item.stock;

  async function onSubmit(values: StockEditFormValues) {
    setFormError(null);

    const response = await fetch(`/api/admin/inventory/${item.productId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ addStock: Number(values.addStock) }),
    });
    const result = await response.json();

    if (!result.success) {
      setFormError(result.error ?? "Failed to update stock.");
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <>
      <Modal.Body>
        <form
          id="stock-edit-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {formError && <p className="text-danger text-sm">{formError}</p>}

          <div>
            <p className="text-foreground font-medium">{item.name}</p>
            <p className="text-muted text-sm">Current Stock: {item.stock}</p>
          </div>

          <TextField
            control={control}
            name="addStock"
            label="Add Stock"
            type="number"
            placeholder="e.g. 20"
            isRequired
          />

          <p className="text-foreground text-sm">New Total: {newTotal}</p>
        </form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="button"
          variant="outline"
          onPress={onClose}
          isDisabled={formState.isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="stock-edit-form"
          variant="primary"
          isDisabled={formState.isSubmitting}
        >
          {formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </>
  );
}
