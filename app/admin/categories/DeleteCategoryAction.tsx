"use client";

import { useState } from "react";
import { AlertDialog, Button } from "@heroui/react";

interface DeleteCategoryActionProps {
  categoryId: string;
  categoryName: string;
  onDeleted: () => void;
}

export function DeleteCategoryAction({
  categoryId,
  categoryName,
  onDeleted,
}: DeleteCategoryActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) setError(null);
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setIsOpen(false);
      onDeleted();
    } catch {
      setError("Failed to delete category.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Button variant="ghost" size="sm" className="text-danger hover:underline">
        Delete
      </Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Header>
              <AlertDialog.Heading>Delete category</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                Are you sure you want to delete <strong>{categoryName}</strong>? This can&apos;t
                be undone.
              </p>
              {error && <p className="text-danger mt-2 text-sm">{error}</p>}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="secondary" isDisabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="primary" onPress={handleDelete} isPending={isDeleting}>
                Delete
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog.Root>
  );
}
