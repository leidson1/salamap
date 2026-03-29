"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, LayoutGrid, Loader2 } from "lucide-react";
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
import {
  getSupabaseConfigHelpText,
  getSupabaseConfigStatus,
} from "@/lib/supabase/config";

export default function SignUpPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabaseConfig = getSupabaseConfigStatus();
  const supabaseConfigHelp = getSupabaseConfigHelpText();

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    const normalizedNome = nome.trim();
    const normalizedEmail = email.trim();

    if (!normalizedNome) {
      toast.error("Informe seu nome.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas nao coincidem");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Voce precisa aceitar os Termos de Uso");
      return;
    }

    if (!supabaseConfig.isConfigured) {
      toast.error("Supabase nao configurado", {
        description: supabaseConfigHelp,
      });
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const acceptedTermsAt = new Date().toISOString();
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            nome: normalizedNome,
            accepted_terms_at: acceptedTermsAt,
          },
        },
      });

      if (error) {
        let msg = error.message;
        if (error.message.includes("already registered")) {
          msg = "Este email ja esta cadastrado. Tente fazer login.";
        } else if (error.message.includes("Password should be")) {
          msg = "A senha deve ter pelo menos 6 caracteres.";
        } else if (error.message.includes("is invalid")) {
          msg = "Informe um email valido para concluir o cadastro.";
        }

        toast.error("Erro ao criar conta", {
          description: msg,
        });
        return;
      }

      toast.success("Conta criada com sucesso!", {
        description: "Verifique seu e-mail para confirmar o cadastro.",
      });
    } catch {
      toast.error("Erro ao criar conta", {
        description: "Nao foi possivel conectar ao Supabase. Revise a configuracao do .env.local.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <LayoutGrid className="h-8 w-8 text-emerald-500" />
          <span className="text-2xl font-bold tracking-tight">SalaMap</span>
        </div>
        <CardTitle className="text-xl">Criar conta</CardTitle>
        <CardDescription>Preencha os dados abaixo para se cadastrar</CardDescription>
        {!supabaseConfig.isConfigured && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Supabase nao configurado</p>
                <p className="mt-1 text-amber-800">{supabaseConfigHelp}</p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <form onSubmit={handleSignUp}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              type="text"
              placeholder="Seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Senha</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="********"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              id="terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border accent-emerald-500"
            />
            <Label htmlFor="terms" className="text-sm font-normal leading-snug">
              Li e aceito os{" "}
              <Link
                href="/termos"
                className="font-medium text-emerald-500 underline transition-colors hover:text-emerald-400"
                target="_blank"
              >
                Termos de Uso e Politica de Privacidade
              </Link>
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Criando conta..." : "Criar Conta"}
          </Button>
        </CardContent>
      </form>

      <CardFooter className="flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Ja tem conta?{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-500 transition-colors hover:text-emerald-400"
          >
            Entrar
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground/70">
          Usa o ProvaScan? Sua conta funciona aqui tambem!
        </p>
      </CardFooter>
    </Card>
  );
}
