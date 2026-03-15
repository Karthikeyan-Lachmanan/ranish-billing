import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Adjust the path if needed
import { Select, Card, Row, Col, Typography, message, Spin, Button } from "antd";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const { Title } = Typography;
const { Option } = Select;

// Helper to parse "DD/MM/YYYY" format
const parseDateString = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
};

// Colors for the pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6666'];

export default function DashboardPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default to current month (0-indexed)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  // Default to current year
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "invoices"));
        const invoicesList = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((invoice) => invoice.gstIncluded === true)
          // Parse date for native JS comparisons
          .map(invoice => ({
            ...invoice,
            parsedDate: parseDateString(invoice.date)
          }));

        setInvoices(invoicesList);
      } catch (err) {
        console.error("Failed to load invoices:", err);
        message.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // 1. Process data for the Yearly Bar Chart (Group by Month for the selected year)
  const yearlyChartData = useMemo(() => {
    // Initialize 12 months with 0 total
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const dataObj = months.reduce((acc, month) => {
      acc[month] = 0;
      return acc;
    }, {});

    invoices.forEach((inv) => {
      if (inv.parsedDate && inv.parsedDate.getFullYear() === selectedYear) {
        const monthName = months[inv.parsedDate.getMonth()];
        // ensure finalAmount is treated as a number
        const amt = parseFloat(inv.finalAmount) || 0;
        dataObj[monthName] += amt;
      }
    });

    return Object.keys(dataObj).map(month => ({
      name: month,
      Total: dataObj[month]
    }));
  }, [invoices, selectedYear]);


  // 2. Process data for the Pie Chart (Group by Salesperson for the selected month/year)
  const salespersonChartData = useMemo(() => {
    const dataObj = {};

    invoices.forEach((inv) => {
      if (
        inv.parsedDate &&
        inv.parsedDate.getFullYear() === selectedYear &&
        inv.parsedDate.getMonth() === selectedMonth
      ) {
        const spName = inv.salesperson?.name || "Unknown";
        const amt = parseFloat(inv.finalAmount) || 0;

        if (!dataObj[spName]) {
          dataObj[spName] = 0;
        }
        dataObj[spName] += amt;
      }
    });

    return Object.keys(dataObj).map(name => ({
      name,
      value: dataObj[name]
    })).sort((a, b) => b.value - a.value); // sort largest first
  }, [invoices, selectedMonth, selectedYear]);

  // Extract unique years from data for the Year selector
  const availableYears = useMemo(() => {
    const years = new Set(invoices.map(inv => inv.parsedDate?.getFullYear()).filter(Boolean));
    const currentYear = new Date().getFullYear();
    years.add(currentYear); // Always include current year
    return Array.from(years).sort((a, b) => b - a); // descending
  }, [invoices]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const [exportLoading, setExportLoading] = useState(false);
  const [exportMonth, setExportMonth] = useState(null); // null means all months
  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      // Fetch ALL invoices (not just gstIncluded)
      const snapshot = await getDocs(collection(db, "invoices"));
      const allInvoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter by selected month/year
      const filtered = allInvoices.filter(inv => {
        const parsed = parseDateString(inv.date);
        if (!parsed) return false;
        const yearMatch = parsed.getFullYear() === exportYear;
        const monthMatch = exportMonth === null || parsed.getMonth() === exportMonth;
        return yearMatch && monthMatch;
      });

      if (filtered.length === 0) {
        message.warning("No invoices found for the selected period.");
        setExportLoading(false);
        return;
      }

      const rows = filtered.map(inv => {
        const finalAmount = parseFloat(inv.finalAmount) || 0;
        const gstIncluded = inv.gstIncluded === true;

        // If GST is included in finalAmount, taxable value = finalAmount / 1.05
        // otherwise taxable value = finalAmount
        const taxableValue = gstIncluded
          ? parseFloat((finalAmount / 1.05).toFixed(2))
          : finalAmount;

        // SGST/CGST at 2.5% each on taxable value, only if GST is included
        const sgst = gstIncluded ? parseFloat((taxableValue * 0.025).toFixed(2)) : 0;
        const cgst = gstIncluded ? parseFloat((taxableValue * 0.025).toFixed(2)) : 0;
        const totalTax = parseFloat((sgst + cgst).toFixed(2));

        // Sum all item quantities, then multiply by 1.2 for litres
        const totalQty = Array.isArray(inv.items)
          ? inv.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)
          : 0;
        const totalLitres = parseFloat((totalQty * 1.2).toFixed(2));

        return {
          "Cust GST No": inv.customer?.gstin || "-",
          "Customer Name": inv.customer?.name || "-",
          "Invoice No": inv.invoiceNo || "-",
          "Date": inv.date || "-",
          "HSN Code": "21050000",
          "Total Quantity": totalQty,
          "Total Quantity in Litre": totalLitres,
          "Taxable Value (₹)": taxableValue,
          "SGST (2.5%)": sgst,
          "CGST (2.5%)": cgst,
          "Total Tax": totalTax,
          "Total Invoice Value (₹)": finalAmount,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

      const monthLabel = exportMonth !== null ? `_${monthNames[exportMonth]}` : "_AllMonths";
      XLSX.writeFile(workbook, `invoices_${exportYear}${monthLabel}.xlsx`);
      message.success("Excel file downloaded successfully!");
    } catch (err) {
      console.error("Export failed:", err);
      message.error("Failed to export data.");
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading Dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Analytics Dashboard</Title>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Select
            value={exportYear}
            onChange={setExportYear}
            style={{ width: 100 }}
          >
            {availableYears.map(year => (
              <Option key={year} value={year}>{year}</Option>
            ))}
          </Select>
          <Select
            value={exportMonth}
            onChange={setExportMonth}
            style={{ width: 140 }}
            placeholder="All Months"
            allowClear
            onClear={() => setExportMonth(null)}
          >
            {monthNames.map((name, index) => (
              <Option key={index} value={index}>{name}</Option>
            ))}
          </Select>
          <Button
            type="primary"
            onClick={handleExportExcel}
            loading={exportLoading}
          >
            📥 Export to Excel
          </Button>
        </div>
      </div>


      <Row gutter={[16, 16]}>
        {/* YEARLY REVENUE BAR CHART */}
        <Col span={24}>
          <Card
            title={`Yearly Revenue Overview (${selectedYear})`}
            extra={
              <Select
                value={selectedYear}
                onChange={setSelectedYear}
                style={{ width: 120 }}
              >
                {availableYears.map(year => (
                  <Option key={year} value={year}>{year}</Option>
                ))}
              </Select>
            }
          >
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart
                  data={yearlyChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="Total" fill="#8884d8" name="Total Revenue (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* MONTHLY PIE CHART (SALESPERSON BREAKDOWN) */}
        <Col span={24} lg={12}>
          <Card
            title={`Sales by Person - ${monthNames[selectedMonth]} ${selectedYear}`}
            extra={
              <Select
                value={selectedMonth}
                onChange={setSelectedMonth}
                style={{ width: 150 }}
              >
                {monthNames.map((name, index) => (
                  <Option key={index} value={index}>{name}</Option>
                ))}
              </Select>
            }
          >
            <div style={{ width: '100%', height: 400 }}>
              {salespersonChartData.length > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={salespersonChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value, percent }) => `${name}: ₹${value.toLocaleString()} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {salespersonChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999' }}>
                  No sales data available for {monthNames[selectedMonth]} {selectedYear}.
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
