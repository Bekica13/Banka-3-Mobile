import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { MOCK_ACCOUNTS } from '../../../shared/data/mockData';
import { fmt } from '../../../shared/utils/formatters';

interface Props { onBack: () => void; }

const MOCK_LOANS = [
  {
    id: 1, name: 'Gotovinski kredit', number: '265-KR-0000001234', amount: 500000, currency: 'RSD',
    period: 60, nominalRate: 8.5, effectiveRate: 9.2, startDate: '15.01.2024', endDate: '15.01.2029',
    installment: 10245.50, nextPayment: '15.04.2025', remaining: 384200, paid: 115800, accountId: 1,
    status: 'active' as const,
  },
  {
    id: 2, name: 'Stambeni kredit', number: '265-KR-0000005678', amount: 8500000, currency: 'RSD',
    period: 240, nominalRate: 4.2, effectiveRate: 4.8, startDate: '01.06.2023', endDate: '01.06.2043',
    installment: 52340.00, nextPayment: '01.04.2025', remaining: 7842500, paid: 657500, accountId: 1,
    status: 'active' as const,
  },
  {
    id: 3, name: 'Auto kredit', number: '265-KR-0000009012', amount: 1200000, currency: 'RSD',
    period: 36, nominalRate: 6.9, effectiveRate: 7.5, startDate: '10.03.2023', endDate: '10.03.2026',
    installment: 36890.00, nextPayment: '10.04.2025', remaining: 110670, paid: 1089330, accountId: 1,
    status: 'active' as const,
  },
];

const LOAN_TYPES = [
  { value: 'gotovinski', label: 'Gotovinski kredit' },
  { value: 'stambeni', label: 'Stambeni kredit' },
  { value: 'auto', label: 'Auto kredit' },
  { value: 'refinansirajuci', label: 'Refinansirajući kredit' },
];

const MATURITIES = ['12', '24', '36', '48', '60', '84', '120', '180', '240'];

type Step = 'list' | 'detail' | 'apply' | 'applyConfirm' | 'applySuccess';

export default function LoansScreen({ onBack }: Props) {
  const [step, setStep] = useState<Step>('list');
  const [selectedLoan, setSelectedLoan] = useState<typeof MOCK_LOANS[0] | null>(null);

  // Application form state
  const [loanType, setLoanType] = useState('gotovinski');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [salary, setSalary] = useState('');
  const [permanent, setPermanent] = useState(true);
  const [employmentYears, setEmploymentYears] = useState('');
  const [maturity, setMaturity] = useState('60');
  const [phone, setPhone] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(MOCK_ACCOUNTS[0].id);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showMaturityPicker, setShowMaturityPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!loanAmount || parseFloat(loanAmount) <= 0) e.amount = 'Unesite iznos kredita';
    if (!loanPurpose.trim()) e.purpose = 'Unesite svrhu kredita';
    if (!salary || parseFloat(salary) <= 0) e.salary = 'Unesite mesečna primanja';
    if (!employmentYears.trim()) e.employment = 'Unesite period zaposlenja';
    if (!phone.trim()) e.phone = 'Unesite broj telefona';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setLoanType('gotovinski'); setLoanAmount(''); setLoanPurpose(''); setSalary('');
    setPermanent(true); setEmploymentYears(''); setMaturity('60'); setPhone('');
    setErrors({});
  };

  // ===== SUCCESS =====
  if (step === 'applySuccess') {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        <Text style={styles.successTitle}>Zahtev podnet!</Text>
        <Text style={styles.successSub}>Vaš zahtev za kredit je uspešno podnet. Bićete obavešteni o odluci.</Text>
        <View style={styles.card}>
          <View style={styles.sRow}><Text style={styles.sLabel}>Tip</Text><Text style={styles.sVal}>{LOAN_TYPES.find(t => t.value === loanType)?.label}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Iznos</Text><Text style={[styles.sVal, { color: C.accent }]}>{fmt(parseFloat(loanAmount))}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Ročnost</Text><Text style={styles.sVal}>{maturity} meseci</Text></View>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => { resetForm(); setStep('list'); }}><Text style={styles.primaryBtnText}>Nazad na kredite</Text></TouchableOpacity>
      </View>
    );
  }

  // ===== CONFIRM =====
  if (step === 'applyConfirm') {
    const acc = MOCK_ACCOUNTS.find(a => a.id === selectedAccountId)!;
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('apply')} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
          <Text style={styles.title}>Potvrda zahteva</Text>
        </View>
        <View style={styles.confirmCard}>
          {[
            ['Tip kredita', LOAN_TYPES.find(t => t.value === loanType)?.label || ''],
            ['Iznos', fmt(parseFloat(loanAmount))],
            ['Svrha', loanPurpose],
            ['Mesečna primanja', fmt(parseFloat(salary))],
            ['Stalni radni odnos', permanent ? 'Da' : 'Ne'],
            ['Period zaposlenja', `${employmentYears} god.`],
            ['Ročnost', `${maturity} meseci`],
            ['Račun', `${acc.name} (${acc.number})`],
            ['Telefon', phone],
          ].map(([l, v], i) => (
            <View key={l} style={[styles.cRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.cLabel}>{l}</Text><Text style={styles.cVal}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.secBtn} onPress={() => setStep('apply')}><Text style={styles.secBtnText}>Nazad</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1.5 }]} onPress={() => setStep('applySuccess')}><Text style={styles.primaryBtnText}>Pošalji zahtev</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ===== APPLICATION FORM =====
  if (step === 'apply') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('list')} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
          <Text style={styles.title}>Zahtev za kredit</Text>
        </View>

        {/* Loan type */}
        <Text style={styles.label}>VRSTA KREDITA</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowTypePicker(true)}>
          <Text style={styles.selectMain}>{LOAN_TYPES.find(t => t.value === loanType)?.label}</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        {/* Amount */}
        <Text style={[styles.label, { marginTop: 16 }]}>IZNOS KREDITA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={loanAmount} onChangeText={setLoanAmount} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
          <Text style={styles.cur}>RSD</Text>
        </View>
        {errors.amount && <Text style={styles.errText}>{errors.amount}</Text>}

        {/* Purpose */}
        <Text style={[styles.label, { marginTop: 16 }]}>SVRHA KREDITA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={[styles.input, { minHeight: 50, textAlignVertical: 'top' }]} value={loanPurpose} onChangeText={setLoanPurpose} placeholder="Opis svrhe kredita" placeholderTextColor={C.textMuted} multiline />
        </View>
        {errors.purpose && <Text style={styles.errText}>{errors.purpose}</Text>}

        {/* Salary */}
        <Text style={[styles.label, { marginTop: 16 }]}>IZNOS MESEČNIH PRIMANJA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={salary} onChangeText={setSalary} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
          <Text style={styles.cur}>RSD</Text>
        </View>
        {errors.salary && <Text style={styles.errText}>{errors.salary}</Text>}

        {/* Permanent employment toggle */}
        <Text style={[styles.label, { marginTop: 16 }]}>RADNI ODNOS</Text>
        <View style={styles.toggleRow}>
          {['Da', 'Ne'].map(opt => (
            <TouchableOpacity key={opt} style={[styles.toggleBtn, (opt === 'Da' ? permanent : !permanent) && styles.toggleActive]}
              onPress={() => setPermanent(opt === 'Da')}>
              <Text style={[styles.toggleText, (opt === 'Da' ? permanent : !permanent) && { color: C.primary }]}>
                {opt === 'Da' ? 'Stalni odnos' : 'Privremeni'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Employment period */}
        <Text style={[styles.label, { marginTop: 16 }]}>PERIOD ZAPOSLENJA (godine)</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={employmentYears} onChangeText={setEmploymentYears} placeholder="npr. 3" placeholderTextColor={C.textMuted} keyboardType="numeric" />
        </View>
        {errors.employment && <Text style={styles.errText}>{errors.employment}</Text>}

        {/* Maturity */}
        <Text style={[styles.label, { marginTop: 16 }]}>ROČNOST (meseci)</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowMaturityPicker(true)}>
          <Text style={styles.selectMain}>{maturity} meseci</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        {/* Account */}
        <Text style={[styles.label, { marginTop: 16 }]}>RAČUN ZA ISPLATU</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowAccountPicker(true)}>
          <Text style={styles.selectMain}>{MOCK_ACCOUNTS.find(a => a.id === selectedAccountId)?.name} ({MOCK_ACCOUNTS.find(a => a.id === selectedAccountId)?.number})</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        {/* Phone */}
        <Text style={[styles.label, { marginTop: 16 }]}>BROJ TELEFONA</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+381..." placeholderTextColor={C.textMuted} keyboardType="phone-pad" />
        </View>
        {errors.phone && <Text style={styles.errText}>{errors.phone}</Text>}

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={() => { if (validate()) setStep('applyConfirm'); }}>
          <Text style={styles.primaryBtnText}>Nastavi</Text>
        </TouchableOpacity>

        {/* Pickers */}
        <BottomSheet visible={showTypePicker} onClose={() => setShowTypePicker(false)} title="Vrsta kredita">
          {LOAN_TYPES.map(t => (
            <TouchableOpacity key={t.value} style={styles.sheetItem} onPress={() => { setLoanType(t.value); setShowTypePicker(false); }}>
              <Text style={[styles.sheetItemText, loanType === t.value && { color: C.primary, fontWeight: '600' }]}>{t.label}</Text>
              {loanType === t.value && <Ionicons name="checkmark" size={18} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>

        <BottomSheet visible={showMaturityPicker} onClose={() => setShowMaturityPicker(false)} title="Ročnost">
          {MATURITIES.map(m => (
            <TouchableOpacity key={m} style={styles.sheetItem} onPress={() => { setMaturity(m); setShowMaturityPicker(false); }}>
              <Text style={[styles.sheetItemText, maturity === m && { color: C.primary, fontWeight: '600' }]}>{m} meseci</Text>
              {maturity === m && <Ionicons name="checkmark" size={18} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>

        <BottomSheet visible={showAccountPicker} onClose={() => setShowAccountPicker(false)} title="Račun">
          {MOCK_ACCOUNTS.map(a => (
            <TouchableOpacity key={a.id} style={styles.sheetItem} onPress={() => { setSelectedAccountId(a.id); setShowAccountPicker(false); }}>
              <View style={styles.flex1}>
                <Text style={styles.sheetItemText}>{a.name}</Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>{a.number}</Text>
              </View>
              {selectedAccountId === a.id && <Ionicons name="checkmark" size={18} color={C.primary} />}
            </TouchableOpacity>
          ))}
        </BottomSheet>
      </ScrollView>
    );
  }

  // ===== DETAIL =====
  if (step === 'detail' && selectedLoan) {
    const l = selectedLoan;
    const progressPct = Math.round((l.paid / l.amount) * 100);
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hRow}>
          <TouchableOpacity onPress={() => setStep('list')} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
          <Text style={styles.title}>{l.name}</Text>
        </View>

        {/* Progress card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>Otplaćeno</Text>
          <Text style={styles.progressPct}>{progressPct}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressSmall}>Otplaćeno: {fmt(l.paid, l.currency)}</Text>
            <Text style={styles.progressSmall}>Preostalo: {fmt(l.remaining, l.currency)}</Text>
          </View>
        </View>

        {/* Next payment */}
        <View style={styles.nextPayment}>
          <View style={styles.npIcon}><Ionicons name="calendar" size={20} color={C.warning} /></View>
          <View style={styles.flex1}>
            <Text style={styles.npTitle}>Sledeća rata</Text>
            <Text style={styles.npDate}>{l.nextPayment}</Text>
          </View>
          <Text style={styles.npAmount}>{fmt(l.installment, l.currency)}</Text>
        </View>

        {/* Detail info */}
        <View style={styles.detailCard}>
          {[
            ['Broj kredita', l.number],
            ['Iznos kredita', fmt(l.amount, l.currency)],
            ['Period otplate', `${l.period} meseci`],
            ['Nominalna kamatna stopa', `${l.nominalRate}%`],
            ['Efektivna kamatna stopa', `${l.effectiveRate}%`],
            ['Datum ugovaranja', l.startDate],
            ['Datum dospeća', l.endDate],
            ['Iznos rate', fmt(l.installment, l.currency)],
            ['Preostalo dugovanje', fmt(l.remaining, l.currency)],
            ['Valuta', l.currency],
          ].map(([label, value], i) => (
            <View key={label} style={[styles.dRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.dLabel}>{label}</Text>
              <Text style={styles.dValue}>{value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ===== LIST =====
  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.hRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
        <Text style={styles.title}>Krediti</Text>
      </View>

      {/* Apply button */}
      <TouchableOpacity style={styles.applyBanner} onPress={() => { resetForm(); setStep('apply'); }} activeOpacity={0.8}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <View style={styles.flex1}>
          <Text style={styles.bannerTitle}>Podnesi zahtev za kredit</Text>
          <Text style={styles.bannerSub}>Gotovinski, stambeni, auto kredit</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>Aktivni krediti</Text>
      {MOCK_LOANS.map(loan => {
        const pct = Math.round((loan.paid / loan.amount) * 100);
        return (
          <TouchableOpacity key={loan.id} style={styles.loanRow} onPress={() => { setSelectedLoan(loan); setStep('detail'); }} activeOpacity={0.7}>
            <View style={styles.loanIconWrap}><Ionicons name="document-text" size={22} color={C.primary} /></View>
            <View style={styles.flex1}>
              <Text style={styles.loanName}>{loan.name}</Text>
              <Text style={styles.loanNum}>{loan.number}</Text>
              <View style={styles.miniBar}><View style={[styles.miniFill, { width: `${pct}%` }]} /></View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.loanAmount}>{fmt(loan.remaining, loan.currency)}</Text>
              <Text style={styles.loanSub}>preostalo</Text>
              <Ionicons name="chevron-forward" size={14} color={C.textMuted} style={{ marginTop: 4 }} />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// Reusable bottom sheet
function BottomSheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.mOverlay}>
        <View style={styles.mSheet}>
          <View style={styles.mHead}>
            <Text style={styles.mTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600' },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14 },
  cur: { color: C.textMuted, fontSize: 13, fontWeight: '600', paddingRight: 14 },
  errText: { color: C.danger, fontSize: 12, marginTop: 4 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  selectMain: { color: C.textPrimary, fontSize: 14, fontWeight: '500', flex: 1 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: C.bgInput, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  toggleActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  toggleText: { color: C.textSecondary, fontSize: 14, fontWeight: '500' },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  // Banner
  applyBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.primary, borderRadius: 18, padding: 18, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  bannerTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  // Loan list
  loanRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  loanIconWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  loanName: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  loanNum: { color: C.textMuted, fontSize: 11, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  loanAmount: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  loanSub: { color: C.textMuted, fontSize: 10, marginTop: 1 },
  miniBar: { height: 4, backgroundColor: C.border, borderRadius: 2, marginTop: 8 },
  miniFill: { height: 4, backgroundColor: C.accent, borderRadius: 2 },
  // Detail
  progressCard: { backgroundColor: C.bgCard, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  progressLabel: { color: C.textSecondary, fontSize: 13 },
  progressPct: { color: C.accent, fontSize: 36, fontWeight: '800', letterSpacing: -1, marginVertical: 4 },
  progressBar: { height: 8, backgroundColor: C.border, borderRadius: 4, marginBottom: 10 },
  progressFill: { height: 8, backgroundColor: C.accent, borderRadius: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressSmall: { color: C.textMuted, fontSize: 11 },
  nextPayment: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.warningGlow, borderRadius: 16, padding: 14, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', marginBottom: 16 },
  npIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.15)', justifyContent: 'center', alignItems: 'center' },
  npTitle: { color: C.warning, fontSize: 13, fontWeight: '600' },
  npDate: { color: C.textSecondary, fontSize: 12, marginTop: 1 },
  npAmount: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  detailCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  dRow: { padding: 14, paddingHorizontal: 18 },
  dLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  dValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  // Confirm
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20 },
  cRow: { padding: 14, paddingHorizontal: 18 },
  cLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase' },
  cVal: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  // Success
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  card: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sLabel: { color: C.textMuted, fontSize: 13 },
  sVal: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  // Modals
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 2 },
  sheetItemText: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
});
