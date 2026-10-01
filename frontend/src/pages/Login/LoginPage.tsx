import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../../components/common/AppShell";
import { useAuth } from "../../components/common/AuthProvider";
import { ApiError, api } from "../../services/api";
import { cardClass, inputClass, primaryButtonClass } from "../../utils/styles";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.login({ email, password });
      await refresh();
      navigate(params.get("next") || "/dashboard");
    } catch (loginError) {
      setError(loginError instanceof ApiError ? loginError.message : "Could not log in.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <AppShell>
      <form onSubmit={onSubmit} className={`${cardClass} mx-auto max-w-md space-y-4`}>
        <h1 className="text-2xl font-semibold">Log in</h1>
        <label className="block text-sm">
          Email
          <input className={`${inputClass} mt-1`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="block text-sm">
          Password
          <input className={`${inputClass} mt-1`} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className={primaryButtonClass} type="submit" disabled={submitting}>
          Log in
        </button>
        <p className="text-sm text-gray-500">
          New here? <Link to="/register" className="text-blue-700">Create an account</Link>
        </p>
      </form>
    </AppShell>
  );
}
