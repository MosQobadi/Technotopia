import type { Metadata } from "next";
import { HomeContent } from "./HomeContent";

export const metadata: Metadata = {
  title: "Cameras, Microphones, Lights & Speakers",
  description:
    "Shop cameras, microphones, lights and speakers for people who make things worth watching.",
};

export default function HomePage() {
  return <HomeContent />;
}
