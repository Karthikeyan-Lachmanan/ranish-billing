// pages/index.js
import dynamic from "next/dynamic";

const Homepage = dynamic(() => import("@/ui/homepage"), { ssr: false });

export default function Home() {
  return <Homepage />;
}
