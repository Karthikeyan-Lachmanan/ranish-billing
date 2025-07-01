import Link from "next/link";
import { Button, Space } from "antd";

export default function Home() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome to Billing App</h1>
      <Space direction="vertical" size="middle">
        <Link href="/products">
          <Button type="primary" block>Go to Products</Button>
        </Link>
        <Link href="/invoice">
          <Button type="primary" block>Go to Invoice</Button>
        </Link>
        <Link href="/salesperson">
          <Button type="primary" block>Go to Sales Person</Button>
        </Link>
        <Link href="/customers">
          <Button type="primary" block>Go to Customers</Button>
        </Link>
        <Link href="/invoice-list">
          <Button type="primary" block>Go to All Bills</Button>
        </Link>
      </Space>
    </div>
  );
}
