import { useEffect, useState } from "react";
import { Form, Input, Button, message, Table, Popconfirm, Select, Space } from "antd";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { DEFAULT_SET, DEFAULT_SET_ID, getProductSetId } from "@/lib/productSets";

function Products() {
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [editingForm] = Form.useForm();
  const [productSets, setProductSets] = useState([DEFAULT_SET]);
  const [activeSetId, setActiveSetId] = useState(DEFAULT_SET_ID);
  const [newSetName, setNewSetName] = useState("");
  const [copyTargetId, setCopyTargetId] = useState(null);

  // ✅ Correct way: pass db as the first argument
  const productsCollection = collection(db, "products");
  const productSetsCollection = collection(db, "productSets");

  const fetchProductSets = async () => {
    try {
      const snapshot = await getDocs(productSetsCollection);
      const fetchedSets = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductSets([DEFAULT_SET, ...fetchedSets]);
    } catch (err) {
      console.error("Fetch sets error:", err);
      message.error("Failed to fetch product sets");
    }
  };

  const handleAddSet = async () => {
    const name = newSetName.trim();
    if (!name) {
      message.warning("Enter a set name");
      return;
    }
    if (productSets.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      message.warning("A set with this name already exists");
      return;
    }
    try {
      const ref = await addDoc(productSetsCollection, { name });
      message.success("Product set added!");
      setNewSetName("");
      await fetchProductSets();
      setActiveSetId(ref.id);
    } catch (error) {
      console.error("Add set error:", error);
      message.error("Failed to add product set");
    }
  };

  const handleDeleteSet = async () => {
    if (products.some((p) => getProductSetId(p) === activeSetId)) {
      message.warning("Delete or move all products in this set first");
      return;
    }
    try {
      await deleteDoc(doc(db, "productSets", activeSetId));
      message.success("Product set deleted");
      setActiveSetId(DEFAULT_SET_ID);
      fetchProductSets();
    } catch (error) {
      console.error("Delete set error:", error);
      message.error("Failed to delete product set");
    }
  };

  const handleCopyProducts = async () => {
    const source = products.filter((p) => getProductSetId(p) === activeSetId);
    const existingNames = new Set(
      products
        .filter((p) => getProductSetId(p) === copyTargetId)
        .map((p) => (p.name || "").trim().toLowerCase())
    );
    // Skip products whose name already exists in the target set
    const toCopy = source.filter(
      (p) => !existingNames.has((p.name || "").trim().toLowerCase())
    );

    if (toCopy.length === 0) {
      message.info("All products already exist in the target set");
      return;
    }

    try {
      // Firestore batches are limited to 500 writes
      for (let i = 0; i < toCopy.length; i += 500) {
        const batch = writeBatch(db);
        toCopy.slice(i, i + 500).forEach(({ id, ...data }) => {
          batch.set(doc(productsCollection), { ...data, setId: copyTargetId });
        });
        await batch.commit();
      }
      const skipped = source.length - toCopy.length;
      message.success(
        `Copied ${toCopy.length} product(s)` +
          (skipped ? `, skipped ${skipped} already in target set` : "")
      );
      setCopyTargetId(null);
      fetchProducts();
    } catch (error) {
      console.error("Copy error:", error);
      message.error("Failed to copy products");
    }
  };

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
    fetchProductSets();
  }, []);

  const handleAddProduct = async (values) => {
    try {
      await addDoc(productsCollection, { ...values, setId: activeSetId });
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
      setId: getProductSetId(record),
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
      title: "Set",
      dataIndex: "setId",
      render: (_, record) => {
        if (editingKey === record.id) {
          return (
            <Form.Item name="setId" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Select
                style={{ minWidth: 120 }}
                options={productSets.map((s) => ({ label: s.name, value: s.id }))}
              />
            </Form.Item>
          );
        }
        return productSets.find((s) => s.id === getProductSetId(record))?.name || "-";
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
      <h3>Product Set</h3>
      <Space wrap style={{ marginBottom: "1.5rem" }}>
        <Select
          style={{ width: 200 }}
          value={activeSetId}
          onChange={(value) => {
            setActiveSetId(value);
            setEditingKey(null);
            setCopyTargetId(null);
          }}
          options={productSets.map((s) => ({ label: s.name, value: s.id }))}
        />
        {activeSetId !== DEFAULT_SET_ID && (
          <Popconfirm title="Delete this product set?" onConfirm={handleDeleteSet}>
            <Button danger>Delete Set</Button>
          </Popconfirm>
        )}
        <Input
          style={{ width: 200 }}
          placeholder="New set name"
          value={newSetName}
          onChange={(e) => setNewSetName(e.target.value)}
          onPressEnter={handleAddSet}
        />
        <Button onClick={handleAddSet}>Add Set</Button>
      </Space>

      <Space wrap style={{ marginBottom: "1.5rem" }}>
        <span>Copy products in this set to:</span>
        <Select
          style={{ width: 200 }}
          placeholder="Select target set"
          value={copyTargetId}
          onChange={setCopyTargetId}
          options={productSets
            .filter((s) => s.id !== activeSetId)
            .map((s) => ({ label: s.name, value: s.id }))}
        />
        <Popconfirm
          title="Copy all products in this set to the selected set?"
          onConfirm={handleCopyProducts}
          disabled={!copyTargetId}
        >
          <Button disabled={!copyTargetId}>Copy Products</Button>
        </Popconfirm>
      </Space>

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

      <h3 style={{ marginTop: "2rem" }}>
        Products in {productSets.find((s) => s.id === activeSetId)?.name}
      </h3>
      <Form form={editingForm} onFinish={handleEditSave}>
        <Table
          dataSource={products.filter((p) => getProductSetId(p) === activeSetId)}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      </Form>
    </div>
  );
}

export default Products;
