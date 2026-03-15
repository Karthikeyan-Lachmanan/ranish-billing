import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Adjust the path if needed
import { Table, message, Input, Select, Button, Space, Modal, Form, Checkbox, InputNumber, Tag } from "antd";

const { Option } = Select;

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchBy, setSearchBy] = useState("invoiceNo");
  const [searchTerm, setSearchTerm] = useState("");

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
        // Sort by date in descending order (latest first)
        .sort((a, b) => {
          const parseDate = (dateStr) => {
            if (!dateStr) return 0;
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JS
              const year = parseInt(parts[2], 10);
              return new Date(year, month, day).getTime();
            }
            return 0; // Fallback if format is weird
          };
          return parseDate(b.date) - parseDate(a.date);
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

  // Effect to automatically filter when search term or criteria changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setInvoices(allInvoices);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = allInvoices.filter(inv => {
      let valueToSearch = "";
      if (searchBy === "invoiceNo") valueToSearch = inv.invoiceNo;
      if (searchBy === "customerName") valueToSearch = inv.customer?.name;
      if (searchBy === "salespersonName") valueToSearch = inv.salesperson?.name;

      if (!valueToSearch) return false;

      // Perform case-insensitive partial match
      return String(valueToSearch).toLowerCase().includes(term);
    });

    setInvoices(filtered);
  }, [searchTerm, searchBy, allInvoices]);

  const handleSearch = () => {
    // Auto-filtering handled by useEffect
  };

  const handleReset = () => {
    setSearchTerm("");
    setSearchBy("invoiceNo");
  };

  const openSettleModal = (record) => {
    setSettlingInvoice(record);
    setIsFullSettlement(true);
    form.setFieldsValue({
      isFullSettlement: true,
      amount: record.balanceAmount,
      method: "Cash" // default
    });
    setIsModalVisible(true);
  };

  const handleFullSettlementChange = (e) => {
    const checked = e.target.checked;
    setIsFullSettlement(checked);
    if (checked && settlingInvoice) {
      form.setFieldsValue({ amount: settlingInvoice.balanceAmount });
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

      message.success(`Successfully settled ₹${paymentAmount}.`);
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
    { title: "Final Amount (₹)", dataIndex: "finalAmount", key: "finalAmount" },
    {
      title: "Balance (₹)",
      dataIndex: "balanceAmount",
      key: "balanceAmount",
      render: (amount) => <b>₹{amount}</b>
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
      <Space style={{ marginBottom: 16 }}>
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
              { title: 'Amount', dataIndex: 'amount', key: 'amount', render: amt => `₹${amt}` },
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
            <strong>Total Bill Amount:</strong> ₹{settlingInvoice?.finalAmount} <br/>
            <strong>Remaining Balance:</strong> <span style={{ color: 'red' }}>₹{settlingInvoice?.balanceAmount}</span>
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
              <Option value="Bank Transfer">Bank Transfer</Option>
              <Option value="Cheque">Cheque</Option>
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
    </div>
  );
}

export default InvoiceList;