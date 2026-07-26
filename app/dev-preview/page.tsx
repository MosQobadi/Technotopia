import { Button, Input, Label, Modal, Table, TextField } from "@heroui/react";
import { DataTableDemo } from "./DataTableDemo";

export default function DevPreviewPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 p-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold">HeroUI Theme Preview</h1>
        <p className="text-muted text-sm">
          Temporary page to confirm the indigo theme — remove once confirmed.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted text-sm font-medium">Button</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted text-sm font-medium">Input</h2>
        <TextField className="max-w-sm">
          <Label>Email</Label>
          <Input placeholder="you@technotopia.dev" />
        </TextField>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted text-sm font-medium">Table</h2>
        <Table.Root>
          <Table.ScrollContainer>
            <Table.Content aria-label="Preview users">
              <Table.Header>
                <Table.Column isRowHeader>Name</Table.Column>
                <Table.Column>Email</Table.Column>
                <Table.Column>Role</Table.Column>
              </Table.Header>
              <Table.Body>
                <Table.Row>
                  <Table.Cell>Ada Lovelace</Table.Cell>
                  <Table.Cell>ada@technotopia.dev</Table.Cell>
                  <Table.Cell>Admin</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Grace Hopper</Table.Cell>
                  <Table.Cell>grace@technotopia.dev</Table.Cell>
                  <Table.Cell>Editor</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table.Root>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted text-sm font-medium">DataTable (components/admin/DataTable)</h2>
        <DataTableDemo />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted text-sm font-medium">Modal</h2>
        <Modal.Root>
          <Button variant="primary">Open modal</Button>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog>
                <Modal.Header>
                  <Modal.Heading>Confirm action</Modal.Heading>
                  <Modal.CloseTrigger />
                </Modal.Header>
                <Modal.Body>This is a HeroUI modal styled with the indigo accent theme.</Modal.Body>
                <Modal.Footer>
                  <Button slot="close" variant="secondary">
                    Cancel
                  </Button>
                  <Button slot="close" variant="primary">
                    Confirm
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal.Root>
      </section>
    </main>
  );
}
