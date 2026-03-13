import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await signIn(email, password);
    if (error) { setError(error.message); setLoading(false); }
    else navigate("/dashboard");
  }

  return (
    <div style={{ minHeight:"100vh", background:"#080d18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Manrope',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');`}</style>
      <div style={{ width:400, background:"#111827", borderRadius:16, padding:"40px 36px", border:"1px solid #1a2235", boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)", margin:"0 auto 14px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:900, color:"#fff" }}>D</div>
          <div style={{ fontSize:20, fontWeight:800, color:"#e2e8f0", letterSpacing:"-0.01em" }}>DASSA</div>
          <div style={{ fontSize:12, color:"#475569", letterSpacing:"0.06em", marginTop:4 }}>TRINORMA MANAGER . SGI</div>
          <div style={{ marginTop:10, fontSize:11, color:"#38bdf8", background:"#0ea5e920", padding:"4px 12px", borderRadius:999, display:"inline-block" }}>ISO 9001 . 14001 . 45001</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"#94a3b8", display:"block", marginBottom:6, letterSpacing:"0.04em" }}>EMAIL</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="usuario@dassa.com.ar"
              style={{ width:"100%", padding:"11px 14px", background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:8, color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"#94a3b8", display:"block", marginBottom:6, letterSpacing:"0.04em" }}>CONTRASENA</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="--------"
              style={{ width:"100%", padding:"11px 14px", background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:8, color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" }}
            />
          </div>
          {error && <div style={{ background:"#450a0a", border:"1px solid #dc2626", borderRadius:8, padding:"10px 14px", color:"#fca5a5", fontSize:13 }}>{error}</div>}
          <button
            type="submit" disabled={loading}
            style={{ padding:"12px", background:loading?"#1e40af":"linear-gradient(135deg,#1d4ed8,#0ea5e9)", border:"none", borderRadius:8, color:"#fff", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", marginTop:4 }}
          >{loading ? "Ingresando..." : "Ingresar al Sistema"}</button>
        </form>
        <div style={{ textAlign:"center", marginTop:20, fontSize:12, color:"#475569" }}>
          ?No tenes cuenta? <Link to="/register" style={{ color:"#38bdf8", textDecoration:"none", fontWeight:600 }}>Registrarse</Link>
        </div>
      </div>
    </div>
  );
}
