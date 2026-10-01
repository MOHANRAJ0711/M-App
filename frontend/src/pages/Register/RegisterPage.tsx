import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../../components/common/AppShell";
import { useAuth } from "../../components/common/AuthProvider";
import { ApiError, api } from "../../services/api";
import { cardClass, inputClass, primaryButtonClass } from "../../utils/styles";

export function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading, refresh } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.register({ name, email, password });
      await refresh();
      navigate("/dashboard");
    } catch (registerError) {
      setError(registerError instanceof ApiError ? registerError.message : "Could not create the account.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <AppShell>
      <form onSubmit={onSubmit} className={`${cardClass} mx-auto max-w-md space-y-4`}>
        <h1 className="text-2xl font-semibold">Create account</h1>
        <label className="block text-sm">
          Name
          <input className={`${inputClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="block text-sm">
          Email
          <input className={`${inputClass} mt-1`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="block text-sm">
          Password
          <input className={`${inputClass} mt-1`} type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className={primaryButtonClass} type="submit" disabled={submitting}>
          Register
        </button>
        <p className="text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-blue-700">Log in</Link>
        </p>
      </form>
    </AppShell>
  );
}
