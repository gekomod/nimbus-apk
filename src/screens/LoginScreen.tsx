// LoginScreen — sheet variant with biometric & 2FA, real API login
import React, { useRef, useState } from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { C, FONTS } from '../tokens';
import { NbIcon, PrimaryBtn, Toggle } from '../components/ui';
import { apiLogin, apiVerifyTotp } from '../api';

// ── NimbusLogo ───────────────────────────────────────────────────────────────
function NimbusLogo({ size = 58 }: { size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.28,
      backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
      shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    }}>
      <NbIcon name="cloud" size={size * 0.52} color="#fff" stroke={2.1} />
    </View>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────
function Field({ icon, label, value, onChange, secureTextEntry, trailing, mono }: any) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontFamily: FONTS.semibold, fontSize: 12.5, color: C.textDim, marginLeft: 2, marginBottom: 6 }}>{label}</Text>
      <View style={[styles.fieldWrap, focus && styles.fieldFocus]}>
        {icon && <NbIcon name={icon} size={18} color={focus ? C.accent : C.textFaint} />}
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={[styles.fieldInput, mono && { fontFamily: FONTS.mono }]}
          placeholderTextColor={C.textFaint}
        />
        {trailing}
      </View>
    </View>
  );
}

// ── CodeInput (2FA) ───────────────────────────────────────────────────────────
function CodeInput({ value, onChange, error }: any) {
  const refs = useRef<(TextInput | null)[]>([]);
  const chars = value.split('');
  const set = (i: number, v: string) => {
    v = v.replace(/\D/g, '').slice(-1);
    const arr = chars.slice();
    arr[i] = v;
    const next = arr.join('').slice(0, 6);
    onChange(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };
  return (
    <View style={{ flexDirection: 'row', gap: 9, justifyContent: 'center' }}>
      {[0,1,2,3,4,5].map(i => (
        <TextInput
          key={i}
          ref={(el: TextInput | null) => { refs.current[i] = el; }}
          value={chars[i] || ''}
          onChangeText={(v: string) => set(i, v)}
          keyboardType="numeric"
          maxLength={1}
          autoFocus={i === 0}
          style={[styles.codeBox, { borderColor: error ? C.danger : chars[i] ? C.accent : C.border }]}
        />
      ))}
    </View>
  );
}

// ── BiometricSheet ────────────────────────────────────────────────────────────
function BiometricSheet({ onClose, onSuccess }: any) {
  const [done, setDone] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 550, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ]));
    loop.start();
    const a = setTimeout(() => { loop.stop(); setDone(true); }, 1400);
    const b = setTimeout(() => onSuccess(), 2100);
    return () => { clearTimeout(a); clearTimeout(b); loop.stop(); };
  }, []);
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.bioOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.bioSheet}>
          <View style={styles.bioHandle} />
          <View style={{ alignItems: 'center', gap: 18, paddingTop: 8 }}>
            <Animated.View style={[styles.bioIconWrap,
              { backgroundColor: done ? C.okDim : C.accentDim, transform: [{ scale: pulse }] }]}>
              <NbIcon name={done ? 'check' : 'fingerprint'} size={48} color={done ? C.ok : C.accent} stroke={done ? 2.6 : 1.8} />
            </Animated.View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.bioTitle}>Potwierdź tożsamość</Text>
              <Text style={styles.bioSub}>{done ? '✓' : 'Dotknij czytnika linii papilarnych'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main LoginScreen ──────────────────────────────────────────────────────────
export interface LoginScreenProps {
  onSuccess: (serverUrl: string, username: string, password: string, token: string) => void;
  savedServerUrl?: string;
  savedUsername?: string;
  savedPassword?: string;
}

export default function LoginScreen({ onSuccess, savedServerUrl, savedUsername, savedPassword }: LoginScreenProps) {
  const [stage, setStage] = useState<'form' | '2fa'>('form');
  const [addr, setAddr] = useState(savedServerUrl || '192.168.1.10');
  const [user, setUser] = useState(savedUsername || '');
  const [pass, setPass] = useState(savedPassword || '');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [bio, setBio] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState(false);
  const [done, setDone] = useState(false);
  const pendingToken = useRef('');

  const buildBase = () => {
    const a = addr.trim();
    return a.startsWith('http') ? a.replace(/\/+$/, '') : 'http://' + a.replace(/\/+$/, '');
  };

  const submit = async () => {
    setErrMsg('');
    setLoading(true);
    try {
      const base = buildBase();
      const { initApi } = await import('../api');
      initApi(base, '');
      const data = await apiLogin(user, pass);
      // Backend returns needs_2fa + tmp_token when TOTP is enabled
      if (data.needs_2fa && data.tmp_token) {
        pendingToken.current = data.tmp_token;
        setLoading(false);
        setStage('2fa');
      } else if (data.success) {
        setDone(true);
        setTimeout(() => onSuccess(base, user, pass, ''), 600);
      } else {
        throw new Error('Logowanie nieudane');
      }
    } catch (e: any) {
      setErrMsg(e?.message ?? 'Błąd logowania');
      setLoading(false);
    }
  };

  const verify = async () => {
    if (code.length < 6) { setCodeErr(true); return; }
    setLoading(true);
    try {
      const data = await apiVerifyTotp(pendingToken.current, code);
      if (data.success) {
        setLoading(false); setDone(true);
        setTimeout(() => onSuccess(buildBase(), user, pass, ''), 600);
      } else {
        setCodeErr(true); setLoading(false);
      }
    } catch {
      setCodeErr(true); setLoading(false);
    }
  };

  const finishBio = () => {
    setBio(false); setDone(true);
    setTimeout(() => onSuccess(buildBase(), user, pass, pendingToken.current), 500);
  };

  const passEye = (
    <TouchableOpacity onPress={() => setShow(s => !s)} style={{ padding: 2 }}>
      <NbIcon name={show ? 'eye_off' : 'eye'} size={18} color={C.textFaint} />
    </TouchableOpacity>
  );

  // ── 2FA stage ───────────────────────────────────────────────────────────────
  if (stage === '2fa') {
    return (
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 26 }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => setStage('form')} activeOpacity={0.75}
            style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: C.surface2,
              borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
            <NbIcon name="arrow_left" size={20} />
          </TouchableOpacity>
          <View style={{ flex: 1, justifyContent: 'center', paddingTop: 40 }}>
            <View style={{ width: 60, height: 60, borderRadius: 17, backgroundColor: C.accentDim,
              alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
              <NbIcon name="key" size={28} color={C.accent} />
            </View>
            <Text style={styles.h1}>Weryfikacja dwuetapowa</Text>
            <Text style={styles.sub}>Wpisz 6-cyfrowy kod z aplikacji uwierzytelniającej</Text>
            <CodeInput value={code} onChange={(v: string) => { setCode(v); setCodeErr(false); }} error={codeErr} />
            {codeErr && <Text style={{ color: C.danger, fontFamily: FONTS.regular, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
              Nieprawidłowy kod, spróbuj ponownie
            </Text>}
            <View style={{ height: 26 }} />
            <PrimaryBtn onPress={verify} loading={loading} done={done}>Zweryfikuj</PrimaryBtn>
            <TouchableOpacity onPress={() => setCode('')} style={{ marginTop: 18, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONTS.semibold, color: C.accent, fontSize: 14 }}>Wyślij ponownie kod</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Sheet form ──────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.hero}>
        <NimbusLogo size={58} />
        <Text style={styles.heroTitle}>Witaj ponownie</Text>
        <Text style={styles.heroSub}>Nimbus · Bezpieczny panel NAS</Text>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        <Field icon="server" label="Adres serwera" value={addr} onChange={(v: string) => { setAddr(v); setErrMsg(''); }} mono
          trailing={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ok }} />} />
        <Field icon="user" label="Nazwa użytkownika" value={user} onChange={(v: string) => { setUser(v); setErrMsg(''); }} />
        <Field icon="lock" label="Hasło" value={pass} onChange={(v: string) => { setPass(v); setErrMsg(''); }}
          secureTextEntry={!show} trailing={passEye} />

        {errMsg ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.dangerDim,
            borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: C.danger }}>
            <NbIcon name="alert" size={16} color={C.danger} />
            <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: C.danger, flex: 1 }}>{errMsg}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, marginTop: 4 }}>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 14, color: C.textDim }}>Zapamiętaj tę sesję</Text>
          <Toggle on={remember} onChange={setRemember} />
        </View>

        <PrimaryBtn onPress={submit} loading={loading} done={done}>Zaloguj się</PrimaryBtn>

        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>lub</Text>
          <View style={styles.divLine} />
        </View>

        <TouchableOpacity onPress={() => setBio(true)} activeOpacity={0.8} style={styles.bioBtn}>
          <NbIcon name="fingerprint" size={22} color={C.accent} />
          <Text style={styles.bioBtnText}>Użyj biometrii</Text>
        </TouchableOpacity>
      </ScrollView>

      {bio && <BiometricSheet onClose={() => setBio(false)} onSuccess={finishBio} />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hero: { paddingHorizontal: 30, paddingTop: 52, paddingBottom: 42 },
  heroTitle: { fontFamily: FONTS.extrabold, fontSize: 31, color: C.text, marginTop: 22, marginBottom: 6, letterSpacing: -0.8 },
  heroSub: { fontFamily: FONTS.regular, fontSize: 15, color: C.textDim },
  sheet: { flex: 1, backgroundColor: C.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, marginTop: -22, borderTopWidth: 1, borderTopColor: C.border },
  sheetContent: { padding: 26, paddingBottom: 40 },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 52, paddingHorizontal: 14,
    backgroundColor: C.surface2, borderRadius: 13,
    borderWidth: 1.5, borderColor: C.border,
  },
  fieldFocus: { borderColor: C.accent },
  fieldInput: { flex: 1, fontFamily: FONTS.regular, fontSize: 16, color: C.text },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divText: { fontFamily: FONTS.semibold, fontSize: 12, color: C.textFaint },
  bioBtn: {
    height: 54, borderRadius: 14, backgroundColor: C.surface2,
    borderWidth: 1.5, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  bioBtnText: { fontFamily: FONTS.bold, fontSize: 15.5, color: C.text },
  codeBox: {
    width: 46, height: 58, textAlign: 'center',
    fontFamily: FONTS.monobold, fontSize: 24, color: C.text,
    backgroundColor: C.surface2, borderRadius: 13, borderWidth: 1.5,
  },
  h1: { fontFamily: FONTS.extrabold, fontSize: 27, color: C.text, marginBottom: 8, letterSpacing: -0.5 },
  sub: { fontFamily: FONTS.regular, fontSize: 15, color: C.textDim, marginBottom: 30, lineHeight: 22 },
  bioOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  bioSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, paddingBottom: 40, borderTopWidth: 1, borderTopColor: C.border,
  },
  bioHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderHi, alignSelf: 'center', marginBottom: 24 },
  bioIconWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  bioTitle: { fontFamily: FONTS.bold, fontSize: 18, color: C.text },
  bioSub: { fontFamily: FONTS.regular, fontSize: 14, color: C.textDim, marginTop: 4 },
});
