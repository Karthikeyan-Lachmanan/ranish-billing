import { getProducts, addProduct } from "@/lib/productStorage";

export default function handler(req, res) {
  debugger
  if (req.method === "GET") {
    const products = getProducts();
    res.status(200).json(products);
  } else if (req.method === "POST") {
    debugger;
    const product = req.body;
    if (!product.name || !product.price) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const newProduct = addProduct(product);
    res.status(201).json(newProduct);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
