import type { Metadata } from "next";
import { CartContent } from "./CartContent";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review the items in your Technotopia cart before checkout.",
};

export default function CartPage() {
  return <CartContent />;
}
