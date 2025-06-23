import { useEffect, useState } from "react";
import { Form, Input, Button, message, Table, Popconfirm } from "antd";

function Products() {
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [editingForm] = Form.useForm();

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
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
      const newProduct = {
        id: Date.now().toString(), // Unique ID
        ...values,
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      if (!res.ok) throw new Error("Failed to add");

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
      const res = await fetch(`/api/products?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      message.success("Product deleted");
      fetchProducts();
    } catch (error) {
      console.error("Delete error:", error);
      message.error("Failed to delete");
    }
  };

  const handleEditSave = async (values) => {
    try {
      const updatedProduct = { ...values, id: editingKey };

      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProduct),
      });

      if (!res.ok) throw new Error("Failed to update");

      message.success("Product updated");
      setEditingKey(null);
      fetchProducts();
    } catch (error) {
      console.error("Update error:", error);
      message.error("Failed to update");
    }
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
              <Button type="link" onClick={() => setEditingKey(null)}>
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
  

  const startEdit = (record) => {
    setEditingKey(record.id);
    editingForm.setFieldsValue({
      name: record.name,
      price: record.price,
      perBox: record.perBox,
      hsnCode: record.hsnCode,
    });
  };
  

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
        <Form.Item label="HSN Code" name="hsnCode" rules={[{ required: true }]}>
          <Input type="HSN Code" />
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
