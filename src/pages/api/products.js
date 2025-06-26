import { db } from "../../firebase";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";

const collectionRef = collection(db, "products");

export default async function handler(req, res) {
  if (req.method === "GET") {
    const snapshot = await getDocs(collectionRef);
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(products);
  }

  if (req.method === "POST") {
    await addDoc(collectionRef, req.body);
    return res.status(201).json({ message: "Product added" });
  }

  if (req.method === "PUT") {
    const { id, ...data } = req.body;
    const productRef = doc(db, "products", id);
    await updateDoc(productRef, data);
    return res.status(200).json({ message: "Product updated" });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    const productRef = doc(db, "products", id);
    await deleteDoc(productRef);
    return res.status(200).json({ message: "Product deleted" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
