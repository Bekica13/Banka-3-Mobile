import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { MOCK_ACCOUNTS, MOCK_RECIPIENTS, PAYMENT_CODES } from '../../../shared/data/mockData';
import { fmt } from '../../../shared/utils/formatters';

interface Props { onBack: () => void; }

type Step = 'form' | 'confirm' | 'success';

export default function PaymentScreen({ onBack }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [paymentCode, setPaymentCode] = useState('289');
  const [refNumber, setRefNumber] = useState('');
  const [sourceAccount, setSourceAccount] = useState(MOCK_ACCOUNTS[0]);
  const [showRecipients, setShowRecipients] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!recipientName.trim()) e.recipientName = 'Obavezno polje';
    if (!recipientAccount.trim()) e.recipientAccount = 'Obavezno polje';
    if (!amount.trim() || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) e.amount = 'Unesite validan iznos';
    if (parseFloat(amount) > sourceAccount.available) e.amount = 'Nedovoljno sredstava';
    if (!purpose.trim()) e.purpose = 'Obavezno polje';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => { if (validate()) setStep('confirm'); };
  const handleConfirm = () => { setStep('success'); };

  const selectRecipient = (r: typeof MOCK_RECIPIENTS[0]) => {
    setRecipientName(r.name);
    setRecipientAccount(r.account);
    setShowRecipients(false);
  };

  if (step === 'success') {
    return (
      <View style={[styles.flex1, styles.center, { backgroundColor: C.bg, padding: 24 }]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color={C.accent} />
        </View>
        <Text style={styles.successTitle}>Plaćanje uspešno!</Text>
        <Text style={styles.successSub}>Nalog za plaćanje je kreiran i čeka verifikaciju.</Text>
        <View style={styles.successCard}>
          <View style={styles.successRow}><Text style={styles.successLabel}>Primalac</Text><Text style={styles.successValue}>{recipientName}</Text></View>
          <View style={styles.successRow}><Text style={styles.successLabel}>Iznos</Text><Text style={[styles.successValue, { color: C.accent }]}>{fmt(parseFloat(amount), sourceAccount.currency)}</Text></View>
          <View style={styles.successRow}><Text style={styles.successLabel}>Sa računa</Text><Text style={styles.successValue}>{sourceAccount.name}</Text></View>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>Nazad na početnu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Potvrda plaćanja</Text>
        </View>

        <View style={styles.confirmCard}>
          {[
            ['Primalac', recipientName],
            ['Račun primaoca', recipientAccount],
            ['Iznos', fmt(parseFloat(amount), sourceAccount.currency)],
            ['Sa računa', `${sourceAccount.name}\n${sourceAccount.number}`],
            ['Šifra plaćanja', paymentCode],
            ['Svrha plaćanja', purpose],
            ...(refNumber ? [['Poziv na broj', refNumber]] : []),
          ].map(([label, value], i) => (
            <View key={label} style={[styles.confirmRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Text style={styles.confirmLabel}>{label}</Text>
              <Text style={styles.confirmValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.confirmNote}>Plaćanje zahteva verifikaciju putem mobilne aplikacije ili OTP koda.</Text>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('form')} activeOpacity={0.7}>
            <Text style={styles.secondaryBtnText}>Nazad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1.5 }]} onPress={handleConfirm} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Potvrdi plaćanje</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // FORM
  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Novo plaćanje</Text>
      </View>

      {/* Source account */}
      <Text style={styles.label}>SA RAČUNA</Text>
      <TouchableOpacity style={styles.selectBtn} onPress={() => setShowAccounts(true)} activeOpacity={0.7}>
        <View style={styles.flex1}>
          <Text style={styles.selectMain}>{sourceAccount.name}</Text>
          <Text style={styles.selectSub}>Raspoloživo: {fmt(sourceAccount.available, sourceAccount.currency)}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </TouchableOpacity>

      {/* Recipient */}
      <View style={[styles.labelRow, { marginTop: 20 }]}>
        <Text style={styles.label}>PRIMALAC</Text>
        <TouchableOpacity onPress={() => setShowRecipients(true)}>
          <Text style={styles.labelLink}>Iz imenika</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputWrap}>
        <TextInput style={styles.input} value={recipientName} onChangeText={setRecipientName}
          placeholder="Naziv primaoca" placeholderTextColor={C.textMuted} />
      </View>
      {errors.recipientName && <Text style={styles.errorText}>{errors.recipientName}</Text>}

      {/* Recipient account */}
      <Text style={[styles.label, { marginTop: 16 }]}>RAČUN PRIMAOCA</Text>
      <View style={styles.inputWrap}>
        <TextInput style={styles.input} value={recipientAccount} onChangeText={setRecipientAccount}
          placeholder="000-0000000000000-00" placeholderTextColor={C.textMuted} keyboardType="numeric" />
      </View>
      {errors.recipientAccount && <Text style={styles.errorText}>{errors.recipientAccount}</Text>}

      {/* Amount */}
      <Text style={[styles.label, { marginTop: 16 }]}>IZNOS</Text>
      <View style={styles.inputWrap}>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount}
          placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
        <Text style={styles.currBadge}>{sourceAccount.currency}</Text>
      </View>
      {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}

      {/* Payment code */}
      <Text style={[styles.label, { marginTop: 16 }]}>ŠIFRA PLAĆANJA</Text>
      <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCodes(true)} activeOpacity={0.7}>
        <Text style={styles.selectMain}>{paymentCode} - {PAYMENT_CODES.find(c => c.code === paymentCode)?.desc || ''}</Text>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </TouchableOpacity>

      {/* Purpose */}
      <Text style={[styles.label, { marginTop: 16 }]}>SVRHA PLAĆANJA</Text>
      <View style={styles.inputWrap}>
        <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} value={purpose}
          onChangeText={setPurpose} placeholder="Opis svrhe plaćanja" placeholderTextColor={C.textMuted} multiline />
      </View>
      {errors.purpose && <Text style={styles.errorText}>{errors.purpose}</Text>}

      {/* Reference */}
      <Text style={[styles.label, { marginTop: 16 }]}>POZIV NA BROJ (opciono)</Text>
      <View style={styles.inputWrap}>
        <TextInput style={styles.input} value={refNumber} onChangeText={setRefNumber}
          placeholder="Poziv na broj" placeholderTextColor={C.textMuted} keyboardType="numeric" />
      </View>

      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={handleContinue} activeOpacity={0.8}>
        <Text style={styles.primaryBtnText}>Nastavi</Text>
      </TouchableOpacity>

      {/* Recipients picker */}
      <Modal visible={showRecipients} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Primaoci plaćanja</Text>
              <TouchableOpacity onPress={() => setShowRecipients(false)}><Ionicons name="close" size={24} color={C.textSecondary} /></TouchableOpacity>
            </View>
            {MOCK_RECIPIENTS.map(r => (
              <TouchableOpacity key={r.id} style={styles.sheetItem} onPress={() => selectRecipient(r)} activeOpacity={0.7}>
                <View style={styles.sheetItemIcon}><Ionicons name="person" size={18} color={C.primary} /></View>
                <View style={styles.flex1}>
                  <Text style={styles.sheetItemTitle}>{r.name}</Text>
                  <Text style={styles.sheetItemSub}>{r.account}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Account picker */}
      <Modal visible={showAccounts} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Odaberite račun</Text>
              <TouchableOpacity onPress={() => setShowAccounts(false)}><Ionicons name="close" size={24} color={C.textSecondary} /></TouchableOpacity>
            </View>
            {MOCK_ACCOUNTS.map(acc => (
              <TouchableOpacity key={acc.id} style={styles.sheetItem}
                onPress={() => { setSourceAccount(acc); setShowAccounts(false); }} activeOpacity={0.7}>
                <View style={styles.sheetItemIcon}><Ionicons name="wallet" size={18} color={C.primary} /></View>
                <View style={styles.flex1}>
                  <Text style={styles.sheetItemTitle}>{acc.name}</Text>
                  <Text style={styles.sheetItemSub}>{fmt(acc.available, acc.currency)} raspoloživo</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Payment code picker */}
      <Modal visible={showCodes} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '70%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Šifra plaćanja</Text>
              <TouchableOpacity onPress={() => setShowCodes(false)}><Ionicons name="close" size={24} color={C.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView>
              {PAYMENT_CODES.map(c => (
                <TouchableOpacity key={c.code} style={styles.sheetItem}
                  onPress={() => { setPaymentCode(c.code); setShowCodes(false); }} activeOpacity={0.7}>
                  <Text style={[styles.sheetItemTitle, { marginRight: 8 }]}>{c.code}</Text>
                  <Text style={[styles.sheetItemSub, styles.flex1]} numberOfLines={1}>{c.desc}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  screenTitle: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  labelLink: { color: C.primary, fontSize: 12, fontWeight: '500', marginBottom: 8 },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14 },
  currBadge: { color: C.textMuted, fontSize: 13, fontWeight: '600', paddingRight: 14 },
  errorText: { color: C.danger, fontSize: 12, marginTop: 4 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14 },
  selectMain: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  selectSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secondaryBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  // Confirm
  confirmCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  confirmRow: { padding: 14, paddingHorizontal: 18 },
  confirmLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  confirmValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 4 },
  confirmNote: { color: C.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 16 },
  // Success
  successIcon: { marginBottom: 20 },
  successTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  successSub: { color: C.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  successCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, width: '100%', marginBottom: 24 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  successLabel: { color: C.textMuted, fontSize: 13 },
  successValue: { color: C.textPrimary, fontSize: 13, fontWeight: '600' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 4 },
  sheetItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  sheetItemTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  sheetItemSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
});
