import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS } from '../../../shared/data/mockData';
import { fmt } from '../../../shared/utils/formatters';

interface Props {
  detailId: number | null;
  onSelect: (id: number) => void;
  onBack: () => void;
}

export default function AccountsScreen({ detailId, onSelect, onBack }: Props) {
  if (detailId) {
    const acc = MOCK_ACCOUNTS.find(a => a.id === detailId)!;
    const txs = MOCK_TRANSACTIONS.filter(t => t.accountId === detailId);
    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>{acc.name}</Text>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailNum}>{acc.number}</Text>
          <Text style={styles.detailBal}>{fmt(acc.balance, acc.currency)}</Text>
          <View style={[styles.row, { marginTop: 16, gap: 24 }]}>  
            <View>
              <Text style={styles.detailLabel}>Raspoloživo</Text>
              <Text style={[styles.detailVal, { color: C.accent }]}>{fmt(acc.available, acc.currency)}</Text>
            </View>
            <View>
              <Text style={styles.detailLabel}>Rezervisano</Text>
              <Text style={[styles.detailVal, { color: C.warning }]}>{fmt(acc.balance - acc.available, acc.currency)}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>Transakcije</Text>
        {txs.length === 0 ? (
          <Text style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>Nema transakcija</Text>
        ) : txs.map(tx => (
          <View key={tx.id} style={styles.txRow}>
            <View style={[styles.txIcon, { backgroundColor: tx.amount > 0 ? C.accentGlow : C.dangerGlow }]}>
              <Ionicons name={tx.amount > 0 ? 'arrow-down' : 'arrow-up'} size={18} color={tx.amount > 0 ? C.accent : C.danger} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.txDesc} numberOfLines={1}>{tx.desc}</Text>
              <Text style={styles.txDate}>{tx.date}</Text>
            </View>
            <Text style={[styles.txAmt, tx.amount > 0 && { color: C.accent }]}>{tx.amount > 0 ? '+' : ''}{fmt(tx.amount, acc.currency)}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Moji računi</Text>
      <Text style={styles.subtitle}>{MOCK_ACCOUNTS.length} aktivna računa</Text>
      {MOCK_ACCOUNTS.map(acc => (
        <TouchableOpacity key={acc.id} style={styles.accRow} onPress={() => onSelect(acc.id)} activeOpacity={0.7}>
          <View style={styles.accIcon}><Ionicons name="wallet" size={22} color={C.primary} /></View>
          <View style={styles.flex1}>
            <Text style={styles.accName}>{acc.name}</Text>
            <Text style={styles.accNum}>{acc.number}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.accBal}>{fmt(acc.balance, acc.currency)}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.textMuted} style={{ marginTop: 2 }} />
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '700' },
  subtitle: { color: C.textSecondary, fontSize: 13, marginBottom: 20 },
  sectionTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '600' },
  detailCard: { backgroundColor: C.bgCard, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: C.border },
  detailNum: { color: C.textMuted, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  detailBal: { color: C.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -1, marginTop: 8 },
  detailLabel: { color: C.textMuted, fontSize: 11 },
  detailVal: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, paddingHorizontal: 20, backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  accIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  accName: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  accNum: { color: C.textMuted, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 },
  accBal: { color: C.textPrimary, fontSize: 16, fontWeight: '700' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 4 },
  txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txDesc: { color: C.textPrimary, fontSize: 14, fontWeight: '500' },
  txDate: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  txAmt: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
});
