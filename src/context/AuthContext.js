import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Adjust path if needed
import { useRouter } from "next/router";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check local storage for an existing session
    const storedUser = localStorage.getItem("billing_admin_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      // Query the 'adminUser' collection for the specific username first
      const usernameQuery = query(
        collection(db, "adminUser"),
        where("username", "==", username)
      );
      
      const usernameSnapshot = await getDocs(usernameQuery);

      if (usernameSnapshot.empty) {
        return { success: false, error: "Incorrect user ID" };
      }

      // We found the user, now check if the password matches
      let matchedUser = null;
      usernameSnapshot.forEach((doc) => {
        if (doc.data().password === password) {
          matchedUser = { id: doc.id, username: doc.data().username };
        }
      });

      if (matchedUser) {
        // Save session
        setUser(matchedUser);
        localStorage.setItem("billing_admin_user", JSON.stringify(matchedUser));
        return { success: true };
      } else {
        return { success: false, error: "Incorrect password" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "An error occurred during login." };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("billing_admin_user");
    router.push("/login");
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user) return { success: false, error: "Not logged in" };
    return await changePasswordUnauthenticated(user.username, currentPassword, newPassword);
  };

  const changePasswordUnauthenticated = async (username, currentPassword, newPassword) => {
    try {
      // Re-verify current password
      const q = query(
        collection(db, "adminUser"),
        where("username", "==", username),
        where("password", "==", currentPassword)
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, error: "Username or current password is incorrect." };
      }

      // Update the password in Firestore
      const userDoc = querySnapshot.docs[0];
      const userRef = doc(db, "adminUser", userDoc.id);
      
      await updateDoc(userRef, {
        password: newPassword
      });

      return { success: true };
    } catch (error) {
      console.error("Change password error:", error);
      return { success: false, error: "Failed to update password." };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, changePasswordUnauthenticated }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
