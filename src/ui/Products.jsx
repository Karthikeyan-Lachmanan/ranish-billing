import { useEffect, useState } from "react";
import { Form, Input, Button, message, Table, Popconfirm } from "antd";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

function Products() {
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [editingForm] = Form.useForm();

  // ✅ Correct way: pass db as the first argument
  const productsCollection = collection(db, "products");

  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(productsCollection);
      const fetchedProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(fetchedProducts);
    } catch (err) {
      console.error("Fetch error:", err);
      message.error("Failed to fetch products");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (values) => {
    try {
      await addDoc(productsCollection, values);
      message.success("Product added!");
      form.resetFields();
      fetchProducts();
    } catch (error) {
      console.error("Add error:", error);
      message.error("Failed to add product");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "products", id));
      message.success("Product deleted");
      fetchProducts();
    } catch (error) {
      console.error("Delete error:", error);
      message.error("Failed to delete");
    }
  };

  const handleEditSave = async (values) => {
    try {
      const productRef = doc(db, "products", editingKey);
      await updateDoc(productRef, values); // ✅ You missed this line
      message.success("Product updated");
      setEditingKey(null);
      fetchProducts();
    } catch (error) {
      console.error("Update error:", error);
      message.error("Failed to update");
    }
  };

  const startEdit = (record) => {
    setEditingKey(record.id);
    editingForm.setFieldsValue({
      name: record.name,
      price: record.price,
      perBox: record.perBox,
      mrp: record.mrp,
      hsnCode: record.hsnCode,
    });
  };

  const cancelEdit = () => {
    setEditingKey(null);
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          );
        }
        return text;
      },
    },
    {
      title: "Price (₹)",
      dataIndex: "price",
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Form.Item name="price" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Input type="number" />
            </Form.Item>
          );
        }
        return text;
      },
    },
    {
      title: "Per Box",
      dataIndex: "perBox",
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Form.Item name="perBox" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Input type="number" />
            </Form.Item>
          );
        }
        return text;
      },
    },
    {
      title: "MRP (₹)",
      dataIndex: "mrp",
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Form.Item name="mrp" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Input type="number" />
            </Form.Item>
          );
        }
        return text;
      },
    },
    {
      title: "HSN Code",
      dataIndex: "hsnCode",
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Form.Item name="hsnCode" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          );
        }
        return text;
      },
    },
    {
      title: "Actions",
      dataIndex: "actions",
      render: (_, record) => {
        if (editingKey === record.id) {
          return (
            <>
              <Button type="link" onClick={() => editingForm.submit()}>
                Save
              </Button>
              <Button type="link" onClick={cancelEdit}>
                Cancel
              </Button>
            </>
          );
        }
        return (
          <>
            <Button type="link" onClick={() => startEdit(record)}>
              Edit
            </Button>
            <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" danger>
                Delete
              </Button>
            </Popconfirm>
          </>
        );
      },
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto" }}>
      <Form form={form} layout="vertical" onFinish={handleAddProduct}>
        <Form.Item label="Product Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Price" name="price" rules={[{ required: true }]}>
          <Input type="number" />
        </Form.Item>
        <Form.Item label="Per Box" name="perBox" rules={[{ required: true }]}>
          <Input type="number" />
        </Form.Item>
        <Form.Item label="MRP" name="mrp" rules={[{ required: true }]}>
          <Input type="number" />
        </Form.Item>
        <Form.Item label="HSN Code" name="hsnCode" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Add Product
        </Button>
      </Form>

      <h3 style={{ marginTop: "2rem" }}>All Products</h3>
      <Form form={editingForm} onFinish={handleEditSave}>
        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      </Form>
    </div>
  );
}

export default Products;
