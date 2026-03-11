import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="w-full px-10 py-6 flex justify-between items-center backdrop-blur-xl bg-white/30 border-b border-white/30">
      <Link to="/" className="text-xl font-bold text-slate-900">
        BrandRisk AI
      </Link>

      <nav className="flex gap-6 text-sm font-medium">
        <Link to="/features">Features</Link>
        <Link to="/login">Login</Link>
        <Link to="/signup">Signup</Link>
      </nav>
    </header>
  );
}