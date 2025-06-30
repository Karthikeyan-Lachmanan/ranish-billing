import { useState, useEffect } from "react";
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

function SalesPerson() {
  const [form] = Form.useForm();
  const [salesPersons, setSalesPersons] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [editingForm] = Form.useForm();

  const salesPersonCollection = collection(db, "salesperson");

  const fetchSalesPersons = async () => {
    try {
      const snapshot = await getDocs(salesPersonCollection);
      const fetchedSalesPersons = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSalesPersons(fetchedSalesPersons);
    } catch (err) {
      console.error("Fetch error:", err);
      message.error("Failed to fetch sales persons");
    }
  };

  useEffect(() => {
    fetchSalesPersons();
  }, []);

  const handleAddSalesPerson = async (values) => {
    try {
      await addDoc(salesPersonCollection, values);
      message.success("Sales person added!");
      form.resetFields();
      fetchSalesPersons();
    } catch (error) {
      console.error("Add error:", error);
      message.error("Failed to add sales person");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "salespersons", id));
      message.success("Sales person deleted");
      fetchSalesPersons();
    } catch (error) {
      console.error("Delete error:", error);
      message.error("Failed to delete");
    }
  };

  const handleEditSave = async (values) => {
    try {
      const salesPersonRef = doc(db, "salespersons", editingKey);
      await updateDoc(salesPersonRef, values);
      message.success("Sales person updated");
      setEditingKey(null);
      fetchSalesPersons();
    } catch (error) {
      console.error("Update error:", error);
      message.error("Failed to update");
    }
  };

  const startEdit = (record) => {
    setEditingKey(record.id);
    editingForm.setFieldsValue({
      name: record.name,
      phone: record.phone,
    });
  };

  const cancelEdit = () => {
    setEditingKey(null);
  };

  const columns = [
    {
      title: "Sales Person Name",
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
      title: "Phone Number",
      dataIndex: "phone",
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Form.Item name="phone" style={{ margin: 0 }} rules={[{ required: true }]}>
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
            <Popconfirm title="Delete this sales person?" onConfirm={() => handleDelete(record.id)}>
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
      <Form form={form} layout="vertical" onFinish={handleAddSalesPerson}>
        <Form.Item label="Sales Person Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Phone Number" name="phone" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Add Sales Person
        </Button>
      </Form>

      <h3 style={{ marginTop: "2rem" }}>All Sales Persons</h3>
      <Form form={editingForm} onFinish={handleEditSave}>
        <Table
          dataSource={salesPersons}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      </Form>
    </div>
  );
}

export default SalesPerson;
