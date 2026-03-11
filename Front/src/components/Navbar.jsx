import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {

  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
    window.location.reload();
  };

  return (
    <header className="fixed top-0 left-0 w-full z-[999] backdrop-blur-xl bg-white/30 border-b border-white/30">

      <div className="px-10 py-5 flex items-center justify-between">

        <Link to="/" className="text-lg font-extrabold text-slate-900">
          BrandRisk AI
        </Link>

        <nav className="flex items-center gap-6 text-sm font-semibold text-slate-700">

          {token ? (
            <>
              <Link to="/dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-red-600 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-slate-900">
                Login
              </Link>

              <Link
                to="/signup"
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-blue-900 transition"
              >
                Signup
              </Link>
            </>
          )}

        </nav>

      </div>

    </header>
  );
}