import Link from "next/link";
export default function Home() {

  return (
    <div>
      <h1>Welcome to Billing App</h1>
      <Link href="/products">Go to Products</Link>
      <Link href="/invoice">Go to invoice</Link>
      <Link href="/salesperson">Go to Sales Person</Link>
      <Link href="/customers">Go to Customers</Link>
    </div>
  );
}
