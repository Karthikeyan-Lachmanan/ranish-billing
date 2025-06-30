import dynamic from "next/dynamic";

const CustomersPage = dynamic(() => import("../../ui/Customers"), {ssr: false});

export default CustomersPage;