import "@/styles/globals.css";
import 'antd/dist/reset.css';
import { AuthProvider } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import GlobalHeader from "@/components/GlobalHeader";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <GlobalHeader />
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  );
}
