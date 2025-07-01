import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Adjust the path if needed
import { Table, message } from "antd";

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "invoices"));
      const invoicesList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(invoice => invoice.gstIncluded === true);

      setInvoices(invoicesList);
      console.log("Invoices loaded:", invoicesList);
    } catch (err) {
      console.error("Failed to load invoices:", err);
      message.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const columns = [
    { title: "Invoice No", dataIndex: "invoiceNo", key: "invoiceNo" },
    { title: "Customer Name", dataIndex: ["customer", "name"], key: "customerName" },
    { title: "Customer Address", dataIndex: ["customer", "address"], key: "customerAddress" },
    { title: "Sales Person", dataIndex: ["salesperson", "name"], key: "salespersonName" },
    { title: "Final Amount (₹)", dataIndex: "finalAmount", key: "finalAmount" }
  ];
  

  return (
    <div style={{ padding: "2rem" }}>
      <h2>All Bills</h2>
      <Table
        dataSource={invoices}
        rowKey="id"
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}

export default InvoiceList;