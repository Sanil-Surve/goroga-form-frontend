import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Loader2, Leaf, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function AdminLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (user) navigate("/admin/dashboard", { replace: true });
  }, [user, navigate]);

  const onSubmit = async ({ email, password }) => {
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (res.ok) {
      toast.success("Welcome back");
      navigate("/admin/dashboard");
    } else {
      toast.error(res.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-6" data-testid="admin-login-page">
      <div className="max-w-md w-full">
        <Link to="/" className="text-xs text-stone-500 hover:text-indigo-700 inline-flex items-center mb-8">
          <ArrowLeft className="w-3 h-3 mr-1" /> Back to booking
        </Link>

        <div className="bg-white border border-stone-200 rounded-3xl shadow-sm p-10">
          <div className="flex items-center gap-2 mb-8">
            <Leaf className="w-5 h-5 text-indigo-700" />
            <span className="font-heading text-xl tracking-tight">Goroga Admin</span>
          </div>

          <p className="text-xs tracking-[0.2em] uppercase font-semibold text-stone-500">Sign in</p>
          <h1 className="font-heading text-3xl tracking-tight mt-2">Welcome back</h1>
          <p className="text-stone-500 mt-2 text-sm">Enter your credentials to manage appointments.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email" className="text-xs tracking-[0.2em] uppercase font-semibold text-stone-500">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                data-testid="admin-login-email"
                className="mt-2 bg-stone-50 border-stone-200 focus-visible:ring-indigo-200 focus-visible:border-indigo-400"
                {...register("email", { required: "Email required" })}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password" className="text-xs tracking-[0.2em] uppercase font-semibold text-stone-500">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                data-testid="admin-login-password"
                className="mt-2 bg-stone-50 border-stone-200 focus-visible:ring-indigo-200 focus-visible:border-indigo-400"
                {...register("password", { required: "Password required" })}
              />
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>
            <Button
              type="submit"
              disabled={submitting}
              data-testid="admin-login-submit"
              className="w-full h-11 bg-indigo-700 hover:bg-indigo-800 text-white rounded-full transition-all duration-200 hover:-translate-y-[1px]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
