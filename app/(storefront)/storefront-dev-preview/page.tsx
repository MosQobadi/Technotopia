import { Button, Card } from "@heroui/react";
import { formatPrice } from "@/lib/format";

export default function StorefrontDevPreviewPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 p-8">
      <div>
        <h1 className="text-2xl">Storefront Theme Preview</h1>
        <p className="text-gray-500 text-sm">
          Temporary page to confirm the storefront design tokens — remove once confirmed.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-gray-500 font-mono text-xs tracking-wide uppercase">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Add to Cart</Button>
          <Button variant="outline">View Details</Button>
          <Button variant="secondary" isDisabled>
            Out of Stock
          </Button>
          <Button variant="ghost" isIconOnly aria-label="Wishlist">
            ♡
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-gray-500 font-mono text-xs tracking-wide uppercase">
          Price tag with discount
        </h2>
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="text-ink-900 text-2xl font-extrabold">{formatPrice(12_400_000)}</span>
          <span className="font-mono text-gray-500 text-sm line-through">
            {formatPrice(15_500_000)}
          </span>
          <span className="bg-error font-mono rounded-full px-2.5 py-0.5 text-xs font-bold text-white">
            -20%
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-gray-500 font-mono text-xs tracking-wide uppercase">Product card</h2>
        <Card variant="default" className="w-70 gap-0 overflow-hidden p-0">
          <div className="bg-surface-200 relative flex aspect-square items-center justify-center">
            <span className="text-gray-500 font-mono text-[10px] uppercase">Product photo</span>
            <span className="bg-error font-mono absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white">
              -20%
            </span>
            <Button
              variant="secondary"
              isIconOnly
              size="sm"
              aria-label="Wishlist"
              className="absolute top-2.5 right-2.5"
            >
              ♡
            </Button>
          </div>
          <Card.Content className="gap-3 p-5">
            <span className="text-accent font-mono text-[11px] tracking-wide uppercase">
              Microphones
            </span>
            <h3 className="text-lg font-bold tracking-tight">Cardio X2 Condenser Mic</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold">{formatPrice(4_200_000)}</span>
              <span className="font-mono text-gray-500 text-xs line-through">
                {formatPrice(5_250_000)}
              </span>
            </div>
            <Button variant="primary" fullWidth>
              Add to Cart
            </Button>
          </Card.Content>
        </Card>
      </section>
    </main>
  );
}
