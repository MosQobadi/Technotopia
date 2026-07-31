import Link from "next/link";

const SHOP_LINKS = ["Cameras", "Microphones", "Lights", "Speakers", "Accessories"];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-surface-100">
      <div className="mx-auto grid max-w-320 grid-cols-1 gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-3.5 flex items-center gap-1.5">
            <span className="bg-accent size-2.5 rounded-full" aria-hidden />
            <span className="text-lg font-extrabold tracking-tight text-gray-900">
              Technotopia
            </span>
          </div>
          <p className="max-w-70 text-sm leading-relaxed text-gray-500">
            Cameras, microphones, lights and speakers for people who make things worth
            watching.
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-bold text-gray-600">Shop</h3>
          <div className="flex flex-col gap-2.5">
            {SHOP_LINKS.map((category) => (
              <Link
                key={category}
                href={`/products?category=${encodeURIComponent(category)}`}
                className="text-sm text-gray-500"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-bold text-gray-600">Support</h3>
          <div className="flex flex-col gap-2.5">
            <Link href="/orders/track" className="text-sm text-gray-500">
              Track an order
            </Link>
            <Link href="#" className="text-sm text-gray-500">
              Returns &amp; warranty
            </Link>
            <Link href="#" className="text-sm text-gray-500">
              Shipping info
            </Link>
            <Link href="mailto:support@technotopia.example" className="text-sm text-gray-500">
              support@technotopia.example
            </Link>
            <span className="font-mono text-[13px] text-gray-500">+98 21 0000 0000</span>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-bold text-gray-600">Visit</h3>
          <address className="text-sm leading-loose text-gray-500 not-italic">
            No. 00, Placeholder St.
            <br />
            Tehran, Iran
            <br />
            Postal code 00000
          </address>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-320 flex-wrap items-center justify-between gap-3 px-6 py-5">
          <span className="font-mono text-xs text-gray-500">
            © {new Date().getFullYear()} Technotopia. All rights reserved.
          </span>
          <div className="flex gap-5">
            <Link href="#" className="text-xs text-gray-600">
              Privacy
            </Link>
            <Link href="#" className="text-xs text-gray-600">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
