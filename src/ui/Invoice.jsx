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
import { collection, getDocs, addDoc } from "firebase/firestore";
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
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date] = useState(new Date().toLocaleDateString("en-GB"));
  const [customers, setCustomers] = useState([]);
  const [orderNo, setOrderNo] = useState("");
  const [salesperson, setSalesperson] = useState({});
  const [salespersons, setSalespersons] = useState([]);

  const [company, setCompany] = useState({
    name: "Sri Venkateshwara Dairy Foods",
    address: "OLD NO32/iD1, New No 18, Amudurmedu, Soorancheri post, Avadi, Chennai - 600072",
    fssai: "12421023001134",
    gstin: "33IKAPS6023R1ZL",
    state: "Tamilnadu",
    phone: "9489881484",
  });
  const [buyer, setBuyer] = useState({ name: "", address: "", gstin: "", state: "", email: "" });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));
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

    const fetchCustomers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "customers"));
        const customerList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCustomers(customerList);
      } catch (err) {
        console.error("Failed to load customers:", err);
        message.error("Failed to load customers");
      }
    };

    const fetchSalespersons = async () => {
      try {
        const snapshot = await getDocs(collection(db, "salesperson"));
        const salespersonList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSalespersons(salespersonList);
      } catch (err) {
        console.error("Failed to load salespersons:", err);
        message.error("Failed to load salespersons");
      }
    };

    fetchSalespersons();
    fetchProducts();
    fetchCustomers();
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
    const pageHeight = doc.internal.pageSize.height;
    let pageNumber = 1;
  
    const rows = selected.map((p, i) => [
      i + 1,
      p.name,
      p.hsnCode || "21050000",
      p.mrp,
      p.quantity,
      Number(p.price).toFixed(2),
      (p.price * p.quantity).toFixed(2),
    ]);

    const subtotal = rows.reduce((sum, row) => sum + parseFloat(row[6]), 0);
    const gstAmount = gst ? subtotal * 0.05 : 0;
    const total = subtotal + gstAmount;
    const roundedTotal = Math.round(total);
    const roundOffAmount = (roundedTotal - total).toFixed(2);
  
    const gstSummaryRows = gst
      ? [
          ["", { content: "Output CGST 2.5%", styles: { halign: "right", fontStyle: "bold" } }, "", "", "", "", { content: (gstAmount / 2).toFixed(2), styles: { halign: "right" } }],
          ["", { content: "Output SGST 2.5%", styles: { halign: "right", fontStyle: "bold" } }, "", "", "", "", { content: (gstAmount / 2).toFixed(2), styles: { halign: "right" } }],
        ]
      : [];
  
    const roundOffRow = ["", { content: "Round Off", styles: { halign: "right", fontStyle: "bold" } }, "", "", "", "", { content: roundOffAmount, styles: { halign: "right" } }];
  
    const renderHeader = () => {
      let headerY = 20;
  
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      if (gst) {
        doc.text("Tax Invoice", 105, headerY, { align: "center" });
      } else {
        doc.text("Invoice", 105, headerY, { align: "center" });
      }
      headerY += 10;
  
      doc.setFontSize(14);
      doc.setFont(undefined, "normal");
      doc.text(company.name, 14, headerY);
      headerY += 6;
  
      doc.setFontSize(10);
      doc.text(company.address, 14, headerY);
      headerY += 5;
      if (company.fssai) { doc.text(`FSSAI No: ${company.fssai}`, 14, headerY); headerY += 5; }
      if (company.gstin) { doc.text(`GSTIN: ${company.gstin}`, 14, headerY); headerY += 5; }
      if (company.state) { doc.text(`State: ${company.state}`, 14, headerY); headerY += 5; }
      if (company.phone) { doc.text(`Phone: ${company.phone}`, 14, headerY); headerY += 5; }
  
      doc.rect(160, 30, 40, 20);
      doc.setFontSize(10);
      doc.text("Invoice No.: " + invoiceNo, 162, 38);
      doc.text("Date: " + date, 162, 46);
  
      doc.line(14, headerY, 200, headerY);
      headerY += 7;
  
      doc.setFontSize(12);
      doc.text("Buyer Details:", 14, headerY);
      headerY += 5;
  
      doc.setFontSize(10);
      doc.text(buyer.name, 14, headerY);
      headerY += 5;
  
      doc.text(buyer.address, 14, headerY);
      headerY += 5;
  
      if (buyer.gstin) { doc.text(`GSTIN: ${buyer.gstin}`, 14, headerY); headerY += 5; }
      if (buyer.state) { doc.text(`State: ${buyer.state}`, 14, headerY); headerY += 5; }
      if (buyer.email) { doc.text(`Phone: ${buyer.email}`, 14, headerY); headerY += 5; }
  
      let salespersonStartY = 64;
      doc.setFontSize(12);
      doc.text("Order No.: " + orderNo, 160, salespersonStartY + 2);
      salespersonStartY += 7;
  
      doc.setFontSize(10);
      doc.text(`Sales Person: ${salesperson?.name || ""}`, 160, salespersonStartY);
      salespersonStartY += 6;
  
      doc.text(`Phone: ${salesperson?.phone || ""}`, 160, salespersonStartY);
  
      return Math.max(headerY, salespersonStartY);
    };
  
    const rowHeight = 6.5;
    const headerHeight = 80;
    const footerReserved = 60;
  
    const usableHeight = pageHeight - headerHeight - footerReserved;
    const maxRowsFirstPage = Math.floor(usableHeight / rowHeight);
  
    const totalRows = [...rows, ...gstSummaryRows, roundOffRow];
    let currentIndex = 0;
    let finalY = 0;
  
    while (currentIndex < totalRows.length || currentIndex === 0) {
      let headerY = renderHeader();
      let remainingRows = totalRows.length - currentIndex;
      let maxRows = maxRowsFirstPage;
      let displayRows = remainingRows > maxRows ? maxRows : remainingRows;
  
      let pageRows = totalRows.slice(currentIndex, currentIndex + displayRows);
  
      if (currentIndex + displayRows >= totalRows.length) {
        let fillerRows = Array.from({ length: maxRows - pageRows.length }, () => ["", "", "", "", "", ""]);
        pageRows = [...pageRows, ...fillerRows];
  
        pageRows.push([
          "",
          { content: "Total Amount", styles: { halign: "right", fontStyle: "bold" } },
          "",
          "",
          "",
          "",
          { content: total.toFixed(0), styles: { halign: "right", fontStyle: "bold" } }
        ]);
      } else if (pageRows.length < maxRows) {
        let fillerRows = Array.from({ length: maxRows - pageRows.length }, () => ["", "", "", "", "", ""]);
        pageRows = [...pageRows, ...fillerRows];
      }
  
      autoTable(doc, {
        startY: headerY,
        head: [["S.No", "Description of Goods", "HSN/SAC", "MRP", "Quantity", "Rate", "Amount"]],
        body: pageRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1 },
        margin: { left: 14 },
        columnStyles: { 0: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "right" }, 6: { halign: "right" } },
        didDrawPage: () => {
          doc.setFontSize(8);
          doc.text(`Page ${pageNumber}`, 200, pageHeight - 10, { align: "right" });
        }
      });
  
      finalY = doc.lastAutoTable.finalY + 10;
      currentIndex += maxRows;
  
      if (currentIndex < totalRows.length) {
        doc.addPage();
        pageNumber++;
      }
    }
  
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text("Total Amount (In Words):", 14, finalY - 4);
    doc.setFont(undefined, "normal");
  
    const totalAmountInWords = numberToWords(total);
    const wordsLines = doc.splitTextToSize(totalAmountInWords, 80);
  
    wordsLines.forEach((line, index) => {
      doc.text(line, 14, finalY + (index * 6));
    });
  
    // Print account details on the right side (fixed)
    doc.setFont(undefined, "bold");
    doc.setFontSize(8);
    doc.text("Account Details:", 120, finalY + 2);
  
    doc.setFont(undefined, "normal");
    doc.text("Account Name: Sri Venkateshwara Dairy Foods", 120, finalY + 6);
    doc.text("Account No: 1783135000005075", 120, finalY + 10);
    doc.text("Branch: NEMILICHERRY", 120, finalY + 14);
    doc.text("IFSC: KVBL0001783", 120, finalY + 18);
    doc.text("UPI: 9489881484", 120, finalY + 22);
  
    const wordsBlockHeight = wordsLines.length * 6 + 10;
    const accountBlockHeight = 30 + 10;
  
    let nextSectionY = finalY + Math.max(wordsBlockHeight, accountBlockHeight) + 10;
  
    if (gst) {
      // GST Table if GST is included
      autoTable(doc, {
        startY: finalY + 2,
        margin: { left: 14 },
        tableWidth: 90,
        theme: "grid",
        head: [["HSN/SAC", "Taxable Value", "CGST", "CGST Amt", "SGST", "SGST Amt", "Total Tax"]],
        body: [[
          "21050000",
          subtotal.toFixed(2),
          "2.5%",
          (gstAmount / 2).toFixed(2),
          "2.5%",
          (gstAmount / 2).toFixed(2),
          gstAmount.toFixed(2),
        ]],
        styles: { fontSize: 8, cellPadding: 1 },
        columnStyles: { 2: { halign: "center" }, 4: { halign: "center" } },
      });
  
      nextSectionY = doc.lastAutoTable.finalY + 4;
  
      doc.setFontSize(6);
      doc.text(`GST Amount in Words: ${numberToWords(gstAmount)}`, 14, nextSectionY);
      doc.setFontSize(10);
      nextSectionY += 8;
    } else {
      // When GST is not included, move up the declaration
      nextSectionY = finalY + 26;
    }
  
    // Declaration and Footer
    doc.setFont(undefined, "bold");
    doc.text("Declaration", 14, nextSectionY);
    nextSectionY += 5;
  
    doc.setFont(undefined, "normal");
    doc.text("We declare that this invoice reflects the actual price of ", 14, nextSectionY);
    doc.text("the goods described and that all particulars are true and correct.", 14, nextSectionY + 4);
    nextSectionY += 2;
  
    doc.setFont(undefined, "bold");
    doc.text(`for ${company.name}`, 200, nextSectionY, { align: "right" });
    nextSectionY += 4;
  
    doc.setFont(undefined, "normal");
    doc.text("Authorised Signatory", 200, nextSectionY, { align: "right" });
    nextSectionY += 6;
  
    doc.setFontSize(8);
    doc.text("This is a Computer Generated Invoice", 14, nextSectionY);
  
    try {
      doc.save("invoice.pdf");
    } catch (err) {
      const blob = doc.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "invoice.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    
    // 🔥 POST Invoice to Firestore
    // Utility to safely return null if value is undefined
  const safeValue = (value) => (value !== undefined ? value : null);

  const finalAmount = gst ? total.toFixed(2) : subtotal.toFixed(2);

  const invoiceData = {
    invoiceNo: safeValue(invoiceNo),
    date: safeValue(date),
    customer: {
      name: safeValue(buyer.name),
      address: safeValue(buyer.address),
      gstin: safeValue(buyer.gstin),
      state: safeValue(buyer.state),
      email: safeValue(buyer.email),
    },
    salesperson: {
      name: safeValue(salesperson?.name),
      phone: safeValue(salesperson?.phone),
      id: safeValue(salesperson?.id),
    },
    orderNo: safeValue(orderNo),
    gstIncluded: gst,
    finalAmount: Number(finalAmount),
    items: selected.map((item) => ({
      id: safeValue(item.id),
      name: safeValue(item.name),
      hsnCode: safeValue(item.hsnCode || "21050000"),
      mrp: safeValue(item.mrp),
      quantity: safeValue(item.quantity),
      rate: Number(safeValue(item.price)).toFixed(2),
      amount: (item.price * item.quantity).toFixed(2),
    })),
  };

  addDoc(collection(db, "invoices"), invoiceData)
    .then(() => {
      message.success("Invoice saved to Firestore successfully.");
    })
    .catch((error) => {
      console.error("Error saving invoice:", error);
      message.error("Failed to save invoice to Firestore.");
    });
  }
  
  
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
  ) * (gst ? 1.05 : 1);

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
            <Form.Item label="FSSAI No">
              <Input value={company.fssai} onChange={(e) => setCompany({ ...company, fssai: e.target.value })} />
            </Form.Item>
            <Form.Item label="GSTIN">
              <Input value={company.gstin} onChange={(e) => setCompany({ ...company, gstin: e.target.value })} />
            </Form.Item>
            <Form.Item label="State">
              <Input value={company.state} onChange={(e) => setCompany({ ...company, state: e.target.value })} />
            </Form.Item>
            <Form.Item label="Phone">
              <Input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
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

      <Form layout="inline" style={{ marginBottom: 20 }}>
        <Form.Item label="Invoice No.">
          <Input
            placeholder="Enter Invoice Number"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
          />
        </Form.Item>

        <Form.Item label="Order No.">
          <Input
            placeholder="Enter Order Number"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
          />
        </Form.Item>

        <Form.Item label="Salesperson">
          <Select
            showSearch
            style={{ width: 200 }}
            placeholder="Select Salesperson"
            optionFilterProp="label"
            onSelect={(value) => {
              const sp = salespersons.find((s) => s.id === value);
              setSalesperson(sp);
            }}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={salespersons.map((sp) => ({
              label: sp.name,
              value: sp.id,
            }))}
          />
        </Form.Item>
      </Form>

      <Select
        showSearch
        style={{ width: 300, marginBottom: 20 }}
        placeholder="Select Customer"
        optionFilterProp="label"
        onSelect={(customerId) => {
          const selectedCustomer = customers.find((c) => c.id === customerId);
          if (selectedCustomer) {
            setBuyer({
              name: selectedCustomer.name,
              address: selectedCustomer.address,
              gstin: selectedCustomer.gstin,
              state: selectedCustomer.state,
              email: selectedCustomer.contact,
            });
          }
        }}
        filterOption={(input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
        }
        options={customers.map((c) => ({
          label: `${c.name} - ${c.contact}`,
          value: c.id,
        }))}
      />

      <Select
        showSearch
        style={{ width: 300 }}
        placeholder="Select Product"
        optionFilterProp="label"
        onSelect={addProduct}
        filterOption={(input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
        }
        options={products.map((p) => ({
          label: `${p.name} - ₹${p.price}`,
          value: p.id,
        }))}
      />

      <div style={{ marginTop: 20, marginBottom: 10 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Checkbox checked={gst} onChange={(e) => setGst(e.target.checked)}>
              Add 5% GST
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
