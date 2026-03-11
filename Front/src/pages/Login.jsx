import { useState } from "react";
import { login } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    try {
      const data = await login(form);

      localStorage.setItem("token", data.access_token);

      alert("로그인 성공");

      navigate("/dashboard");
    } catch (err) {
      alert("로그인 실패");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-24 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">

      {/* Glass Card */}
      <div className="
        w-full max-w-md
        p-10
        rounded-3xl
        bg-white/40
        backdrop-blur-2xl
        border border-white/50
        shadow-2xl
      ">

        <h2 className="text-3xl font-extrabold text-slate-900 text-center">
          LOGIN
        </h2>

        <div className="mt-8 space-y-5">

          <input
            name="email"
            placeholder="Email"
            onChange={handleChange}
            className="
              w-full
              px-4 py-3
              rounded-xl
              border border-slate-200
              focus:outline-none
              focus:ring-2
              focus:ring-blue-400
              bg-white/70
            "
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            onChange={handleChange}
            className="
              w-full
              px-4 py-3
              rounded-xl
              border border-slate-200
              focus:outline-none
              focus:ring-2
              focus:ring-blue-400
              bg-white/70
            "
          />

          <button
            onClick={handleSubmit}
            className="
              w-full
              py-3
              rounded-xl
              bg-slate-900
              text-white
              font-semibold
              hover:bg-blue-900
              transition
              shadow-lg
              btn-glow
            "
          >
            로그인
          </button>

        </div>

      </div>

    </div>
  );
}