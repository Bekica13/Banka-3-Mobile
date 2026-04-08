import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { MOCK_VERIFICATIONS, MOCK_PENDING } from '../../../shared/data/mockData';
import { statusCfg, VStatus } from '../../../shared/utils/formatters';
import { container } from '../../../core/di/container';

interface Props {
  verified: boolean;
  onShowModal: () => void;
}

export default function VerifyScreen({ verified, onShowModal }: Props) {
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeTimer, setCodeTimer] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (codeTimer <= 0) {
      setGeneratedCode(null);
      return;
    }

    const t = setInterval(() => setCodeTimer(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [codeTimer]);

  const loadPending = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const pending = await container.verificationRepository.getPendingVerification();
      if (!pending) {
        setPendingId(null);
        setStatusMessage('Nema aktivnog verifikacionog zahteva.');
        return;
      }

      setPendingId(pending.id);
      setStatusMessage(`Aktivan je zahtev ${pending.id}. Spreman je za generisanje koda.`);
    } catch (e: any) {
      setErrorMessage(e.message ?? 'Neuspešno učitavanje aktivnog zahteva.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!pendingId) {
      setErrorMessage('Nema aktivnog verification request-a.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const generated = await container.verificationRepository.generateVerificationCode(pendingId);
      setGeneratedCode(generated.code);
      setCodeTimer(generated.expiresIn);
      setCopied(false);
      setStatusMessage(`Kod je generisan za verification request ${pendingId}.`);
    } catch (e: any) {
      setErrorMessage(e.message ?? 'Neuspešno generisanje verifikacionog koda.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Verifikacija</Text>
      <Text style={styles.subtitle}>Pregled aktivnog zahteva i generisanje verifikacionog koda</Text>

      {/* Pending banner */}
      {!verified && (
        <TouchableOpacity style={styles.pendingBanner} onPress={onShowModal} activeOpacity={0.7}>
          <View style={styles.pendingDot} />
          <View style={styles.flex1}>
            <Text style={styles.pendingTitle}>Čeka se potvrda</Text>
            <Text style={styles.pendingSub}>{MOCK_PENDING.action} • {MOCK_PENDING.amount}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.primary} />
        </TouchableOpacity>
      )}

      {/* Verification code */}
      <View style={styles.otpCard}>
        <View style={styles.otpHeader}>
          <View style={styles.otpIconWrap}>
            <Ionicons name="key" size={22} color={C.primary} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.otpTitle}>Verifikacioni kod</Text>
            <Text style={styles.otpDesc}>Flow po specifikaciji: pending request, generate code, confirm.</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.otpGenBtn, loading && { opacity: 0.7 }]} onPress={loadPending} activeOpacity={0.8} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="download-outline" size={20} color="#fff" />}
          <Text style={styles.otpGenText}>Preuzmi aktivan zahtev</Text>
        </TouchableOpacity>

        {!!statusMessage && <Text style={styles.infoText}>{statusMessage}</Text>}
        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        {generatedCode ? (
          <View style={styles.otpDisplay}>
            <View style={styles.otpCodeRow}>
              {generatedCode.split('').map((digit, i) => (
                <View key={i} style={styles.otpDigitBox}>
                  <Text style={styles.otpDigit}>{digit}</Text>
                </View>
              ))}
            </View>
            <View style={styles.otpTimerRow}>
              <Ionicons name="time-outline" size={14} color={codeTimer < 60 ? C.danger : C.textSecondary} />
              <Text style={[styles.otpTimerText, codeTimer < 60 && { color: C.danger }]}>
                Ističe za {fmtTime(codeTimer)}
              </Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specTitle}>Po specifikaciji</Text>
              <Text style={styles.specText}>Kod traje 5 minuta i vezan je za aktivan verification request sa backenda.</Text>
            </View>
            <View style={styles.otpActions}>
              <TouchableOpacity style={styles.otpCopyBtn} onPress={handleCopy} activeOpacity={0.7}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? C.accent : C.primary} />
                <Text style={[styles.otpCopyText, copied && { color: C.accent }]}>
                  {copied ? 'Kopirano!' : 'Prikaži kod'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.otpNewBtn, loading && { opacity: 0.7 }]} onPress={handleGenerateCode} activeOpacity={0.7} disabled={loading}>
                <Ionicons name="refresh" size={18} color={C.textSecondary} />
                <Text style={styles.otpNewText}>Novi kod</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : !!pendingId && (
          <TouchableOpacity style={[styles.otpGenBtn, loading && { opacity: 0.7 }]} onPress={handleGenerateCode} activeOpacity={0.8} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="key-outline" size={20} color="#fff" />}
            <Text style={styles.otpGenText}>Generiši kod</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* History */}
      <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>Istorija zahteva</Text>
      {MOCK_VERIFICATIONS.map(v => {
        const cfg = statusCfg[v.status as VStatus];
        return (
          <View key={v.id} style={styles.vRow}>
            <View style={[styles.vIcon, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.vAction} numberOfLines={1}>{v.action}</Text>
              <Text style={styles.vDate}>{v.date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.vAmount}>{v.amount}</Text>
              <Text style={[styles.vStatus, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: C.textSecondary, fontSize: 13, marginBottom: 16, marginTop: 4 },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600' },
  // Pending
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.primaryGlow, borderRadius: 16, padding: 14, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', marginBottom: 16 },
  pendingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  pendingTitle: { color: C.primary, fontSize: 14, fontWeight: '600' },
  pendingSub: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  // OTP
  otpCard: { backgroundColor: C.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border },
  otpHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  otpIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  otpTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  otpDesc: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  otpDisplay: { alignItems: 'center' },
  otpCodeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  otpDigitBox: { width: 44, height: 52, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  otpDigit: { color: C.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  otpTimerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  otpTimerText: { color: C.textSecondary, fontSize: 13 },
  otpActions: { flexDirection: 'row', gap: 10, width: '100%' },
  otpCopyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primaryGlow, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  otpCopyText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  otpNewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  otpNewText: { color: C.textSecondary, fontSize: 13, fontWeight: '500' },
  otpGenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, padding: 14, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  otpGenText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  specBox: { width: '100%', backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 12 },
  specTitle: { color: C.textPrimary, fontSize: 12, fontWeight: '600' },
  specText: { color: C.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
  infoText: { color: C.primary, fontSize: 12, marginTop: 14 },
  errorText: { color: C.danger, fontSize: 12, marginTop: 14 },
  // History
  vRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgCard, borderRadius: 14, padding: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border, marginBottom: 4 },
  vIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  vAction: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  vDate: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  vAmount: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  vStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
