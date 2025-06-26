import { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  Table,
  Checkbox,
  Row,
  Col,
  message,
} from "antd";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Adjust the import path as necessary
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const { Option } = Select;

const numberToWords = (num) => {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
    "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
    "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const inWords = (num) => {
    if ((num = num.toString()).length > 9) return "Overflow";
    let n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return "";
    let str = "";
    str += +n[1] ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + " Crore " : "";
    str += +n[2] ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + " Lakh " : "";
    str += +n[3] ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + " Thousand " : "";
    str += +n[4] ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + " Hundred " : "";
    str += +n[5] ? ((str !== "") ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]]) + " " : "";
    return str.trim();
  };

  const rupees = Math.floor(num);
  const words = inWords(rupees);
  return `INR ${words} Only`;
};

function Invoice() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [gst, setGst] = useState(false);
  const [invoiceNo] = useState(`INV${Date.now().toString().slice(-4)}`);
  const [date] = useState(new Date().toLocaleDateString("en-GB"));

  const [company, setCompany] = useState({ name: "", address: "", gstin: "", state: "", email: "" });
  const [buyer, setBuyer] = useState({ name: "", address: "", gstin: "", state: "", email: "" });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products")); // ✅ Correct collection reference
        const productList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productList);
      } catch (err) {
        console.error("Failed to load products:", err);
        message.error("Failed to load products");
      }
    };
    fetchProducts();
  }, []);

  const addProduct = (productId) => {
    const item = products.find((p) => p.id === productId);
    if (!selected.find((p) => p.id === productId)) {
      setSelected([...selected, { ...item, quantity: 1 }]);
    }
  };

  const updateQty = (id, qty) => {
    setSelected((prev) => prev.map((item) => item.id === id ? { ...item, quantity: qty } : item));
  };

  const removeProduct = (id) => {
    setSelected((prev) => prev.filter((item) => item.id !== id));
  };

  const downloadPDF = () => {
    const docPDF = new jsPDF();
    docPDF.setFontSize(12);
    docPDF.text(`Invoice Number: ${invoiceNo}`, 14, 20);
    docPDF.text(`Date: ${date}`, 14, 30);

    docPDF.text(`From: ${company.name}`, 14, 40);
    docPDF.text(`${company.address}`, 14, 45);
    docPDF.text(`GSTIN: ${company.gstin}`, 14, 50);
    docPDF.text(`State: ${company.state}`, 14, 55);
    docPDF.text(`Email: ${company.email}`, 14, 60);

    docPDF.text(`To: ${buyer.name}`, 14, 70);
    docPDF.text(`${buyer.address}`, 14, 75);
    docPDF.text(`GSTIN: ${buyer.gstin}`, 14, 80);
    docPDF.text(`State: ${buyer.state}`, 14, 85);
    docPDF.text(`Email: ${buyer.email}`, 14, 90);

    const tableData = selected.map((item, index) => [
      index + 1,
      item.name,
      item.price.toFixed(2),
      item.quantity,
      (item.price * item.quantity).toFixed(2),
    ]);

    autoTable(docPDF, {
      head: [["#", "Product", "Price", "Quantity", "Total"]],
      body: tableData,
      startY: 100,
    });

    let finalAmount = selected.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    );
    if (gst) finalAmount *= 1.18;

    docPDF.text(`Grand Total: ₹${finalAmount.toFixed(2)}`, 14, docPDF.lastAutoTable.finalY + 10);
    docPDF.text(`${numberToWords(finalAmount)}`, 14, docPDF.lastAutoTable.finalY + 20);

    docPDF.save(`Invoice_${invoiceNo}.pdf`);
  };

  const columns = [
    { title: "Product", dataIndex: "name" },
    { title: "Price", dataIndex: "price" },
    {
      title: "Quantity",
      render: (_, record) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(val) => updateQty(record.id, val)}
        />
      ),
    },
    {
      title: "Total",
      render: (_, record) => (record.price * record.quantity).toFixed(2),
    },
    {
      title: "Action",
      render: (_, record) => (
        <Button type="link" danger onClick={() => removeProduct(record.id)}>
          Remove
        </Button>
      ),
    },
  ];

  const totalAmount = selected.reduce(
    (sum, p) => sum + p.price * p.quantity,
    0
  ) * (gst ? 1.18 : 1);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Create Invoice</h2>

      <Form layout="vertical">
        <Row gutter={24}>
          <Col span={12}>
            <h3>Company Details</h3>
            <Form.Item label="Name">
              <Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
            </Form.Item>
            <Form.Item label="Address">
              <Input value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
            </Form.Item>
            <Form.Item label="GSTIN">
              <Input value={company.gstin} onChange={(e) => setCompany({ ...company, gstin: e.target.value })} />
            </Form.Item>
            <Form.Item label="State">
              <Input value={company.state} onChange={(e) => setCompany({ ...company, state: e.target.value })} />
            </Form.Item>
            <Form.Item label="Email">
              <Input value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <h3>Buyer Details</h3>
            <Form.Item label="Name">
              <Input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
            </Form.Item>
            <Form.Item label="Address">
              <Input value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} />
            </Form.Item>
            <Form.Item label="GSTIN">
              <Input value={buyer.gstin} onChange={(e) => setBuyer({ ...buyer, gstin: e.target.value })} />
            </Form.Item>
            <Form.Item label="State">
              <Input value={buyer.state} onChange={(e) => setBuyer({ ...buyer, state: e.target.value })} />
            </Form.Item>
            <Form.Item label="Email">
              <Input value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Select style={{ width: 300 }} placeholder="Select Product" onSelect={addProduct}>
        {products.map((p) => (
          <Option key={p.id} value={p.id}>
            {p.name} - ₹{p.price}
          </Option>
        ))}
      </Select>

      <div style={{ marginTop: 20, marginBottom: 10 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Checkbox checked={gst} onChange={(e) => setGst(e.target.checked)}>
              Add 18% GST
            </Checkbox>
          </Col>
          <Col>
            <Checkbox onChange={(e) => { if (e.target.checked) setSelected([]); }}>
              Clear Selected Items
            </Checkbox>
          </Col>
          <Col>
            <strong>Total: ₹{totalAmount.toFixed(2)}</strong>
          </Col>
          <Col>
            <Button type="primary" onClick={downloadPDF}>
              Download PDF
            </Button>
          </Col>
        </Row>
      </div>

      <Table
        dataSource={selected}
        rowKey="id"
        pagination={false}
        columns={columns}
      />
    </div>
  );
}

export default Invoice;
