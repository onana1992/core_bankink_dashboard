type Client = {
  id: number;
  name: string;
  email: string;
};

import AddClientForm from "./AddClientForm";

async function fetchClients(): Promise<Client[]> {
  const res = await fetch("http://localhost:8080/api/clients", {
    // Disable caching in dev for fresh data; fine for demo
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch clients: ${res.status}`);
  }
  return res.json();
}

export default async function ClientsPage() {
  const clients = await fetchClients();
  return (
    <main style={{ padding: "24px" }}>
      <AddClientForm />
      <h1 style={{ marginBottom: "16px" }}>Liste des clients</h1>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "8px" }}>ID</th>
            <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "8px" }}>Nom</th>
            <th style={{ borderBottom: "1px solid #ddd", textAlign: "left", padding: "8px" }}>Email</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px" }}>{c.id}</td>
              <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px" }}>{c.name}</td>
              <td style={{ borderBottom: "1px solid #f0f0f0", padding: "8px" }}>{c.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}



