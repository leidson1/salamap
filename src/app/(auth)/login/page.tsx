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

  // Redirect após login (vem do link compartilhado)
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const redirectTo = searchParams?.get('redirect') || '/dashboard';

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast.error("Digite seu email."); return; }
    if (!password) { toast.error("Digite sua senha."); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
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

      router.push(redirectTo);
    } catch {
      toast.error("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 text-center pb-4">
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
              id="email" type="email" placeholder="seu@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Senha</Label>
            <Input
              id="password" type="password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete="current-password" className="h-10"
            />
          </div>
          <Button type="submit" className="w-full h-10" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-2 pt-0">
        <p className="text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/signup" className="font-medium text-emerald-500 hover:text-emerald-400">
            Cadastre-se
          </Link>
        </p>
        <div className="rounded-md bg-blue-50 px-3 py-1.5 text-center">
          <p className="text-[11px] text-blue-700">
            Já usa o <strong>ProvaScan</strong>? Use o mesmo login aqui!
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
