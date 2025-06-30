import dynamic from "next/dynamic";

const SalesPersonPage = dynamic(() => import("../../ui/SalesPerson"), {ssr: false});

export default SalesPersonPage;