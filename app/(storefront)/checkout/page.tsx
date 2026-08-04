import type { Metadata } from "next";
import { CheckoutContent } from "./CheckoutContent";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Technotopia order — shipping address and payment.",
};

export default function CheckoutPage() {
  return <CheckoutContent />;
}
