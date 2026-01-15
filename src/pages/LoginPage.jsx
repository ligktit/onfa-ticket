import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, AlertCircle } from "lucide-react";
import { ADMIN_SECRET_KEY } from "../utils/config";

const LoginPage = () => {
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    if (secretKey.trim() === ADMIN_SECRET_KEY) {
      // Lưu vào localStorage để giữ session
      localStorage.setItem("admin_authenticated", "true");
      navigate("/admin");
    } else {
      setError("Secret key không đúng!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 font-sans flex items-center justify-center px-4 py-8">
      <div className="bg-gray-800/90 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-yellow-400 max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-yellow-500 rounded-full mb-3 sm:mb-4">
            <Lock size={24} className="sm:w-8 sm:h-8 text-black" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-2">Admin Login</h2>
          <p className="text-yellow-300 text-sm sm:text-base">Nhập secret key để truy cập</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="bg-red-500/20 text-red-100 p-2 sm:p-3 rounded border border-red-500/50 flex items-center text-sm sm:text-base">
              <AlertCircle className="mr-2 flex-shrink-0" size={18} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-yellow-300 font-semibold mb-2 text-sm sm:text-base">
              Secret Key
            </label>
            <input
              type="password"
              value={secretKey}
              onChange={(e) => {
                setSecretKey(e.target.value);
                setError("");
              }}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-gray-700 border border-yellow-400 text-white placeholder-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
              placeholder="Nhập secret key..."
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-2.5 sm:py-3 rounded-lg hover:opacity-90 transition shadow-lg border-2 border-yellow-400 text-sm sm:text-base"
          >
            Đăng nhập
          </button>
        </form>

        <div className="mt-4 sm:mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-yellow-300 hover:text-yellow-400 text-xs sm:text-sm underline"
          >
            ← Quay lại trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
