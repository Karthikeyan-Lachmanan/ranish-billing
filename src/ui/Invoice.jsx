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
  Col
} from "antd";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const { Option } = Select;

// Number to words utility for INR
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

  const rupees = Math.floor(num); // Ignore decimal part
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
        const res = await fetch(`${window.location.origin}/api/products`);
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Failed to load products:", err);
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
    if (selected.length === 0) {
      alert("Please select at least one product before downloading.");
      return;
    }
  
    const doc = new jsPDF();
  
    const topMargin = 20;
    const bottomMargin = 20;
    const pageHeight = doc.internal.pageSize.height;
    let y = topMargin;
  
    const ensureSpace = (neededSpace) => {
      if (y + neededSpace > pageHeight - bottomMargin) {
        doc.addPage();
        y = topMargin;
      }
    };
  
    const rows = selected.map((p, i) => [
      i + 1,
      p.name,
      p.hsnCode || "21050000",
      p.quantity,
      Number(p.price).toFixed(2),
      (p.price * p.quantity).toFixed(2),
    ]);
  
    const subtotal = rows.reduce((sum, row) => sum + parseFloat(row[5]), 0);
    const gstAmount = gst ? subtotal * 0.18 : 0;
    const total = subtotal + gstAmount;
  
    // Header
    doc.setFontSize(14);
    doc.text(company.name, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(company.address, 14, y);
    y += 5;
    if (company.gstin) { doc.text(`GSTIN: ${company.gstin}`, 14, y); y += 5; }
    if (company.state) { doc.text(`State: ${company.state}`, 14, y); y += 5; }
    if (company.email) { doc.text(`Email: ${company.email}`, 14, y); y += 5; }
  
    doc.rect(140, topMargin, 60, 25);
    doc.text("Invoice No.: " + invoiceNo, 142, topMargin + 8);
    doc.text("Date: " + date, 142, topMargin + 16);
  
    doc.line(14, y, 200, y);
    y += 7;
  
    // Buyer Details
    ensureSpace(30);
    doc.setFontSize(12);
    doc.text("Buyer Details:", 14, y);
    y += 5;
    doc.setFontSize(10);
    doc.text(buyer.name, 14, y);
    y += 5;
    doc.text(buyer.address, 14, y);
    y += 5;
    if (buyer.gstin) { doc.text(`GSTIN: ${buyer.gstin}`, 14, y); y += 5; }
    if (buyer.state) { doc.text(`State: ${buyer.state}`, 14, y); y += 5; }
    if (buyer.email) { doc.text(`Email: ${buyer.email}`, 14, y); y += 5; }
    
    // Product Table
    ensureSpace(50);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["S.No", "Description of Goods", "HSN/SAC", "Quantity", "Rate", "Amount"]],
      columnStyles: { 0: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "right" }, 5: { halign: "right" } },
      styles: { fontSize: 8, cellPadding: 1 },
      body: rows,
    });
  
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 40;
  
    doc.setFontSize(10);
    const leftX = 14;
    const rightX = 110;
  
    // Calculate left section: Total Amount in Words
    const totalAmountInWords = numberToWords(total);
    const wordsLines = doc.splitTextToSize(totalAmountInWords, 80); // wrap if long text
  
    // Calculate right section: GST summary
    const gstLines = gst ? [
      ["Output CGST 9%", (gstAmount / 2).toFixed(2)],
      ["Output SGST 9%", (gstAmount / 2).toFixed(2)],
      ["Total Amount", total.toFixed(2)]
    ] : [["Total Amount", total.toFixed(2)]];
  
    // Calculate dynamic height
    const linesCount = Math.max(wordsLines.length, gstLines.length);
    ensureSpace(linesCount * 6 + 20);
  
    // Render left side (Total Amount in Words)
    doc.setFont(undefined, "bold");
    doc.text("Total Amount (In Words):", leftX, y);
    doc.setFont(undefined, "normal");
    wordsLines.forEach((line, index) => {
      doc.text(line, leftX, y + 6 + (index * 6));
    });
  
    // Render right side (GST Summary)
    gstLines.forEach(([label, value], index) => {
      doc.text(label + ":", rightX, y + (index * 6));
      doc.text(value, rightX + 50, y + (index * 6), { align: "right" });
    });
  
    y += linesCount * 6 + 10;
  
    // GST Tax Table (if GST applied)
    if (gst) {
      ensureSpace(50);
      autoTable(doc, {
        startY: y,
        margin: { left: 14 },
        tableWidth: 180,
        theme: "grid",
        head: [["HSN/SAC", "Taxable Value", "CGST", "CGST Amt", "SGST", "SGST Amt", "Total Tax"]],
        body: [[
          "21050000",
          subtotal.toFixed(2),
          "9%",
          (gstAmount / 2).toFixed(2),
          "9%",
          (gstAmount / 2).toFixed(2),
          gstAmount.toFixed(2),
        ]],
        styles: { fontSize: 8, cellPadding: 1 },
        columnStyles: { 2: { halign: "center" }, 4: { halign: "center" } },
      });
  
      y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 4 : y + 20;
  
      ensureSpace(10);
      doc.setFontSize(6);
      doc.text(`GST Amount in Words: ${numberToWords(gstAmount)}`, 14, y);
      doc.setFontSize(10);
      y += 8;
    }
  
    // Declaration
    ensureSpace(30);
    doc.setFont(undefined, "bold");
    doc.text("Declaration", 14, y);
    y += 5;
    doc.setFont(undefined, "normal");
    doc.text("We declare that this invoice reflects the actual price of the goods described and that all particulars are true and correct.", 14, y);
    y += 15;
  
    // Signature
    ensureSpace(20);
    doc.setFont(undefined, "bold");
    doc.text(`for ${company.name}`, 200, y, { align: "right" });
    y += 4;
    doc.setFont(undefined, "normal");
    doc.text("Authorised Signatory", 200, y, { align: "right" });
    y += 6;
  
    // Footer
    ensureSpace(10);
    doc.setFontSize(8);
    doc.text("This is a Computer Generated Invoice", 14, y);
  
    try {
      doc.save("invoice.pdf");
    } catch (err) {
      // Fallback for mobile
      const blob = doc.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "invoice.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
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