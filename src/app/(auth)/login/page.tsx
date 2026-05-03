"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const redirectTo = searchParams?.get("redirect") || "/dashboard";
  const inviteToken = searchParams?.get("convite")
    || (typeof window !== "undefined" ? localStorage.getItem("salamap_invite_token") : null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast.error("Digite seu email."); return; }
    if (!password) { toast.error("Digite sua senha."); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error(
          error.message === "Invalid login credentials"
            ? "Email ou senha incorretos."
            : error.message
        );
        return;
      }

      try {
        await supabase.rpc("vincular_convites_pendentes");
      } catch {}

      if (inviteToken && data.user?.id) {
        try {
          const { error: inviteError } = await supabase.rpc("aceitar_convite", {
            p_token: inviteToken,
            p_user_id: data.user.id,
          });

          if (!inviteError && typeof window !== "undefined") {
            localStorage.removeItem("salamap_invite_token");
            toast.success("Convite vinculado com sucesso.");
          }
        } catch {}
      }

      router.push(redirectTo);
    } catch {
      toast.error("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 pb-4 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <LayoutGrid className="h-7 w-7 text-emerald-500" />
          <span className="text-xl font-bold tracking-tight">SalaMap</span>
        </div>
        <CardTitle className="text-lg">Entrar</CardTitle>
        <CardDescription className="text-xs">
          Mapa de sala interativo para professores
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-10"
            />
          </div>
          <Button type="submit" className="h-10 w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-2 pt-0">
        <p className="text-sm text-muted-foreground">
          Nao tem conta?{" "}
          <Link href="/signup" className="font-medium text-emerald-500 hover:text-emerald-400">
            Cadastre-se
          </Link>
        </p>
        <div className="rounded-md bg-blue-50 px-3 py-1.5 text-center">
          <p className="text-[11px] text-blue-700">
            Ja usa o <strong>ProvaScan</strong>? Use o mesmo login aqui!
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
