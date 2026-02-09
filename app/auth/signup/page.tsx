'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Target, CheckCircle2 } from 'lucide-react';

interface FieldErrors {
  email?: string;
  password?: string;
  workspaceName?: string;
}

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'signing-in'>('form');
  const router = useRouter();

  function validateLocally(): FieldErrors {
    const errors: FieldErrors = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    const trimmedWs = workspaceName.trim();
    if (!trimmedWs) {
      errors.workspaceName = 'Workspace name is required';
    } else if (trimmedWs.length < 2) {
      errors.workspaceName = 'Workspace name must be at least 2 characters';
    } else if (trimmedWs.length > 50) {
      errors.workspaceName = 'Workspace name must be 50 characters or fewer';
    }

    return errors;
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    setFieldErrors({});

    const localErrors = validateLocally();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, workspaceName }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fields) {
          setFieldErrors(data.fields);
        }
        setGlobalError(data.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      setStep('signing-in');

      const signInResult = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push('/auth/signin');
        return;
      }

      router.push('/app');
      router.refresh();
    } catch (err) {
      setGlobalError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Sign up to start managing your leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'signing-in' ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-medium">Account created!</p>
              <p className="text-sm text-muted-foreground">Signing you in...</p>
              <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mt-2" />
            </div>
          ) : (
            <>
              <form onSubmit={handleSignUp} className="space-y-4">
                {globalError && !Object.keys(fieldErrors).length && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{globalError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="workspaceName">Workspace Name</Label>
                  <Input
                    id="workspaceName"
                    type="text"
                    placeholder="Acme Corp"
                    value={workspaceName}
                    onChange={(e) => {
                      setWorkspaceName(e.target.value);
                      if (fieldErrors.workspaceName) {
                        setFieldErrors((prev) => ({ ...prev, workspaceName: undefined }));
                      }
                    }}
                    disabled={loading}
                    aria-invalid={!!fieldErrors.workspaceName}
                    className={fieldErrors.workspaceName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {fieldErrors.workspaceName && (
                    <p className="text-xs text-red-600">{fieldErrors.workspaceName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    disabled={loading}
                    aria-invalid={!!fieldErrors.email}
                    className={fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-red-600">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Choose a password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    disabled={loading}
                    aria-invalid={!!fieldErrors.password}
                    className={fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {fieldErrors.password ? (
                    <p className="text-xs text-red-600">{fieldErrors.password}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link href="/auth/signin" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
