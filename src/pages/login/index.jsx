import { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { Card, Form, Input, Button, Typography, message, Space, Alert } from "antd";
import { UserOutlined, LockOutlined, KeyOutlined } from "@ant-design/icons";

const { Title, Text, Link } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // 'login' or 'changePassword'
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const { login, changePasswordUnauthenticated } = useAuth();
  const [form] = Form.useForm();

  const onFinishLogin = async (values) => {
    setLoading(true);
    setErrorMsg("");
    const { username, password } = values;

    const result = await login(username, password);

    if (result.success) {
      message.success("Login successful!");
      router.push("/"); // Redirect to home or dashboard after login
    } else {
      setErrorMsg(result.error);
    }

    setLoading(false);
  };

  const onFinishPasswordChange = async (values) => {
    setLoading(true);
    setErrorMsg("");
    const { username, currentPassword, newPassword } = values;

    const result = await changePasswordUnauthenticated(username, currentPassword, newPassword);

    if (result.success) {
      message.success("Password changed successfully! Please log in.");
      form.resetFields();
      setMode("login");
    } else {
      setErrorMsg(result.error);
    }

    setLoading(false);
  };

  const handleModeChange = (newMode) => {
    setErrorMsg("");
    form.resetFields();
    setMode(newMode);
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f0f2f5"
    }}>
      <Card style={{ width: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Title level={2} style={{ margin: 0 }}>
            {mode === "login" ? "Billing Admin" : "Change Password"}
          </Title>
          <p style={{ color: "gray" }}>
            {mode === "login" ? "Please sign in to continue" : "Update your credential"}
          </p>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: "1rem" }}
          />
        )}

        {mode === "login" ? (
          <Form
            name="login_form"
            layout="vertical"
            onFinish={onFinishLogin}
            autoComplete="off"
            onChange={() => setErrorMsg("")} // clear on type
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: "Please enter your username!" }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
                placeholder="Username"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Please enter your password!" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
                placeholder="Password"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
              >
                Sign In
              </Button>
            </Form.Item>

            <div style={{ textAlign: "center" }}>
              <Text type="secondary">Need to update your credentials? </Text>
              <Link onClick={() => handleModeChange("changePassword")}>Change Password</Link>
            </div>
          </Form>
        ) : (
          <Form
            form={form}
            name="change_password_form"
            layout="vertical"
            onFinish={onFinishPasswordChange}
            autoComplete="off"
            onChange={() => setErrorMsg("")} // clear on type
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: "Please enter your username!" }]}
              style={{ marginBottom: "16px" }}
            >
              <Input
                prefix={<UserOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
                placeholder="Username"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="currentPassword"
              rules={[{ required: true, message: "Please enter your current password!" }]}
              style={{ marginBottom: "16px" }}
            >
              <Input.Password
                prefix={<KeyOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
                placeholder="Current Password"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              rules={[
                { required: true, message: "Please enter your new password!" },
                { min: 6, message: "Password must be at least 6 characters" }
              ]}
              style={{ marginBottom: "16px" }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
                placeholder="New Password"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: "Please confirm your new password!" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Passwords do not match!"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
                placeholder="Confirm New Password"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={loading}
                style={{ marginBottom: "8px" }}
              >
                Update Password
              </Button>
              <Button
                size="large"
                block
                onClick={() => handleModeChange("login")}
              >
                Back to Login
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
}
