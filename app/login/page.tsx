"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingUp, setSigningUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [signUpNeedsOtp, setSignUpNeedsOtp] = useState(false);
  const [resetNeedsOtp, setResetNeedsOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [signUpCooldown, setSignUpCooldown] = useState(0);
  const router = useRouter();

  const handleGoogle = async () => {
    setMessage('Redirecting to Google...');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setMessage(error.message);
  };

  // If already authenticated, send to user page before showing the form.
  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;

        if (data.session?.user) {
          router.replace('/user');
          return;
        }

        setCheckingSession(false);
      })
      .catch((error) => {
        console.error('Failed to check existing session:', error);
        if (isMounted) setCheckingSession(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        router.replace('/user');
      } else {
        setCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // Cooldown timers are kept in component state only (no localStorage persistence)
  useEffect(() => {
    // nothing to restore on mount
  }, []);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const startCooldown = (setter: React.Dispatch<React.SetStateAction<number>>) => {
    setter(60);
    const cooldownInterval = setInterval(() => {
      setter((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage('Enter an email');
      setMessageType('error');
      return;
    }
    if (!isValidEmail(email)) {
      setMessage('Please enter a valid email address');
      setMessageType('error');
      return;
    }
    if (signingUp) {
      if (!password) {
        setMessage('Enter a password');
        setMessageType('error');
        return;
      }
      if (signUpCooldown > 0) {
        setMessage(`Please wait ${signUpCooldown} seconds before trying again`);
        setMessageType('error');
        return;
      }
      setLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      setLoading(false);
      
      if (!response.ok) {
        setMessage(data.error || 'Sign up failed');
        setMessageType('error');
      } else {
        setSignUpNeedsOtp(true);
        setOtpCode('');
        setMessage('Account created. Enter the confirmation code sent to your email.');
        setMessageType('success');
        startCooldown(setSignUpCooldown);
      }
    } else {
      if (!password) {
        setMessage('Enter your password');
        setMessageType('error');
        return;
      }

      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);

      if (error) {
        setMessage(error.message);
        setMessageType('error');
        return;
      }

      router.replace('/user');
    }
  };

  const handleVerifySignUpCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode.trim()) {
      setMessage('Enter the confirmation code');
      setMessageType('error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otpCode.trim(),
      type: 'signup',
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      setMessageType('error');
      return;
    }

    router.replace('/user');
  };

  const handleResendSignUpCode = async () => {
    if (!email || !isValidEmail(email)) {
      setMessage('Enter a valid email address');
      setMessageType('error');
      return;
    }
    if (signUpCooldown > 0) {
      setMessage(`Please wait ${signUpCooldown} seconds before trying again`);
      setMessageType('error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      setMessageType('error');
      return;
    }

    setMessage('A new confirmation code has been sent.');
    setMessageType('success');
    startCooldown(setSignUpCooldown);
  };

  const handleForgotPassword = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage('Enter your email address');
      setMessageType('error');
      return;
    }
    if (!isValidEmail(email)) {
      setMessage('Please enter a valid email address');
      setMessageType('error');
      return;
    }
    if (resetCooldown > 0) {
      setMessage(`Please wait ${resetCooldown} seconds before trying again`);
      setMessageType('error');
      return;
    }

    setLoading(true);

    // First check if user exists
    try {
      const checkResponse = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const { exists } = await checkResponse.json();

      if (!exists) {
        setLoading(false);
        setMessage("Account doesn't exist. Please create one.");
        setMessageType('error');
        return;
      }
    } catch (err) {
      console.error('Error checking user:', err);
      setLoading(false);
      setMessage('Error checking account. Please try again.');
      setMessageType('error');
      return;
    }

    // Send a password reset OTP through the standard email OTP flow. This
    // avoids Supabase's recovery mailer/template path, which can fail with
    // "Error sending recovery email" when recovery email settings are invalid.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
      },
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      setMessageType('error');
    } else {
      setResetNeedsOtp(true);
      setOtpCode('');
      setMessage('Password reset code sent to your email.');
      setMessageType('success');
      startCooldown(setResetCooldown);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode.trim()) {
      setMessage('Enter the reset code');
      setMessageType('error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otpCode.trim(),
      type: 'email',
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      setMessageType('error');
      return;
    }

    router.push('/reset-password');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-white px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white p-6 sm:p-8 text-gray-800 rounded-lg shadow-lg w-full max-w-md text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-yellow-700">Checking Account</h1>
          <p className="text-sm sm:text-base text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-white px-4 sm:px-6 py-6 sm:py-8">
      <div className="bg-white p-6 sm:p-8 text-gray-800 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center text-yellow-700">
          {forgotPassword ? 'Reset Password' : signUpNeedsOtp ? 'Confirm Account' : signingUp ? 'Create an Account' : 'Sign In'}
        </h1>

        {!forgotPassword && (
          <>
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 px-4 py-3 sm:py-4 rounded-lg mb-4 hover:bg-gray-50 transition font-semibold text-sm sm:text-base"
            >
              {/* inline Google logo SVG */}
              <svg className="h-5 w-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.4-34.2-4.2-50.4H272v95.5h146.9c-6.3 34-25 62.8-53.4 82v67h86.3c50.4-46.4 80-114.6 80-194.1z"/>
                <path fill="#34A853" d="M272 544.3c72.6 0 133.6-23.9 178.1-64.9l-86.3-67c-24 16.1-54.6 25.6-91.8 25.6-70.5 0-130.3-47.6-151.6-111.6H32.5v69.8c44.6 88.3 136.7 148.7 239.5 148.7z"/>
                <path fill="#FBBC05" d="M120.4 323.4c-10.6-31.9-10.6-66.1 0-98L32.5 155.6c-38.2 76.4-38.2 166.8 0 243.2l87.9-75.4z"/>
                <path fill="#EA4335" d="M272 107.7c37.3 0 70.8 12.8 97.1 37.9l72.8-72.8C405.6 23.9 344.6 0 272 0 169.2 0 77.1 60.4 32.5 148.7l87.9 69.8c21.3-64 81.1-111.6 151.6-111.6z"/>
              </svg>
              Continue with Google
            </button>
            <div className="text-center my-4 text-gray-400 text-sm">OR</div>
          </>
        )}

        {forgotPassword ? (
          <form onSubmit={resetNeedsOtp ? handleVerifyResetCode : handleForgotPassword} className="flex flex-col gap-4 sm:gap-5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 sm:py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base"
              placeholder="Enter your email address"
              disabled={loading || resetCooldown > 0}
              required
            />
            {resetNeedsOtp && (
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full border border-gray-300 px-4 py-3 sm:py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base"
                placeholder="Enter reset code"
                disabled={loading}
                required
              />
            )}
            <button 
              type="submit" 
              disabled={loading || (!resetNeedsOtp && resetCooldown > 0)}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 sm:py-4 rounded-lg font-semibold transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed text-base sm:text-lg"
            >
              {loading ? 'Processing...' : resetNeedsOtp ? 'Verify Code' : resetCooldown > 0 ? `Resend in ${resetCooldown}s` : 'Send Reset Code'}
            </button>
            {resetNeedsOtp && (
              <button
              type="button"
              onClick={handleForgotPassword}
                disabled={loading || resetCooldown > 0}
                className="text-center text-yellow-600 hover:underline font-semibold text-sm sm:text-base py-2 transition disabled:text-gray-400 disabled:no-underline"
              >
                {resetCooldown > 0 ? `Resend code in ${resetCooldown}s` : 'Resend code'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setForgotPassword(false);
                setResetNeedsOtp(false);
                setMessage('');
                setEmail('');
                setOtpCode('');
              }}
              className="text-center text-yellow-600 hover:underline font-semibold text-sm sm:text-base py-2 transition"
            >
              Back to Sign In
            </button>
          </form>
        ) : signUpNeedsOtp ? (
          <form onSubmit={handleVerifySignUpCode} className="flex flex-col gap-4 sm:gap-5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 sm:py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base"
              placeholder="Enter your email address"
              disabled={loading}
              required
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 sm:py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base"
              placeholder="Enter confirmation code"
              disabled={loading}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 sm:py-4 rounded-lg font-semibold transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed text-base sm:text-lg"
            >
              {loading ? 'Verifying...' : 'Confirm Account'}
            </button>
            <button
              type="button"
              onClick={handleResendSignUpCode}
              disabled={loading || signUpCooldown > 0}
              className="text-center text-yellow-600 hover:underline font-semibold text-sm sm:text-base py-2 transition disabled:text-gray-400 disabled:no-underline"
            >
              {signUpCooldown > 0 ? `Resend code in ${signUpCooldown}s` : 'Resend code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmail} className="flex flex-col gap-4 sm:gap-5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-4 py-3 sm:py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base"
              placeholder="Enter your email address"
              disabled={loading || (signingUp && signUpCooldown > 0)}
              required
            />
            {!forgotPassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 px-4 py-3 sm:py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-base"
                placeholder={signingUp ? 'Choose a password' : 'Enter your password'}
                disabled={loading || signUpCooldown > 0}
                required
              />
            )}
            <button 
              type="submit" 
              disabled={loading || (signingUp && signUpCooldown > 0)}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 sm:py-4 rounded-lg font-semibold transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed text-base sm:text-lg"
            >
              {loading ? 'Processing...' : signingUp ? (signUpCooldown > 0 ? `Try again in ${signUpCooldown}s` : 'Create Account') : 'Sign In'}
            </button>
          </form>
        )}

        {message && (
          <p className={`mt-4 text-center text-sm sm:text-base p-3 sm:p-4 rounded-lg font-medium ${
            messageType === 'error' ? 'bg-red-100 text-red-700' :
            messageType === 'success' ? 'bg-green-100 text-green-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {message}
          </p>
        )}

        {!forgotPassword && (
          <div className="mt-6 sm:mt-8 border-t border-gray-200 pt-4 sm:pt-6">
            {signingUp ? (
              <p className="text-center text-sm sm:text-base text-gray-600">
                Already have an account?{' '}
                <button className="text-yellow-500 hover:underline font-semibold transition" onClick={() => {
                setSigningUp(false);
                setSignUpNeedsOtp(false);
                setPassword('');
                setOtpCode('');
                setMessage('');
              }}>
                  Sign in
                </button>
              </p>
            ) : (
              <>
                <p className="text-center text-sm sm:text-base mb-3 sm:mb-4">
                  <button
                    className="text-yellow-500 hover:underline font-semibold transition"
                    onClick={() => {
                      setForgotPassword(true);
                      setMessage('');
                    }}
                  >
                    Forgot your password?
                  </button>
                </p>
                <p className="text-center text-sm sm:text-base text-gray-600">
                  Don&apos;t have an account?{' '}
                  <button className="text-yellow-500 hover:underline font-semibold transition" onClick={() => {
                    setSigningUp(true);
                    setSignUpNeedsOtp(false);
                    setOtpCode('');
                    setMessage('');
                  }}>
                    Create one now
                  </button>
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
