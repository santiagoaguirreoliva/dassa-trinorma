import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName:"", email:"", password:"", confirm:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Las contrasenas no coinciden"); return; }
    setLoading(true); setError("");
    const { error } = await signUp(form.email, form.password, form.fullName);
    if (error) { setError(error.message); setLoading(false); }
    else navigate("/dashboard");
  }

  return (
    <div style={{ minHeight:"100vh", background:"#080d18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Manrope',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');`}</style>
      <div style={{ width:420, background:"#111827", borderRadius:16, padding:"40px 36px", border:"1px solid #1a2235", boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)", margin:"0 auto 12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"#fff" }}>D</div>
          <div style={{ fontSize:18, fontWeight:800, color:"#e2e8f0" }}>Crear cuenta</div>
          <div style={{ fontSize:12, color:"#475569", marginTop:4 }}>DASSA Trinorma Manager</div>
        </div>
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[
            { label:"NOMBRE COMPLETO", key:"fullName", type:"text", placeholder:"Juan Garcia" },
            { label:"EMAIL", key:"email", type:"email", placeholder:"usuario@dassa.com.ar" },
            { label:"CONTRASENA", key:"password", type:"password", placeholder:"Minimo 8 caracteres" },
            { label:"CONFIRMAR CONTRASENA", key:"confirm", type:"password", placeholder:"Repetir contrasena" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:11, fontWeight:600, color:"#94a3b8", display:"block", marginBottom:5, letterSpacing:"0.05em" }}>{f.label}</label>
              <input
                type={f.type} value={(form as any)[f.key]} placeholder={f.placeholder} required
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{ width:"100%", padding:"10px 13px", background:"#0f172a", border:"1px solid #1e3a5f", borderRadius:7, color:"#e2e8f0", fontSize:13, outline:"none", boxSizing:"border-box" }}
              />
            </div>
          ))}
          {error && <div style={{ background:"#450a0a", border:"1px solid #dc2626", borderRadius:7, padding:"9px 13px", color:"#fca5a5", fontSize:12 }}>{error}</div>}
          <button
            type="submit" disabled={loading}
            style={{ padding:"11px", background:loading?"#1e40af":"linear-gradient(135deg,#1d4ed8,#0ea5e9)", border:"none", borderRadius:7, color:"#fff", fontSize:13, fontWeight:700, cursor:loading?"not-allowed":"pointer", marginTop:4 }}
          >{loading ? "Registrando..." : "Crear cuenta"}</button>
        </form>
        <div style={{ textAlign:"center", marginTop:16, fontSize:12, color:"#475569" }}>
          ?Ya tenes cuenta? <Link to="/login" style={{ color:"#38bdf8", textDecoration:"none", fontWeight:600 }}>Iniciar sesion</Link>
        </div>
        <div style={{ marginTop:16, padding:"10px 14px", background:"#0c1a2e", borderRadius:8, fontSize:11, color:"#475569", textAlign:"center" }}>
          Tu cuenta quedara pendiente de asignacion de roles por el administrador.
        </div>
      </div>
    </div>
  );
}
