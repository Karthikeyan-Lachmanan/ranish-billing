import dynamic from "next/dynamic";

const ProductsPage = dynamic(() => import("../../ui/Products"), { ssr: false });

export default ProductsPage;