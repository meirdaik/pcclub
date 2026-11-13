import { useState } from 'react';
import { View } from 'react-native';

import { submitIdentity } from '@/api/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { errorMessage, t } from '@/i18n';
import { isValidIin } from '@/lib/iin';
import { Button, Field, Notice, Screen } from '@/ui/components';
import { GUTTER, colors } from '@/ui/theme';
import { Logo } from '@/ui/navicons';
import { T } from '@/ui/type';

/**
 * IIN verification. The local check only catches typos; the server asks the identity registry
 * and decides. The IIN is sent once and never stored or logged by the app.
 */
export default function IdentityScreen() {
  const { setUser, signOut } = useAuth();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [iin, setIin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iinComplete = iin.length === 12;
  const iinError = iinComplete && !isValidIin(iin) ? t.identity.iinInvalid : null;

  async function submit() {
    if (!firstName.trim() || !lastName.trim()) {
      setError(t.identity.nameRequired);
      return;
    }
    if (!isValidIin(iin)) {
      setError(t.identity.iinInvalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setUser(
        await submitIdentity({ iin, first_name: firstName.trim(), last_name: lastName.trim() }),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ padding: GUTTER, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Logo size={32} />
          <T v="wordmark">{t.clubs.wordmark}</T>
        </View>
        <T v="title">{t.identity.title}</T>
        <T v="body" color={colors.muted}>
          {t.identity.subtitle}
        </T>
        <Field
          label={t.identity.lastName}
          value={lastName}
          onChangeText={setLastName}
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
        />
        <Field
          label={t.identity.firstName}
          value={firstName}
          onChangeText={setFirstName}
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
        />
        <Field
          label={t.identity.iin}
          value={iin}
          onChangeText={(value) => setIin(value.replace(/\D/g, '').slice(0, 12))}
          placeholder={t.identity.iinHint}
          keyboardType="number-pad"
          autoComplete="off"
          maxLength={12}
          error={iinError}
        />
        {error ? <Notice>{error}</Notice> : null}
        <Button title={t.identity.submit} arrow onPress={() => void submit()} loading={busy} />
        <Button title={t.common.signOut} variant="link" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}
