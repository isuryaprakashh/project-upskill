import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Body, Button, Card, Field, H1, Muted, Screen } from './ui';
import { ApiError, login, register } from '../lib/api';
import { C } from '../theme';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isNew = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (isNew && password.length < 8) { setError('Use at least 8 characters for your password.'); return; }
    setBusy(true);
    try {
      if (isNew) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ height: 40 }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>Project Upskill</Text>
        <H1>{isNew ? 'Create your account' : 'Welcome back'}</H1>
        <Muted>{isNew ? 'Your progress syncs across your phone and the web.' : 'Sign in to pick up where you left off.'}</Muted>
        <Card style={{ gap: 14 }}>
          {error ? <View accessibilityLiveRegion="polite" style={{ backgroundColor: C.badSoft, borderRadius: 8, padding: 10 }}><Body style={{ color: C.bad, fontSize: 14 }}>{error}</Body></View> : null}
          {isNew && <Field label="Name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />}
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={isNew ? 'new-password' : 'current-password'} textContentType={isNew ? 'newPassword' : 'password'} onSubmitEditing={submit} />
          <Button title={busy ? 'One moment…' : isNew ? 'Create account' : 'Sign in'} onPress={submit} busy={busy} disabled={!email || !password || (isNew && !name)} />
        </Card>
        <Text style={{ textAlign: 'center', color: C.ink3, fontSize: 14 }}>
          {isNew ? 'Already have an account? ' : 'New here? '}
          <Link href={isNew ? '/login' : '/register'} replace style={{ color: C.primary, fontWeight: '600' }}>{isNew ? 'Sign in' : 'Create an account'}</Link>
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

