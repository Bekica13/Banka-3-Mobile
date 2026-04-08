import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmt } from '../../../shared/utils/formatters';
import { useAccounts } from '../../../shared/hooks/useFeatures';
import { useExchangeRates } from '../../../shared/hooks/useFeatures';
import { container } from '../../../core/di/container';
import { Account } from '../../../shared/types/models';

interface Props { onBack: () => void; }

type VerificationStepId = 'request' | 'pending' | 'code' | 'confirm';
type VerificationStepState = 'pending' | 'active' | 'completed' | 'error';

const VERIFICATION_STEPS: Array<{ id: VerificationStepId; title: string; description: string }> = [
  {
    id: 'request',
    title: 'Request',
    description: 'Kreiranje verification zahteva za konverziju.',
  },
  {
    id: 'pending',
    title: 'Pending',
    description: 'Preuzimanje aktivnog verification zahteva.',
  },
  {
    id: 'code',
    title: 'Code',
    description: 'Generisanje jednokratnog koda za potvrdu.',
  },
  {
    id: 'confirm',
    title: 'Confirm',
    description: 'Slanje koda i izvršenje transakcije.',
  },
];

export default function ExchangeScreen({ onBack }: Props) {
  const { state: accountsState, refresh: refreshAccounts } = useAccounts();
  const { state: ratesState } = useExchangeRates();

  const accounts = accountsState.data ?? [];
  const rates = ratesState.data ?? [];

  const rsdAccounts = accounts.filter(a => a.currency === 'RSD');
  const forAccounts = accounts.filter(a => a.currency !== 'RSD');

  const [fromAcc, setFromAcc] = useState<Account | null>(null);
  const [toAcc, setToAcc]     = useState<Account | null>(null);
  const [amount, setAmount]   = useState('');
  const [step, setStep]       = useState<'rates' | 'convert' | 'confirm' | 'success'>('rates');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [verificationStep, setVerificationStep] = useState<VerificationStepId | null>(null);
  const [completedConversion, setCompletedConversion] = useState<{ convertedAmount: number; rate: number } | null>(null);

  // Pick defaults once accounts load
  const resolvedFrom = fromAcc ?? rsdAccounts[0] ?? accounts[0] ?? null;
  const resolvedTo   = toAcc   ?? forAccounts[0] ?? accounts.find(a => a.accountNumber !== resolvedFrom?.accountNumber) ?? null;

  // ── Derived exchange logic ──────────────────────────────────────────────────
  const buying      = resolvedFrom?.currency === 'RSD';
  const foreignCur  = buying ? resolvedTo?.currency : resolvedFrom?.currency;
  const rateObj     = rates.find(r => r.fromCurrency === foreignCur);
  const activeRate  = buying ? (rateObj?.sellRate ?? 0) : (rateObj?.buyRate ?? 0);

  const amountNum = useMemo(() => {
    const normalized = amount.replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);

  const hasTypedAmount      = amount.trim() !== '';
  const hasPositiveAmount   = amountNum > 0;
  const hasEnoughFunds      = amountNum <= (resolvedFrom?.availableBalance ?? 0);
  const differentAccounts   = resolvedFrom?.accountNumber !== resolvedTo?.accountNumber;
  const differentCurrencies = resolvedFrom?.currency !== resolvedTo?.currency;
  const hasRate             = activeRate > 0;

  const isValid =
    hasTypedAmount && hasPositiveAmount && hasEnoughFunds &&
    differentAccounts && differentCurrencies && hasRate;

  const validationMessage = useMemo(() => {
    if (!hasTypedAmount)      return '';
    if (!hasPositiveAmount)   return 'Unesite ispravan iznos.';
    if (!differentAccounts)   return 'Izaberite različite račune.';
    if (!differentCurrencies) return 'Računi moraju biti u različitim valutama.';
    if (!hasRate)             return 'Kurs za izabranu valutu nije dostupan.';
    if (!hasEnoughFunds)      return 'Nedovoljno sredstava na računu.';
    return '';
  }, [hasTypedAmount, hasPositiveAmount, differentAccounts, differentCurrencies, hasRate, hasEnoughFunds]);

  const converted = useMemo(() => {
    if (!isValid) return 0;
    return buying ? amountNum / activeRate : amountNum * activeRate;
  }, [amountNum, activeRate, buying, isValid]);

  const resolveCompletedAmount = (value: unknown, fallback: number) => {
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(parsed) ? Number(parsed) : fallback;
  };

  const handleSwap = () => {
    const prev = resolvedFrom;
    setSubmitError('');
    setVerificationStep(null);
    setVerificationStatus('');
    setFromAcc(resolvedTo);
    setToAcc(prev);
  };

  const handleAmountChange = (text: string) => {
    const normalized = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parts = normalized.split('.');
    setSubmitError('');
    setVerificationStep(null);
    setVerificationStatus('');
    setAmount(parts.length <= 2 ? normalized : `${parts[0]}.${parts.slice(1).join('')}`);
  };

  const handleConfirm = async () => {
    if (!isValid || !resolvedFrom || !resolvedTo) return;

    setSubmitting(true);
    setSubmitError('');
    setVerificationStatus('');
    try {
      setVerificationStep('request');
      setVerificationStatus('Kreiram verification zahtev...');
      const preview = await container.exchangeRepository.convert(
        resolvedFrom.id,
        resolvedTo.id,
        resolvedFrom.currency,
        resolvedTo.currency,
        amountNum,
      );

      const verificationPayload = {
        from_account: resolvedFrom.accountNumber,
        to_account: resolvedTo.accountNumber,
        amount: amountNum,
        description: `exchange ${amountNum} ${resolvedFrom.currency} to ${resolvedTo.currency}`,
        from_currency: resolvedFrom.currency,
        to_currency: resolvedTo.currency,
        converted_amount: preview.convertedAmount,
        exchange_rate: preview.rate,
      };

      const verificationRequest = await container.verificationRepository.createVerificationRequest(
        'exchange',
        verificationPayload,
      );
      setVerificationStep('pending');
      setVerificationStatus(`Kreiran je verifikacioni zahtev ${verificationRequest.verificationId}.`);

      const pending = await container.verificationRepository.getPendingVerification();
      const verificationId = pending?.id ?? verificationRequest.verificationId;
      setVerificationStep('code');
      setVerificationStatus('Aktivan verification zahtev je pronađen. Generišem kod...');
      const generatedCode = await container.verificationRepository.generateVerificationCode(verificationId);
      setVerificationStep('confirm');
      setVerificationStatus(`Generisan je kod ${generatedCode.code}. Potvrđujem transakciju...`);

      const confirmation = await container.verificationRepository.confirmVerification(
        verificationId,
        generatedCode.code,
      );

      setCompletedConversion({
        convertedAmount: resolveCompletedAmount(
          confirmation.result?.final_amount ?? confirmation.result?.finalAmount,
          preview.convertedAmount
        ),
        rate: preview.rate,
      });
      await refreshAccounts();
      setStep('success');
    } catch (e: any) {
      setSubmitError(e.message ?? 'Greška pri konverziji');
    } finally {
      setSubmitting(false);
    }
  };

  const getVerificationStepState = (stepId: VerificationStepId): VerificationStepState => {
    if (submitError && verificationStep === stepId) return 'error';
    if (!verificationStep) return 'pending';

    const currentIndex = VERIFICATION_STEPS.findIndex(step => step.id === verificationStep);
    const stepIndex = VERIFICATION_STEPS.findIndex(step => step.id === stepId);

    if (stepIndex < currentIndex || step === 'success') return 'completed';
    if (stepIndex === currentIndex) return submitting ? 'active' : 'completed';
    return 'pending';
  };

  const getStepColors = (state: VerificationStepState) => {
    switch (state) {
      case 'completed':
        return {
          borderColor: 'rgba(6,214,160,0.28)',
          backgroundColor: C.accentGlow,
          iconColor: C.accent,
          titleColor: C.textPrimary,
          descriptionColor: C.textSecondary,
        };
      case 'active':
        return {
          borderColor: 'rgba(59,130,246,0.35)',
          backgroundColor: C.primaryGlow,
          iconColor: C.primary,
          titleColor: C.textPrimary,
          descriptionColor: C.textSecondary,
        };
      case 'error':
        return {
          borderColor: 'rgba(239,68,68,0.35)',
          backgroundColor: C.dangerGlow,
          iconColor: C.danger,
          titleColor: C.textPrimary,
          descriptionColor: '#fca5a5',
        };
      default:
        return {
          borderColor: C.border,
          backgroundColor: C.bgCard,
          iconColor: C.textMuted,
          titleColor: C.textSecondary,
          descriptionColor: C.textMuted,
        };
    }
  };

  const getStepIcon = (state: VerificationStepState) => {
    switch (state) {
      case 'completed':
        return 'checkmark-circle';
      case 'active':
        return 'time';
      case 'error':
        return 'close-circle';
      default:
        return 'ellipse-outline';
    }
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (accountsState.loading || ratesState.loading) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (accountsState.error || ratesState.error) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.textSecondary} />
        <Text style={[styles.successSub, { marginTop: 12 }]}>
          {accountsState.error ?? ratesState.error}
        </Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Nazad</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!resolvedFrom || !resolvedTo) {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Text style={styles.successSub}>Nema dostupnih računa.</Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Nazad</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fromPickerAccounts = accounts.filter(a => a.accountNumber !== resolvedTo.accountNumber);
  const toPickerAccounts   = accounts.filter(a => a.accountNumber !== resolvedFrom.accountNumber);

  // ── Success ─────────────────────────────────────────────────────────────────
  if (step === 'success') {
    const successConvertedAmount = completedConversion?.convertedAmount ?? converted;
    const successRate = completedConversion?.rate ?? activeRate;

    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        <Text style={styles.successTitle}>Konverzija uspešna!</Text>
        <Text style={styles.successSub}>Sredstva su konvertovana i upisana u bazu.</Text>
        <View style={styles.card}>
          <View style={styles.sRow}><Text style={styles.sLabel}>Sa</Text><Text style={styles.sVal}>{resolvedFrom.name}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Na</Text><Text style={styles.sVal}>{resolvedTo.name}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Iznos</Text><Text style={styles.sVal}>{fmt(amountNum, resolvedFrom.currency)}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Dobijate</Text><Text style={[styles.sVal, { color: C.accent }]}>{fmt(successConvertedAmount, resolvedTo.currency)}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Kurs</Text><Text style={styles.sVal}>1 {foreignCur} = {successRate.toFixed(2)} RSD</Text></View>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
          <Text style={styles.primaryBtnText}>Nazad na početnu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Confirm ──────────────────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('convert')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Potvrda konverzije</Text>
        </View>
        <View style={styles.confirmCard}>
          {[
            ['Sa računa', `${resolvedFrom.name} (${resolvedFrom.currency})`],
            ['Na račun',  `${resolvedTo.name} (${resolvedTo.currency})`],
            ['Iznos',     fmt(amountNum, resolvedFrom.currency)],
            ['Dobijate',  fmt(converted, resolvedTo.currency)],
            ['Kurs',      `1 ${foreignCur} = ${activeRate.toFixed(4)} RSD`],
          ].map(([l, v], i) => (
            <View key={l} style={[styles.cRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.cLabel}>{l}</Text>
              <Text style={styles.cVal}>{v}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.previewRate}>
          Po specifikaciji, potvrda ide kroz verification flow: request, pending, generate code, confirm.
        </Text>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Status verification toka</Text>
          {VERIFICATION_STEPS.map((verificationStepItem, index) => {
            const stepState = getVerificationStepState(verificationStepItem.id);
            const stepColors = getStepColors(stepState);
            return (
              <View
                key={verificationStepItem.id}
                style={[
                  styles.statusRow,
                  {
                    borderColor: stepColors.borderColor,
                    backgroundColor: stepColors.backgroundColor,
                  },
                  index > 0 && styles.statusRowSpacing,
                ]}
              >
                <View style={[styles.statusIconWrap, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                  <Ionicons name={getStepIcon(stepState)} size={18} color={stepColors.iconColor} />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.statusStepTitle, { color: stepColors.titleColor }]}>
                    {verificationStepItem.title}
                  </Text>
                  <Text style={[styles.statusStepDescription, { color: stepColors.descriptionColor }]}>
                    {verificationStepItem.description}
                  </Text>
                </View>
                <Text style={[styles.statusBadge, { color: stepColors.iconColor }]}>
                  {stepState === 'completed'
                    ? 'Gotovo'
                    : stepState === 'active'
                      ? 'U toku'
                      : stepState === 'error'
                        ? 'Greška'
                        : 'Čeka'}
                </Text>
              </View>
            );
          })}
        </View>
        {!!verificationStatus && <Text style={[styles.previewRate, { color: C.primary }]}>{verificationStatus}</Text>}
        {!!submitError && <Text style={styles.errorText}>{submitError}</Text>}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.secBtn} onPress={() => setStep('convert')}>
            <Text style={styles.secBtnText}>Nazad</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1.5, opacity: isValid && !submitting ? 1 : 0.5 }]}
            disabled={!isValid || submitting}
            onPress={handleConfirm}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Potvrdi</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Convert form ─────────────────────────────────────────────────────────────
  if (step === 'convert') {
    return (
      <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('rates')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Konverzija</Text>
        </View>

        <Text style={styles.label}>SA RAČUNA</Text>
        <TouchableOpacity style={styles.accSel} onPress={() => setShowFrom(true)}>
          <Ionicons name="wallet" size={18} color={C.primary} />
          <View style={styles.flex1}>
            <Text style={styles.accSelName}>{resolvedFrom.name} ({resolvedFrom.currency})</Text>
            <Text style={styles.accSelBal}>{fmt(resolvedFrom.availableBalance, resolvedFrom.currency)}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
          <Ionicons name="swap-vertical" size={22} color={C.primary} />
        </TouchableOpacity>

        <Text style={styles.label}>NA RAČUN</Text>
        <TouchableOpacity style={styles.accSel} onPress={() => setShowTo(true)}>
          <Ionicons name="wallet" size={18} color={C.accent} />
          <View style={styles.flex1}>
            <Text style={styles.accSelName}>{resolvedTo.name} ({resolvedTo.currency})</Text>
            <Text style={styles.accSelBal}>{fmt(resolvedTo.availableBalance, resolvedTo.currency)}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 20 }]}>IZNOS ({resolvedFrom.currency})</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            placeholderTextColor={C.textMuted}
            keyboardType="decimal-pad"
          />
          <Text style={styles.cur}>{resolvedFrom.currency}</Text>
        </View>

        {!!validationMessage && <Text style={styles.errorText}>{validationMessage}</Text>}

        {isValid && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Dobijate približno</Text>
            <Text style={styles.previewAmount}>{fmt(converted, resolvedTo.currency)}</Text>
            <Text style={styles.previewRate}>
              Kurs: 1 {foreignCur} = {activeRate.toFixed(2)} RSD ({buying ? 'prodajni' : 'kupovni'})
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 20, opacity: isValid ? 1 : 0.5 }]}
          disabled={!isValid}
          onPress={() => setStep('confirm')}
        >
          <Text style={styles.primaryBtnText}>Nastavi</Text>
        </TouchableOpacity>

        {/* Account pickers */}
        {[
          { visible: showFrom, setVisible: setShowFrom, setAcc: setFromAcc, accs: fromPickerAccounts },
          { visible: showTo,   setVisible: setShowTo,   setAcc: setToAcc,   accs: toPickerAccounts  },
        ].map((p, i) => (
          <Modal key={i} visible={p.visible} transparent animationType="slide">
            <View style={styles.mOverlay}>
              <View style={styles.mSheet}>
                <View style={styles.mHead}>
                  <Text style={styles.mTitle}>Odaberite račun</Text>
                  <TouchableOpacity onPress={() => p.setVisible(false)}>
                    <Ionicons name="close" size={24} color={C.textSecondary} />
                  </TouchableOpacity>
                </View>
                {p.accs.map((a, index) => (
                  <TouchableOpacity key={`exchange-picker-${a.id}-${a.accountNumber}-${a.currency}-${a.name}-${index}`} style={styles.mItem} onPress={() => { p.setAcc(a); p.setVisible(false); }}>
                    <View style={styles.mItemIcon}><Ionicons name="wallet" size={18} color={C.primary} /></View>
                    <View style={styles.flex1}>
                      <Text style={styles.mItemTitle}>{a.name} ({a.currency})</Text>
                      <Text style={styles.mItemSub}>{fmt(a.availableBalance, a.currency)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        ))}
      </ScrollView>
    );
  }

  // ── Rates list ───────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.hRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Menjačnica</Text>
      </View>

      <TouchableOpacity style={styles.convertBanner} onPress={() => setStep('convert')} activeOpacity={0.8}>
        <Ionicons name="swap-horizontal" size={22} color="#fff" />
        <View style={styles.flex1}>
          <Text style={styles.bannerTitle}>Konvertuj valutu</Text>
          <Text style={styles.bannerSub}>Prenos između tekućeg i deviznog računa</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 4 }]}>Kursna lista</Text>
      <Text style={styles.rateDate}>Datum: {new Date().toLocaleDateString('sr-RS')}</Text>

      <View style={styles.rateHeader}>
        <Text style={[styles.rateHText, { flex: 1 }]}>Valuta</Text>
        <Text style={[styles.rateHText, { width: 80, textAlign: 'right' }]}>Kupovni</Text>
        <Text style={[styles.rateHText, { width: 80, textAlign: 'right' }]}>Srednji</Text>
        <Text style={[styles.rateHText, { width: 80, textAlign: 'right' }]}>Prodajni</Text>
      </View>

      {rates.map(r => (
        <View key={r.fromCurrency} style={styles.rateRow}>
          <View style={[styles.row, { flex: 1, gap: 8 }]}>
            <View style={styles.flagBadge}><Text style={styles.flagText}>{r.fromCurrency}</Text></View>
            <Text style={styles.rateCur}>{r.fromCurrency}/RSD</Text>
          </View>
          <Text style={[styles.rateVal, { width: 80, textAlign: 'right' }]}>{r.buyRate.toFixed(2)}</Text>
          <Text style={[styles.rateVal, { width: 80, textAlign: 'right', color: C.textSecondary }]}>{r.middleRate.toFixed(2)}</Text>
          <Text style={[styles.rateVal, { width: 80, textAlign: 'right' }]}>{r.sellRate.toFixed(2)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  screenScroll: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600' },
  convertBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.primary, borderRadius: 18, padding: 18, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  bannerTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  rateDate: { color: C.textMuted, fontSize: 12, marginBottom: 14 },
  rateHeader: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  rateHText: { color: C.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  rateRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  flagBadge: { width: 32, height: 22, borderRadius: 4, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  flagText: { color: C.primary, fontSize: 10, fontWeight: '700' },
  rateCur: { color: C.textPrimary, fontSize: 13, fontWeight: '500' },
  rateVal: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  accSel: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  accSelName: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  accSelBal: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  swapBtn: { alignSelf: 'center', width: 42, height: 42, borderRadius: 21, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center', marginVertical: 12, borderWidth: 1, borderColor: C.border },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14 },
  cur: { color: C.textMuted, fontSize: 13, fontWeight: '600', paddingRight: 14 },
  previewCard: { backgroundColor: C.accentGlow, borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: 'rgba(6,214,160,0.2)', alignItems: 'center' },
  previewLabel: { color: C.textSecondary, fontSize: 12 },
  previewAmount: { color: C.accent, fontSize: 24, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  previewRate: { color: C.textMuted, fontSize: 11, marginTop: 6 },
  errorText: { color: '#ff6b6b', fontSize: 12, marginTop: 8 },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20 },
  cRow: { padding: 14, paddingHorizontal: 18 },
  cLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase' },
  cVal: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  statusCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 },
  statusTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12 },
  statusRowSpacing: { marginTop: 10 },
  statusIconWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statusStepTitle: { fontSize: 13, fontWeight: '700' },
  statusStepDescription: { fontSize: 11, marginTop: 2 },
  statusBadge: { fontSize: 11, fontWeight: '700', marginLeft: 8, textTransform: 'uppercase' },
  card: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sLabel: { color: C.textMuted, fontSize: 13 },
  sVal: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  mItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 4 },
  mItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  mItemTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  mItemSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
});
