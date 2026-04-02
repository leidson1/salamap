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

export default function SignUpPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Convite por token
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const conviteToken = searchParams?.get('convite') || null;
  const isInvite = !!conviteToken;

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { toast.error("Informe seu nome."); return; }
    if (!email.trim()) { toast.error("Informe seu email."); return; }
    if (password.length < 6) { toast.error("Senha deve ter pelo menos 6 caracteres."); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nome: nome.trim(),
            accepted_terms_at: new Date().toISOString(),
          },
        },
      });

      if (error) {
        let msg = error.message;
        if (error.message.includes("already registered")) {
          msg = "Este email já está cadastrado. Tente fazer login.";
        } else if (error.message.includes("Password should be")) {
          msg = "A senha deve ter pelo menos 6 caracteres.";
        }
        toast.error(msg);
        return;
      }

      toast.success("Conta criada! Verifique seu email para confirmar.");
      router.push(conviteToken ? `/login?redirect=/dashboard` : "/login");
    } catch {
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      });
      if (error) toast.error(error.message);
    } catch {
      toast.error("Erro ao conectar com Google.");
      setGoogleLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 text-center pb-4">
        <div className="mb-2 flex items-center justify-center gap-2">
          <LayoutGrid className="h-7 w-7 text-emerald-500" />
          <span className="text-xl font-bold tracking-tight">SalaMap</span>
        </div>
        <CardTitle className="text-lg">Criar conta</CardTitle>
        <CardDescription className="text-xs">
          {isInvite ? 'Você foi convidado(a) para uma equipe!' : 'Rápido e gratuito. Comece em menos de 1 minuto.'}
        </CardDescription>
        {isInvite && (
          <div className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-center">
            <p className="text-[11px] text-emerald-700">
              Crie sua conta para entrar na equipe do <strong>SalaMap</strong>
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Google — mais rapido */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          onClick={handleGoogleSignUp}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Cadastrar com Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou com email</span>
          </div>
        </div>

        {/* Form simples: nome, email, senha */}
        <form onSubmit={handleSignUp} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nome" className="text-xs">Nome</Label>
            <Input
              id="nome" type="text" placeholder="Seu nome"
              value={nome} onChange={(e) => setNome(e.target.value)}
              required autoComplete="name" className="h-10"
            />
          </div>
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
              id="password" type="password" placeholder="Mínimo 6 caracteres"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} autoComplete="new-password" className="h-10"
            />
          </div>

          <p className="text-[10px] text-muted-foreground">
            Ao criar conta, você aceita os{" "}
            <Link href="/termos" className="underline text-emerald-600" target="_blank">
              Termos de Uso
            </Link>.
          </p>

          <Button type="submit" className="w-full h-10" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Criando..." : isInvite ? "Criar Conta e Entrar" : "Criar Conta"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-2 pt-0">
        <p className="text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-emerald-500 hover:text-emerald-400">
            Entrar
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
