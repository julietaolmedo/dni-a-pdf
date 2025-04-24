
import { useState } from 'react';

export default function Home() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [dniFront, setDniFront] = useState(null);
  const [dniBack, setDniBack] = useState(null);

  const handleAuth = () => {
    if (password === "julieta2025") setAuthenticated(true);
    else alert("Contraseña incorrecta");
  };

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) setter(file);
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("front", dniFront);
    formData.append("back", dniBack);

    const res = await fetch("/api/generate-pdf", { method: "POST", body: formData });
    if (!res.ok) return alert("Error al generar el PDF");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "DNI_convertido.pdf";
    link.click();
  };

  if (!authenticated) {
    return (
      <main style={{ textAlign: "center", marginTop: 100 }}>
        <h2>Acceso restringido</h2>
        <input type="password" placeholder="Contraseña" onChange={(e) => setPassword(e.target.value)} />
        <br /><br />
        <button onClick={handleAuth}>Ingresar</button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 600, margin: "50px auto", textAlign: "center" }}>
      <h2>Subí el frente y dorso del DNI</h2>
      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setDniFront)} />
      <br /><br />
      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setDniBack)} />
      <br /><br />
      <button onClick={handleSubmit} disabled={!dniFront || !dniBack}>Generar PDF</button>
    </main>
  );
}
