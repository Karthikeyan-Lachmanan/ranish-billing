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

function Customers() {
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [editingForm] = Form.useForm();

  const customersCollection = collection(db, "customers");

  const fetchCustomers = async () => {
    try {
      const snapshot = await getDocs(customersCollection);
      const fetchedCustomers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomers(fetchedCustomers);
    } catch (err) {
      console.error("Fetch error:", err);
      message.error("Failed to fetch customers");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (values) => {
    try {
      await addDoc(customersCollection, values);
      message.success("Customer added!");
      form.resetFields();
      fetchCustomers();
    } catch (error) {
      console.error("Add error:", error);
      message.error("Failed to add customer");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "customers", id));
      message.success("Customer deleted");
      fetchCustomers();
    } catch (error) {
      console.error("Delete error:", error);
      message.error("Failed to delete");
    }
  };

  const handleEditSave = async (values) => {
    try {
      const customerRef = doc(db, "customers", editingKey);
      await updateDoc(customerRef, values);
      message.success("Customer updated");
      setEditingKey(null);
      fetchCustomers();
    } catch (error) {
      console.error("Update error:", error);
      message.error("Failed to update");
    }
  };

  const startEdit = (record) => {
    setEditingKey(record.id);
    editingForm.setFieldsValue({
      name: record.name,
      address: record.address,
      gstin: record.gstin,
      state: record.state,
      contact: record.contact,
    });
  };

  const cancelEdit = () => {
    setEditingKey(null);
  };

  const columns = [
    {
      title: "Customer Name",
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
      title: "Address",
      dataIndex: "address",
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Form.Item name="address" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          );
        }
        return text;
      },
    },
    {
      title: "GSTIN",
      dataIndex: "gstin",
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Form.Item name="gstin" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          );
        }
        return text;
      },
    },
    {
      title: "State",
      dataIndex: "state",
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Form.Item name="state" style={{ margin: 0 }} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          );
        }
        return text;
      },
    },
    {
      title: "Email / Phone",
      dataIndex: "contact",
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Form.Item name="contact" style={{ margin: 0 }} rules={[{ required: true }]}>
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
            <Popconfirm title="Delete this customer?" onConfirm={() => handleDelete(record.id)}>
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
      <Form form={form} layout="vertical" onFinish={handleAddCustomer}>
        <Form.Item label="Customer Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Address" name="address" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="GSTIN" name="gstin" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="State" name="state" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Email / Phone" name="contact" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Add Customer
        </Button>
      </Form>

      <h3 style={{ marginTop: "2rem" }}>All Customers</h3>
      <Form form={editingForm} onFinish={handleEditSave}>
        <Table
          dataSource={customers}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      </Form>
    </div>
  );
}

export default Customers;
