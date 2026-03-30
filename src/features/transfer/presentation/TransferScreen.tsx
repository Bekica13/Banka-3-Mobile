import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { MOCK_ACCOUNTS } from '../../../shared/data/mockData';
import { fmt } from '../../../shared/utils/formatters';

interface Props { onBack: () => void; }

export default function TransferScreen({ onBack }: Props) {
  const [fromAcc, setFromAcc] = useState(MOCK_ACCOUNTS[0]);
  const [toAcc, setToAcc] = useState(MOCK_ACCOUNTS[1]);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [error, setError] = useState('');

  const sameAccounts = fromAcc.id === toAcc.id;
  const sameCurrency = fromAcc.currency === toAcc.currency;

  const handleContinue = () => {
    setError('');
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { setError('Unesite validan iznos'); return; }
    if (parseFloat(amount) > fromAcc.available) { setError('Nedovoljno sredstava'); return; }
    if (sameAccounts) { setError('Odaberite različite račune'); return; }
    if (!sameCurrency) { setError('Prenos je moguć samo između računa iste valute. Za konverziju koristite menjačnicu.'); return; }
    setStep('confirm');
  };

  const handleSwap = () => { const tmp = fromAcc; setFromAcc(toAcc); setToAcc(tmp); };

  if (step === 'success') {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        <Text style={styles.successTitle}>Prenos uspešan!</Text>
        <Text style={styles.successSub}>Sredstva su prebačena između vaših računa.</Text>
        <View style={styles.successCard}>
          <View style={styles.sRow}><Text style={styles.sLabel}>Sa</Text><Text style={styles.sValue}>{fromAcc.name}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Na</Text><Text style={styles.sValue}>{toAcc.name}</Text></View>
          <View style={styles.sRow}><Text style={styles.sLabel}>Iznos</Text><Text style={[styles.sValue, { color: C.accent }]}>{fmt(parseFloat(amount), fromAcc.currency)}</Text></View>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBack}><Text style={styles.primaryBtnText}>Nazad na početnu</Text></TouchableOpacity>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
          <Text style={styles.title}>Potvrda prenosa</Text>
        </View>
        <View style={styles.confirmCard}>
          {[['Sa računa', `${fromAcc.name}\n${fromAcc.number}`], ['Na račun', `${toAcc.name}\n${toAcc.number}`], ['Iznos', fmt(parseFloat(amount), fromAcc.currency)]].map(([l, v], i) => (
            <View key={l} style={[styles.confirmRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.confirmLabel}>{l}</Text><Text style={styles.confirmValue}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('form')}><Text style={styles.secondaryBtnText}>Nazad</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1.5 }]} onPress={() => setStep('success')}><Text style={styles.primaryBtnText}>Potvrdi prenos</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const AccSelector = ({ label, acc, onPress }: { label: string; acc: typeof MOCK_ACCOUNTS[0]; onPress: () => void }) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.accSelect} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.accSelectIcon}><Ionicons name="wallet" size={18} color={C.primary} /></View>
        <View style={styles.flex1}>
          <Text style={styles.accSelectName}>{acc.name}</Text>
          <Text style={styles.accSelectBal}>{fmt(acc.available, acc.currency)} raspoloživo</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </TouchableOpacity>
    </>
  );

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
        <Text style={styles.title}>Prenos sredstava</Text>
      </View>

      <AccSelector label="SA RAČUNA" acc={fromAcc} onPress={() => setShowFrom(true)} />
      
      <TouchableOpacity style={styles.swapBtn} onPress={handleSwap} activeOpacity={0.7}>
        <Ionicons name="swap-vertical" size={22} color={C.primary} />
      </TouchableOpacity>

      <AccSelector label="NA RAČUN" acc={toAcc} onPress={() => setShowTo(true)} />

      {sameAccounts && <Text style={styles.warnText}>Odaberite različite račune</Text>}
      {!sameAccounts && !sameCurrency && <Text style={styles.warnText}>Različite valute — koristite menjačnicu</Text>}

      <Text style={[styles.label, { marginTop: 20 }]}>IZNOS</Text>
      <View style={styles.inputWrap}>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
        <Text style={styles.currBadge}>{fromAcc.currency}</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={handleContinue}><Text style={styles.primaryBtnText}>Nastavi</Text></TouchableOpacity>

      {/* Pickers */}
      {[{ visible: showFrom, setVisible: setShowFrom, onSelect: setFromAcc }, { visible: showTo, setVisible: setShowTo, onSelect: setToAcc }].map((p, i) => (
        <Modal key={i} visible={p.visible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Odaberite račun</Text>
                <TouchableOpacity onPress={() => p.setVisible(false)}><Ionicons name="close" size={24} color={C.textSecondary} /></TouchableOpacity>
              </View>
              {MOCK_ACCOUNTS.map(acc => (
                <TouchableOpacity key={acc.id} style={styles.sheetItem} onPress={() => { p.onSelect(acc); p.setVisible(false); }}>
                  <View style={styles.sheetItemIcon}><Ionicons name="wallet" size={18} color={C.primary} /></View>
                  <View style={styles.flex1}>
                    <Text style={styles.sheetItemTitle}>{acc.name}</Text>
                    <Text style={styles.sheetItemSub}>{fmt(acc.available, acc.currency)}</Text>
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

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  accSelect: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  accSelectIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  accSelectName: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  accSelectBal: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  swapBtn: { alignSelf: 'center', width: 42, height: 42, borderRadius: 21, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center', marginVertical: 12, borderWidth: 1, borderColor: C.border },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14 },
  currBadge: { color: C.textMuted, fontSize: 13, fontWeight: '600', paddingRight: 14 },
  errorText: { color: C.danger, fontSize: 12, marginTop: 4 },
  warnText: { color: C.warning, fontSize: 12, marginTop: 8 },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secondaryBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20 },
  confirmRow: { padding: 14, paddingHorizontal: 18 },
  confirmLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  confirmValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  successCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  sRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sLabel: { color: C.textMuted, fontSize: 13 },
  sValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 4 },
  sheetItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  sheetItemTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  sheetItemSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
});
