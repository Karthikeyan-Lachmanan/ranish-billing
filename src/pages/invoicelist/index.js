import dynamic from "next/dynamic";

const InvoiceListPage = dynamic(() => import("../../ui/InvoiceList"), {ssr: false});

export default InvoiceListPage;