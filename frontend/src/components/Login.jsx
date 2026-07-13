import React, { useState } from 'react';
import styles from './Login.module.css';
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('analyst@altuni.ai');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network authentication delay
    setTimeout(() => {
      if (email === 'analyst@altuni.ai' && password === 'password123') {
        onLogin();
      } else {
        setError('Invalid credentials. Use the dummy account details below.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.glassCard}>
        {/* Brand Header */}
        <div className={styles.header}>
          <div className={styles.logoRow}>
            <Sparkles className={styles.logoIcon} size={28} />
            <span className={styles.logoText}>Altuni AI Labs</span>
          </div>
          <h2 className={styles.title}>Investment Research Portal</h2>
          <p className={styles.subtitle}>Enter credentials to access the valuation engine</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={styles.errorAlert}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Corporate Email</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@company.com"
                required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Access Password</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={styles.input}
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className={styles.submitBtn}>
            {isLoading ? (
              <span className={styles.spinner}></span>
            ) : (
              <>
                <span>Authenticate Session</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Dummy Credentials Callout */}
        <div className={styles.credentialsCallout}>
          <span className={styles.calloutTitle}>🔑 Evaluator Dummy Access</span>
          <div className={styles.credentialsRow}>
            <span>Email: <strong>analyst@altuni.ai</strong></span>
            <span>Password: <strong>password123</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
