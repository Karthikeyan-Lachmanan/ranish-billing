import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ranishLogo from "@/ui/ranishLogo.png";

export const DEFAULT_COMPANY = {
  name: "Sri Venkateshwara Dairy Foods",
  address: "OLD NO32/iD1, New No 18, Amudurmedu, Soorancheri post, Avadi, Chennai - 600072",
  fssai: "12421023001134",
  gstin: "33IKAPS6023R1ZL",
  state: "Tamilnadu",
  phone: "9489881484",
};

const ITEMS_PER_PAGE = 25;
const PAGE_LEFT = 14;
const PAGE_RIGHT = 200;

// Logo source is 587x273; keep that aspect ratio when drawing
const LOGO_WIDTH = 36;
const LOGO_HEIGHT = LOGO_WIDTH * (273 / 587);

let logoDataUrlPromise = null;

// jsPDF needs the image as a data URL; fetch it once and reuse for every invoice
const loadLogo = () => {
  if (!logoDataUrlPromise) {
    const url = ranishLogo?.src || ranishLogo;
    logoDataUrlPromise = fetch(url)
      .then((res) => res.blob())
      .then((blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .catch((err) => {
        console.error("Failed to load invoice logo:", err);
        logoDataUrlPromise = null;
        return null;
      });
  }
  return logoDataUrlPromise;
};

export const numberToWords = (num) => {
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

// Discount is a percentage of the item subtotal, applied before GST
export const calculateTotals = (subtotal, discountPercent, gst) => {
  const discountAmount = subtotal * ((Number(discountPercent) || 0) / 100);
  const taxableValue = subtotal - discountAmount;
  const gstAmount = gst ? taxableValue * 0.05 : 0;
  const total = taxableValue + gstAmount;
  return { subtotal, discountAmount, taxableValue, gstAmount, total };
};

/**
 * Builds and downloads the invoice PDF.
 * items: [{ name, hsnCode, mrp, quantity, rate }]
 */
export const generateInvoicePdf = async ({
  company = DEFAULT_COMPANY,
  buyer = {},
  invoiceNo = "",
  date = "",
  orderNo = "",
  salesperson = {},
  gst = false,
  items = [],
  discountPercent = 0,
  fileName = "invoice.pdf",
}) => {
  const logo = await loadLogo();

  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;

  const rows = items.map((p, i) => [
    i + 1,
    p.name,
    p.hsnCode || "21050000",
    p.mrp ?? "",
    p.quantity,
    Number(p.rate).toFixed(2),
    (Number(p.rate) * p.quantity).toFixed(2),
  ]);

  const subtotal = rows.reduce((sum, row) => sum + parseFloat(row[6]), 0);
  const { discountAmount, taxableValue, gstAmount, total } = calculateTotals(subtotal, discountPercent, gst);
  const roundedTotal = Math.round(total);
  const roundOffAmount = (roundedTotal - total).toFixed(2);

  const summaryRow = (label, value, bold = false) => [
    "",
    { content: label, styles: { halign: "right", fontStyle: "bold" } },
    "",
    "",
    "",
    "",
    { content: value, styles: { halign: "right", fontStyle: bold ? "bold" : "normal" } },
  ];

  // Summary rows sit below the item slots, so they never take space from the 25 items
  const summaryRows = [
    ...(discountAmount > 0 ? [summaryRow("Discount", `-${discountAmount.toFixed(2)}`)] : []),
    ...(gst
      ? [
          summaryRow("Output CGST 2.5%", (gstAmount / 2).toFixed(2)),
          summaryRow("Output SGST 2.5%", (gstAmount / 2).toFixed(2)),
        ]
      : []),
    summaryRow("Round Off", roundOffAmount),
    summaryRow("Total Amount", total.toFixed(0), true),
  ];

  const renderHeader = () => {
    // Title
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(gst ? "Tax Invoice" : "Invoice", 105, 12, { align: "center" });

    const blockTop = 17;

    // Logo (left)
    if (logo) {
      doc.addImage(logo, "PNG", PAGE_LEFT, blockTop, LOGO_WIDTH, LOGO_HEIGHT);
    }

    // Company details (middle), wrapped so they never run into the invoice box
    const companyX = logo ? PAGE_LEFT + LOGO_WIDTH + 4 : PAGE_LEFT;
    const companyWidth = 148 - companyX;
    let companyY = blockTop + 4;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(company.name || "", companyX, companyY);
    companyY += 4.5;

    doc.setFontSize(8.5);
    doc.setFont(undefined, "normal");
    doc.splitTextToSize(company.address || "", companyWidth).forEach((line) => {
      doc.text(line, companyX, companyY);
      companyY += 3.8;
    });
    const companyLines = [
      [company.fssai && `FSSAI No: ${company.fssai}`, company.gstin && `GSTIN: ${company.gstin}`],
      [company.state && `State: ${company.state}`, company.phone && `Phone: ${company.phone}`],
    ];
    companyLines.forEach((parts) => {
      const line = parts.filter(Boolean).join("   |   ");
      if (line) {
        doc.text(line, companyX, companyY);
        companyY += 3.8;
      }
    });

    // Invoice number and date box (right)
    const boxX = 150;
    const boxWidth = PAGE_RIGHT - boxX;
    const boxHeight = 18;
    doc.setDrawColor(0);
    doc.rect(boxX, blockTop, boxWidth, boxHeight);
    doc.line(boxX, blockTop + boxHeight / 2, PAGE_RIGHT, blockTop + boxHeight / 2);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Invoice No.", boxX + 2, blockTop + 5.8);
    doc.text("Date", boxX + 2, blockTop + boxHeight / 2 + 5.8);
    doc.setFont(undefined, "normal");
    doc.text(String(invoiceNo || ""), PAGE_RIGHT - 2, blockTop + 5.8, { align: "right" });
    doc.text(String(date || ""), PAGE_RIGHT - 2, blockTop + boxHeight / 2 + 5.8, { align: "right" });

    const dividerY = Math.max(companyY, blockTop + LOGO_HEIGHT, blockTop + boxHeight) + 2;
    doc.line(PAGE_LEFT, dividerY, PAGE_RIGHT, dividerY);

    // Buyer details (left)
    const sectionTop = dividerY + 6;
    let buyerY = sectionTop;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Buyer Details:", PAGE_LEFT, buyerY);
    buyerY += 5;

    doc.setFontSize(9);
    doc.text(buyer.name || "", PAGE_LEFT, buyerY);
    buyerY += 4.5;

    doc.setFont(undefined, "normal");
    doc.splitTextToSize(buyer.address || "", 105).forEach((line) => {
      doc.text(line, PAGE_LEFT, buyerY);
      buyerY += 4.2;
    });
    if (buyer.gstin) { doc.text(`GSTIN: ${buyer.gstin}`, PAGE_LEFT, buyerY); buyerY += 4.2; }
    if (buyer.state) { doc.text(`State: ${buyer.state}`, PAGE_LEFT, buyerY); buyerY += 4.2; }
    if (buyer.email) { doc.text(`Phone: ${buyer.email}`, PAGE_LEFT, buyerY); buyerY += 4.2; }

    // Order and salesperson details (right), aligned with the buyer block
    const orderLabelX = 130;
    const orderValueX = 156;
    let orderY = sectionTop;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Order Details:", orderLabelX, orderY);
    orderY += 5;

    doc.setFontSize(9);
    [
      ["Order No.", orderNo || ""],
      ["Sales Person", salesperson?.name || ""],
      ["Phone", salesperson?.phone || ""],
    ].forEach(([label, value]) => {
      doc.setFont(undefined, "bold");
      doc.text(label, orderLabelX, orderY);
      doc.setFont(undefined, "normal");
      doc.text(`: ${value}`, orderValueX, orderY);
      orderY += 4.5;
    });

    return Math.max(buyerY, orderY) + 1;
  };

  // Split items into pages of ITEMS_PER_PAGE; always render at least one page
  const pageCount = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));
  let finalY = 0;

  for (let page = 0; page < pageCount; page++) {
    if (page > 0) doc.addPage();

    const headerY = renderHeader();
    const pageItems = rows.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
    const fillerRows = Array.from({ length: ITEMS_PER_PAGE - pageItems.length }, () => ["", "", "", "", "", "", ""]);
    const isLastPage = page === pageCount - 1;
    const pageRows = [...pageItems, ...fillerRows, ...(isLastPage ? summaryRows : [])];

    autoTable(doc, {
      startY: headerY,
      head: [["S.No", "Description of Goods", "HSN/SAC", "MRP", "Quantity", "Rate", "Amount"]],
      body: pageRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: { top: 0.8, bottom: 0.8, left: 1, right: 1 }, minCellHeight: 4.8 },
      headStyles: { halign: "center" },
      margin: { left: PAGE_LEFT, right: 210 - PAGE_RIGHT },
      columnStyles: {
        0: { halign: "center", cellWidth: 11 },
        2: { halign: "center", cellWidth: 20 },
        3: { halign: "right", cellWidth: 16 },
        4: { halign: "center", cellWidth: 17 },
        5: { halign: "right", cellWidth: 20 },
        6: { halign: "right", cellWidth: 24 },
      },
    });

    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(`Page ${page + 1} of ${pageCount}`, PAGE_RIGHT, pageHeight - 8, { align: "right" });

    finalY = doc.lastAutoTable.finalY + 10;
  }

  doc.setFontSize(8);
  doc.setFont(undefined, "bold");
  doc.text("Total Amount (In Words):", PAGE_LEFT, finalY - 4);
  doc.setFont(undefined, "normal");

  const totalAmountInWords = numberToWords(total);
  const wordsLines = doc.splitTextToSize(totalAmountInWords, 80);

  wordsLines.forEach((line, index) => {
    doc.text(line, PAGE_LEFT, finalY + (index * 6));
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

  let nextSectionY;

  if (gst) {
    // GST Table if GST is included
    autoTable(doc, {
      startY: finalY + 2,
      margin: { left: PAGE_LEFT },
      tableWidth: 90,
      theme: "grid",
      head: [["HSN/SAC", "Taxable Value", "CGST", "CGST Amt", "SGST", "SGST Amt", "Total Tax"]],
      body: [[
        "21050000",
        taxableValue.toFixed(2),
        "2.5%",
        (gstAmount / 2).toFixed(2),
        "2.5%",
        (gstAmount / 2).toFixed(2),
        gstAmount.toFixed(2),
      ]],
      styles: { fontSize: 8, cellPadding: 1 },
      columnStyles: { 2: { halign: "center" }, 4: { halign: "center" } },
    });

    nextSectionY = Math.max(doc.lastAutoTable.finalY + 4, finalY + 22);

    doc.setFontSize(6);
    doc.text(`GST Amount in Words: ${numberToWords(gstAmount)}`, PAGE_LEFT, nextSectionY);
    doc.setFontSize(10);
    nextSectionY += 8;
  } else {
    // When GST is not included, move up the declaration
    nextSectionY = finalY + 26;
  }

  // Declaration and Footer
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  doc.text("Declaration", PAGE_LEFT, nextSectionY);
  doc.text(`for ${company.name || ""}`, PAGE_RIGHT, nextSectionY, { align: "right" });
  nextSectionY += 4.5;

  doc.setFont(undefined, "normal");
  doc.text("We declare that this invoice reflects the actual price of", PAGE_LEFT, nextSectionY);
  doc.text("the goods described and that all particulars are true and correct.", PAGE_LEFT, nextSectionY + 4);
  doc.text("Authorised Signatory", PAGE_RIGHT, nextSectionY + 8, { align: "right" });
  nextSectionY += 12;

  doc.setFontSize(8);
  doc.text("This is a Computer Generated Invoice", 105, nextSectionY, { align: "center" });

  try {
    doc.save(fileName);
  } catch (err) {
    const blob = doc.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return { subtotal, discountAmount, taxableValue, gstAmount, total };
};
