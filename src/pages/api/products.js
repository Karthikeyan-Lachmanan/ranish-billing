import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'data', 'products.json');

function readData() {
  const fileData = fs.readFileSync(filePath);
  return JSON.parse(fileData);
}

function writeData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    const products = readData();
    res.status(200).json(products);
  } else if (req.method === 'POST') {
    const products = readData();
    products.push(req.body);
    writeData(products);
    res.status(201).json({ message: 'Product added' });
  } else if (req.method === 'PUT') {
    const products = readData();
    const index = products.findIndex(p => p.id === req.body.id);
    if (index !== -1) {
      products[index] = req.body;
      writeData(products);
      res.status(200).json({ message: 'Product updated' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    const products = readData();
    const updatedProducts = products.filter(p => p.id !== id);
    writeData(updatedProducts);
    res.status(200).json({ message: 'Product deleted' });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
