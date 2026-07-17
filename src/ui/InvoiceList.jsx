import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Adjust the path if needed
import { Table, message, Input, Select, Button, Space, Modal, Form, Checkbox, InputNumber, Tag, DatePicker, Card, Row, Col, Statistic } from "antd";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

const { Option } = Select;
const { RangePicker } = DatePicker;

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatCurrency = (value) => (parseFloat(value) || 0).toFixed(2);

// Meter fill color by how much of the billed amount is still pending
const getPendingSeverityColor = (ratio) => {
  if (ratio >= 0.6) return "#d03b3b"; // critical
  if (ratio >= 0.3) return "#fab219"; // warning
  return "#0ca30c"; // good
};

const parseInvoiceDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? null : date;
};

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchBy, setSearchBy] = useState("invoiceNo");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState(null);
  const [filterYear, setFilterYear] = useState(null);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterSalesperson, setFilterSalesperson] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Customer List Export Modal State
  const [isCustomerListModalVisible, setIsCustomerListModalVisible] = useState(false);
  const [customerListDateRange, setCustomerListDateRange] = useState(null);
  const [customerListSalespersons, setCustomerListSalespersons] = useState([]);
  const [customerListLoading, setCustomerListLoading] = useState(false);

  // Settlement Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [settlingInvoice, setSettlingInvoice] = useState(null);
  const [settlingLoading, setSettlingLoading] = useState(false);
  const [isFullSettlement, setIsFullSettlement] = useState(true);
  
  const [form] = Form.useForm();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const q = collection(db, "invoices");
      const snapshot = await getDocs(q);
      const invoicesList = snapshot.docs
        .map(doc => {
          const data = doc.data();
          // Backward compatibility for older records that don't have these fields
          const settledAmount = data.settledAmount || 0;
          const finalAmount = parseFloat(data.finalAmount) || 0;
          const balanceAmount = data.balanceAmount !== undefined ? data.balanceAmount : finalAmount;
          const paymentStatus = data.paymentStatus || (balanceAmount <= 0 ? "Completed" : "Pending");
          const finalSettlementDate = data.finalSettlementDate || null;

          return {
            id: doc.id,
            ...data,
            settledAmount,
            balanceAmount,
            paymentStatus,
            finalSettlementDate,
          };
        })
        .filter(invoice => invoice.gstIncluded === true)
        .sort((a, b) => {
          const isNumeric = (val) => /^\d+$/.test(String(val || ""));
          const numA = isNumeric(a.invoiceNo) ? parseInt(a.invoiceNo, 10) : null;
          const numB = isNumeric(b.invoiceNo) ? parseInt(b.invoiceNo, 10) : null;

          // Both numeric: higher number first
          if (numA !== null && numB !== null) return numB - numA;
          // Only A is numeric: A comes first
          if (numA !== null) return -1;
          // Only B is numeric: B comes first
          if (numB !== null) return 1;
          // Both alphanumeric: sort by Firestore doc ID (creation order, newest first)
          return b.id.localeCompare(a.id);
        });

      setAllInvoices(invoicesList);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to automatically filter when search term, criteria, month, or year changes
  useEffect(() => {
    let filtered = allInvoices;

    if (filterYear || filterMonth) {
      filtered = filtered.filter(inv => {
        if (!inv.date) return false;
        const parts = inv.date.split("/");
        if (parts.length !== 3) return false;
        const invMonth = parseInt(parts[1], 10);
        const invYear = parseInt(parts[2], 10);
        if (filterYear && invYear !== filterYear) return false;
        if (filterMonth && invMonth !== filterMonth) return false;
        return true;
      });
    }

    if (filterStatus && filterStatus.length > 0) {
      filtered = filtered.filter(inv => filterStatus.includes(inv.paymentStatus));
    }

    if (filterSalesperson) {
      filtered = filtered.filter(inv => inv.salesperson?.name === filterSalesperson);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv => {
        let valueToSearch = "";
        if (searchBy === "invoiceNo") valueToSearch = inv.invoiceNo;
        if (searchBy === "customerName") valueToSearch = inv.customer?.name;
        if (searchBy === "salespersonName") valueToSearch = inv.salesperson?.name;
        if (!valueToSearch) return false;
        return String(valueToSearch).toLowerCase().includes(term);
      });
    }

    setInvoices(filtered);
  }, [searchTerm, searchBy, filterMonth, filterYear, filterStatus, filterSalesperson, allInvoices]);

  const handleSearch = () => {
    // Auto-filtering handled by useEffect
  };

  const handleReset = () => {
    setSearchTerm("");
    setSearchBy("invoiceNo");
    setFilterMonth(null);
    setFilterYear(null);
    setFilterStatus([]);
    setFilterSalesperson(null);
  };

  const availableYears = [...new Set(
    allInvoices
      .map(inv => inv.date?.split("/")?.[2])
      .filter(Boolean)
      .map(Number)
  )].sort((a, b) => b - a);

  const availableSalespersons = [...new Set(
    allInvoices
      .map(inv => inv.salesperson?.name)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  const today = dayjs();
  const currentYear = today.year();
  const currentMonthNum = today.month() + 1;

  let pendingThisMonth = 0;
  let billedThisMonth = 0;
  let pendingThisYear = 0;
  let billedThisYear = 0;

  allInvoices.forEach(inv => {
    const invDate = parseInvoiceDate(inv.date);
    if (!invDate || invDate.getFullYear() !== currentYear) return;
    const balance = Math.max(parseFloat(inv.balanceAmount) || 0, 0);
    const finalAmount = parseFloat(inv.finalAmount) || 0;

    billedThisYear += finalAmount;
    pendingThisYear += balance;

    if (invDate.getMonth() + 1 === currentMonthNum) {
      billedThisMonth += finalAmount;
      pendingThisMonth += balance;
    }
  });

  const pendingRatioThisMonth = billedThisMonth > 0 ? pendingThisMonth / billedThisMonth : 0;
  const pendingRatioThisYear = billedThisYear > 0 ? pendingThisYear / billedThisYear : 0;

  const handleExportExcel = () => {
    setExportLoading(true);
    try {
      if (invoices.length === 0) {
        message.warning("No invoices to export.");
        return;
      }

      const rows = invoices.map(inv => ({
        "Invoice No": inv.invoiceNo || "-",
        "Date": inv.date || "-",
        "Customer Name": inv.customer?.name || "-",
        "Customer Address": inv.customer?.address || "-",
        "Sales Person": inv.salesperson?.name || "-",
        "Final Amount (₹)": formatCurrency(inv.finalAmount),
        "Settled Amount (₹)": formatCurrency(inv.settledAmount),
        "Balance (₹)": formatCurrency(inv.balanceAmount),
        "Status": inv.paymentStatus || "-",
        "Settled On": inv.finalSettlementDate ? new Date(inv.finalSettlementDate).toLocaleDateString() : "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
      XLSX.writeFile(workbook, `invoices_${Date.now()}.xlsx`);
      message.success("Excel file downloaded successfully!");
    } catch (err) {
      console.error("Export failed:", err);
      message.error("Failed to export data.");
    } finally {
      setExportLoading(false);
    }
  };

  const disableCustomerListDate = (current) => {
    if (!current) return false;
    const rangeStart = dayjs().subtract(1, "month").startOf("month");
    const rangeEnd = dayjs().endOf("month");
    return current < rangeStart || current > rangeEnd;
  };

  const handleDownloadCustomerList = () => {
    if (!customerListSalespersons || customerListSalespersons.length === 0) {
      message.error("Please select at least one sales person.");
      return;
    }

    setCustomerListLoading(true);
    try {
      let filtered = allInvoices.filter(inv =>
        customerListSalespersons.includes(inv.salesperson?.name)
      );

      if (customerListDateRange && customerListDateRange[0] && customerListDateRange[1]) {
        const start = customerListDateRange[0].startOf("day").toDate();
        const end = customerListDateRange[1].endOf("day").toDate();
        filtered = filtered.filter(inv => {
          const invDate = parseInvoiceDate(inv.date);
          return invDate && invDate >= start && invDate <= end;
        });
      }

      if (filtered.length === 0) {
        message.error("No data available to download for the selected date range and sales person(s).");
        return;
      }

      const rows = filtered.map(inv => ({
        "Date": inv.date || "-",
        "Customer Name": inv.customer?.name || "-",
        "Customer Address": inv.customer?.address || "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
      XLSX.writeFile(workbook, `customer_list_${Date.now()}.xlsx`);
      message.success("Customer list downloaded successfully!");
      setIsCustomerListModalVisible(false);
      setCustomerListDateRange(null);
      setCustomerListSalespersons([]);
    } catch (err) {
      console.error("Customer list export failed:", err);
      message.error("Failed to export customer list.");
    } finally {
      setCustomerListLoading(false);
    }
  };

  const openSettleModal = (record) => {
    setSettlingInvoice(record);
    setIsFullSettlement(true);
    form.setFieldsValue({
      isFullSettlement: true,
      amount: Number(formatCurrency(record.balanceAmount)),
      method: "Cash" // default
    });
    setIsModalVisible(true);
  };

  const handleFullSettlementChange = (e) => {
    const checked = e.target.checked;
    setIsFullSettlement(checked);
    if (checked && settlingInvoice) {
      form.setFieldsValue({ amount: Number(formatCurrency(settlingInvoice.balanceAmount)) });
    }
  };

  const onSettleSubmit = async (values) => {
    if (!settlingInvoice) return;
    
    setSettlingLoading(true);
    try {
      const paymentAmount = parseFloat(values.amount);
      const currentSettled = settlingInvoice.settledAmount || 0;
      const currentBalance = settlingInvoice.balanceAmount;
      const finalAmount = parseFloat(settlingInvoice.finalAmount);

      if (paymentAmount > currentBalance) {
        message.error("Payment amount cannot safely exceed the remaining balance.");
        setSettlingLoading(false);
        return;
      }

      const newSettledAmount = currentSettled + paymentAmount;
      const newBalance = finalAmount - newSettledAmount;
      const newStatus = newBalance <= 0 ? "Completed" : "Partial";

      const paymentRecord = {
        amount: paymentAmount,
        method: values.method,
        date: new Date().toISOString(),
      };

      const invoiceRef = doc(db, "invoices", settlingInvoice.id);

      const updateData = {
        settledAmount: newSettledAmount,
        balanceAmount: newBalance,
        paymentStatus: newStatus,
        payments: arrayUnion(paymentRecord)
      };

      if (newStatus === "Completed" && !settlingInvoice.finalSettlementDate) {
        updateData.finalSettlementDate = new Date().toISOString();
      }

      await updateDoc(invoiceRef, updateData);

      message.success(`Successfully settled ₹${formatCurrency(paymentAmount)}.`);
      setIsModalVisible(false);
      form.resetFields();
      
      // Refresh list to show new data
      fetchInvoices();
    } catch (error) {
      console.error("Error settling bill:", error);
      message.error("Failed to settle bill.");
    } finally {
      setSettlingLoading(false);
    }
  };

  const columns = [
    { title: "Invoice No", dataIndex: "invoiceNo", key: "invoiceNo" },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (text) => text || "-",
      sorter: (a, b) => {
        const parseDate = (dateStr) => {
          if (!dateStr) return 0;
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day).getTime();
          }
          return 0;
        };
        return parseDate(a.date) - parseDate(b.date);
      },
      defaultSortOrder: 'descend' // Sort descending by default
    },
    { title: "Customer Name", dataIndex: ["customer", "name"], key: "customerName" },
    { title: "Customer Address", dataIndex: ["customer", "address"], key: "customerAddress" },
    { title: "Sales Person", dataIndex: ["salesperson", "name"], key: "salespersonName" },
    {
      title: "Final Amount (₹)",
      dataIndex: "finalAmount",
      key: "finalAmount",
      render: (amount) => formatCurrency(amount)
    },
    {
      title: "Balance (₹)",
      dataIndex: "balanceAmount",
      key: "balanceAmount",
      render: (amount) => <b>₹{formatCurrency(amount)}</b>
    },
    {
      title: "Status",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      render: (status) => {
        let color = "red";
        if (status === "Completed") color = "green";
        if (status === "Partial") color = "orange";
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: "Settled On",
      dataIndex: "finalSettlementDate",
      key: "finalSettlementDate",
      render: (date) => date ? new Date(date).toLocaleDateString() : "-"
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => openSettleModal(record)}
          disabled={record.paymentStatus === "Completed"}
        >
          {record.paymentStatus === "Completed" ? "Settled" : "Settle"}
        </Button>
      ),
    }
  ];

  return (
    <div style={{ padding: "2rem" }}>
      <h2>All Bills</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card size="small">
            <Statistic
              title={`Pending — ${MONTH_LABELS[currentMonthNum - 1]} ${currentYear}`}
              value={pendingThisMonth}
              precision={2}
              prefix="₹"
            />
            <div
              style={{
                marginTop: 12,
                height: 8,
                borderRadius: 4,
                background: "#e1e0d9",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(pendingRatioThisMonth, 1) * 100}%`,
                  background: getPendingSeverityColor(pendingRatioThisMonth),
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#52514e" }}>
              {Math.round(pendingRatioThisMonth * 100)}% of ₹{formatCurrency(billedThisMonth)} billed pending
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small">
            <Statistic
              title={`Pending — ${currentYear}`}
              value={pendingThisYear}
              precision={2}
              prefix="₹"
            />
            <div
              style={{
                marginTop: 12,
                height: 8,
                borderRadius: 4,
                background: "#e1e0d9",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(pendingRatioThisYear, 1) * 100}%`,
                  background: getPendingSeverityColor(pendingRatioThisYear),
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#52514e" }}>
              {Math.round(pendingRatioThisYear * 100)}% of ₹{formatCurrency(billedThisYear)} billed pending
            </div>
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          value={filterMonth}
          onChange={setFilterMonth}
          placeholder="All Months"
          allowClear
          style={{ width: 140 }}
        >
          {["January","February","March","April","May","June","July","August","September","October","November","December"]
            .map((name, i) => (
              <Option key={i + 1} value={i + 1}>{name}</Option>
            ))}
        </Select>
        <Select
          value={filterYear}
          onChange={setFilterYear}
          placeholder="All Years"
          allowClear
          style={{ width: 110 }}
        >
          {availableYears.map(year => (
            <Option key={year} value={year}>{year}</Option>
          ))}
        </Select>
        <Select
          mode="multiple"
          value={filterStatus}
          onChange={setFilterStatus}
          placeholder="All Status"
          allowClear
          maxTagCount="responsive"
          style={{ width: 200 }}
        >
          <Option value="Pending">Pending</Option>
          <Option value="Partial">Partial</Option>
          <Option value="Completed">Completed</Option>
        </Select>
        <Select
          value={filterSalesperson}
          onChange={setFilterSalesperson}
          placeholder="All Sales Persons"
          allowClear
          showSearch
          style={{ width: 180 }}
        >
          {availableSalespersons.map(name => (
            <Option key={name} value={name}>{name}</Option>
          ))}
        </Select>
        <Select
          value={searchBy}
          onChange={(value) => setSearchBy(value)}
          style={{ width: 150 }}
        >
          <Option value="invoiceNo">Invoice No</Option>
          <Option value="customerName">Customer Name</Option>
          <Option value="salespersonName">Sales Person</Option>
        </Select>
        <Input
          placeholder="Enter search term"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 250 }}
          allowClear
        />
        <Button type="primary" onClick={handleSearch}>
          Search
        </Button>
        <Button onClick={handleReset}>
          Reset
        </Button>
        <Button onClick={handleExportExcel} loading={exportLoading}>
          Download Excel
        </Button>
        <Button onClick={() => setIsCustomerListModalVisible(true)}>
          Download Customer List
        </Button>
      </Space>
      <Table
        dataSource={invoices}
        rowKey="id"
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: (record) => {
            if (!record.payments || record.payments.length === 0) {
              return <p style={{ margin: 0, color: 'gray' }}>No payment history recorded.</p>;
            }
            const paymentColumns = [
              { title: 'Date', dataIndex: 'date', key: 'date', render: d => new Date(d).toLocaleString() },
              { title: 'Amount', dataIndex: 'amount', key: 'amount', render: amt => `₹${formatCurrency(amt)}` },
              { title: 'Method', dataIndex: 'method', key: 'method' },
            ];
            return (
              <Table 
                columns={paymentColumns} 
                dataSource={record.payments} 
                pagination={false} 
                rowKey="date" 
                size="small" 
                style={{ margin: '10px 0' }}
              />
            );
          },
          rowExpandable: (record) => record.payments && record.payments.length > 0,
        }}
      />

      <Modal
        title={`Settle Bill - ${settlingInvoice?.invoiceNo}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSettleSubmit}
          style={{ marginTop: 16 }}
        >
          <div style={{ marginBottom: 16 }}>
            <strong>Total Bill Amount:</strong> ₹{formatCurrency(settlingInvoice?.finalAmount)} <br/>
            <strong>Remaining Balance:</strong> <span style={{ color: 'red' }}>₹{formatCurrency(settlingInvoice?.balanceAmount)}</span>
          </div>

          <Form.Item name="isFullSettlement" valuePropName="checked">
            <Checkbox onChange={handleFullSettlementChange}>
              Settle Full Balance Amount
            </Checkbox>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Payment Amount (₹)"
            rules={[
              { required: true, message: "Please enter an amount" },
              { type: 'number', min: 1, message: "Amount must be greater than 0" }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              disabled={isFullSettlement}
              prefix="₹"
              precision={2}
            />
          </Form.Item>

          <Form.Item
            name="method"
            label="Payment Method"
            rules={[{ required: true, message: "Please select a payment method" }]}
          >
            <Select>
              <Option value="Cash">Cash</Option>
              <Option value="Card">Card</Option>
              <Option value="UPI">UPI</Option>
              <Option value="Advance">Advance</Option>
              <Option value="Due">Due</Option>
              <Option value="DamageOrReturn">Damage or Return</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={settlingLoading}>
              Confirm Settlement
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Download Customer List"
        open={isCustomerListModalVisible}
        onCancel={() => setIsCustomerListModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>Date Range (optional)</div>
          <RangePicker
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
            value={customerListDateRange}
            onChange={setCustomerListDateRange}
            disabledDate={disableCustomerListDate}
            allowClear
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>Sales Person (required)</div>
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            placeholder="Select at least one sales person"
            value={customerListSalespersons}
            onChange={setCustomerListSalespersons}
            allowClear
            showSearch
          >
            {availableSalespersons.map(name => (
              <Option key={name} value={name}>{name}</Option>
            ))}
          </Select>
        </div>

        <div style={{ textAlign: "right" }}>
          <Button
            onClick={() => setIsCustomerListModalVisible(false)}
            style={{ marginRight: 8 }}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleDownloadCustomerList}
            loading={customerListLoading}
          >
            Download
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default InvoiceList;
