import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { Spin } from "antd";

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If we've finished checking local storage and there's no user, AND we're not already on the login page...
    if (!loading && !user && router.pathname !== "/login") {
      router.push("/login");
    }
  }, [user, loading, router]);

  // While checking status, show loading spinner
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Verifying session..." />
      </div>
    );
  }

  // If we're not loading, and we don't have a user, and we're NOT on the login page, 
  // we render nothing to prevent a flash of protected content before redirect completes.
  if (!user && router.pathname !== "/login") {
    return null;
  }

  return children;
}
