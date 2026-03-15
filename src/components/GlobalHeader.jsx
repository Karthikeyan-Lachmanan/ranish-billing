import React, { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { Layout, Menu, Button, Dropdown, Space, Avatar, Modal, Form, Input, message } from "antd";
import { UserOutlined, DownOutlined, LogoutOutlined, KeyOutlined, DashboardOutlined, FileTextOutlined } from "@ant-design/icons";

const { Header } = Layout;

export default function GlobalHeader() {
  const { user, logout, changePassword } = useAuth();
  const router = useRouter();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // If we are on the login page or not authenticated, don't show the header
  if (!user || router.pathname === "/login") {
    return null;
  }

  const handleMenuClick = ({ key }) => {
    if (key === "logout") {
      logout();
    } else if (key === "changePassword") {
      setIsModalVisible(true);
    }
  };

  const navItems = [
    { key: "/", icon: <FileTextOutlined />, label: "Invoices" },
    { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" }
  ];

  const profileMenuItems = [
    {
      key: "changePassword",
      icon: <KeyOutlined />,
      label: "Change Password",
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      danger: true,
    },
  ];

  const onFinishPasswordChange = async (values) => {
    setLoading(true);
    const { currentPassword, newPassword } = values;

    const result = await changePassword(currentPassword, newPassword);

    if (result.success) {
      message.success("Password changed successfully!");
      setIsModalVisible(false);
      form.resetFields();
    } else {
      message.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <>
      <Header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        background: "#fff", 
        padding: "0 24px", 
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        zIndex: 1,
        position: 'relative'
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ fontWeight: "bold", fontSize: "18px", marginRight: "40px", color: "#1890ff" }}>
            Admin Portal
          </div>
          <Menu 
            theme="light" 
            mode="horizontal" 
            selectedKeys={[router.pathname]} 
            items={navItems}
            onClick={({ key }) => router.push(key)}
            style={{ borderBottom: "none", minWidth: 300 }} 
          />
        </div>

        <div>
          <Dropdown menu={{ items: profileMenuItems, onClick: handleMenuClick }} trigger={['click']}>
            <a onClick={(e) => e.preventDefault()}>
              <Space style={{ cursor: "pointer" }}>
                <Avatar icon={<UserOutlined />} />
                {user.username}
                <DownOutlined />
              </Space>
            </a>
          </Dropdown>
        </div>
      </Header>

      <Modal
        title="Change Password"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinishPasswordChange}
          style={{ marginTop: "20px" }}
        >
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[{ required: true, message: "Please enter your current password" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: "Please enter your new password" },
              { min: 6, message: "Password must be at least 6 characters" }
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: "Please confirm your new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("The two passwords do not match!"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save Password
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
