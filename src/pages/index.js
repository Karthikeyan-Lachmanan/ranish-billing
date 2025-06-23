import Link from "next/link";
export default function Home() {

  return (
    <div>
      <h1>Welcome to Billing App</h1>
      <Link href="/products">Go to Products</Link>
      <Link href="/invoice">Go to invoice</Link>
    </div>
  );
}
