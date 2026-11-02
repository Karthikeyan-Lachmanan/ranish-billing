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
import { DEFAULT_SET, DEFAULT_SET_ID, getProductSetId } from "@/lib/productSets";
import { DEFAULT_COMPANY, calculateTotals, generateInvoicePdf } from "@/lib/invoicePdf";

const { Option } = Select;

function Invoice() {
  const [products, setProducts] = useState([]);
  const [productSets, setProductSets] = useState([DEFAULT_SET]);
  const [productSetId, setProductSetId] = useState(DEFAULT_SET_ID);
  const [selected, setSelected] = useState([]);
  const [gst, setGst] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date] = useState(new Date().toLocaleDateString("en-GB"));
  const [customers, setCustomers] = useState([]);
  const [orderNo, setOrderNo] = useState("");
  const [salesperson, setSalesperson] = useState({});
  const [salespersons, setSalespersons] = useState([]);

  const [company, setCompany] = useState(DEFAULT_COMPANY);
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

    const fetchProductSets = async () => {
      try {
        const snapshot = await getDocs(collection(db, "productSets"));
        const setList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProductSets([DEFAULT_SET, ...setList]);
      } catch (err) {
        console.error("Failed to load product sets:", err);
        message.error("Failed to load product sets");
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

    const fetchNextInvoiceNo = async () => {
      try {
        const today = new Date();
        const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        const fyStart = new Date(fyStartYear, 3, 1);       // April 1
        const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59); // March 31

        const isInCurrentFY = (dateStr) => {
          if (!dateStr) return false;
          const [day, month, year] = dateStr.split("/").map(Number);
          const d = new Date(year, month - 1, day);
          return d >= fyStart && d <= fyEnd;
        };

        const snapshot = await getDocs(collection(db, "invoices"));
        let max = 0;
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (isInCurrentFY(data.date)) {
            const num = parseInt(data.invoiceNo, 10);
            if (!isNaN(num) && num > max) max = num;
          }
        });
        setInvoiceNo(String(max + 1).padStart(4, "0"));
      } catch (err) {
        console.error("Failed to fetch invoice number:", err);
      }
    };

    fetchSalespersons();
    fetchProducts();
    fetchProductSets();
    fetchCustomers();
    fetchNextInvoiceNo();
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
  
  const downloadPDF = async () => {
    if (selected.length === 0) {
      alert("Please select at least one product before downloading.");
      return;
    }
  
    const pdfItems = selected.map((item) => ({ ...item, rate: item.price }));
    const { subtotal, discountAmount, total } = await generateInvoicePdf({
      company,
      buyer,
      invoiceNo,
      date,
      orderNo,
      salesperson,
      gst,
      items: pdfItems,
      discountPercent,
    });

    // 🔥 POST Invoice to Firestore
    // Utility to safely return null if value is undefined
    const safeValue = (value) => (value !== undefined ? value : null);

    // Distinct product sets used across the billed items
    const usedSetIds = [...new Set(selected.map((item) => getProductSetId(item)))];

    const invoiceData = {
      invoiceNo: safeValue(invoiceNo),
      date: safeValue(date),
      company: { ...company },
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
      productSets: usedSetIds.map((id) => ({
        id,
        name: safeValue(productSets.find((s) => s.id === id)?.name),
      })),
      gstIncluded: gst,
      subtotal: Number(subtotal.toFixed(2)),
      discountPercent: Number(discountPercent) || 0,
      discountAmount: Number(discountAmount.toFixed(2)),
      finalAmount: Number(total.toFixed(2)),
      items: selected.map((item) => ({
        id: safeValue(item.id),
        name: safeValue(item.name),
        setId: getProductSetId(item),
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
  };

  const columns = [
    { title: "Product", dataIndex: "name" },
    {
      title: "Product Set",
      render: (_, record) => productSets.find((s) => s.id === getProductSetId(record))?.name || "-",
    },
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

  const totals = calculateTotals(
    selected.reduce((sum, p) => sum + p.price * p.quantity, 0),
    discountPercent,
    gst
  );

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
          <Input value={invoiceNo} readOnly />
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
        style={{ width: 200, marginRight: 12 }}
        value={productSetId}
        onChange={setProductSetId}
        options={productSets.map((s) => ({ label: s.name, value: s.id }))}
      />

      <Select
        showSearch
        style={{ width: 300 }}
        placeholder="Select Product"
        optionFilterProp="label"
        value={null}
        onSelect={addProduct}
        filterOption={(input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
        }
        options={products.filter((p) => getProductSetId(p) === productSetId).map((p) => ({
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
            Discount{" "}
            <InputNumber
              min={0}
              max={100}
              precision={2}
              addonAfter="%"
              style={{ width: 130 }}
              value={discountPercent}
              onChange={(val) => setDiscountPercent(val || 0)}
            />
          </Col>
          <Col>
            {totals.discountAmount > 0 && (
              <span style={{ marginRight: 12 }}>Discount: -₹{totals.discountAmount.toFixed(2)}</span>
            )}
            <strong>Total: ₹{totals.total.toFixed(2)}</strong>
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
