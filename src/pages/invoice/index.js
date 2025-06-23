import dynamic from "next/dynamic";

const InvoicePage = dynamic(() => import("../../ui/Invoice"), {ssr: false});

export default InvoicePage;