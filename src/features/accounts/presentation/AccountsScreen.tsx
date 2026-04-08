import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmt } from '../../../shared/utils/formatters';
import { useAccounts, useTransactions } from '../../../shared/hooks/useFeatures';

interface Props {
  detailId: number | null;
  onSelect: (id: number) => void;
  onBack: () => void;
}

export default function AccountsScreen({ detailId, onSelect, onBack }: Props) {
  const { state: accountsState } = useAccounts();
  const { state: transactionsState } = useTransactions(detailId ?? 0);

  if (accountsState.loading) {
    return (
      <View style={[styles.flex1, styles.center]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (accountsState.error) {
    return (
      <View style={[styles.flex1, styles.center, { padding: 24 }]}>
        <Text style={styles.subtitle}>{accountsState.error}</Text>
      </View>
    );
  }

  const accounts = accountsState.data ?? [];

  if (detailId) {
    const account = accounts.find(item => item.id === detailId);
    const transactions = detailId ? (transactionsState.data ?? []) : [];

    if (!account) {
      return (
        <View style={[styles.flex1, styles.center, { padding: 24 }]}>
          <Text style={styles.subtitle}>Racun nije pronadjen.</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>{account.name}</Text>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailNum}>{account.accountNumber}</Text>
          <Text style={styles.detailBal}>{fmt(account.balance, account.currency)}</Text>
          <View style={[styles.row, { marginTop: 16, gap: 24 }]}>
            <View>
              <Text style={styles.detailLabel}>Raspolozivo</Text>
              <Text style={[styles.detailVal, { color: C.accent }]}>{fmt(account.availableBalance, account.currency)}</Text>
            </View>
            <View>
              <Text style={styles.detailLabel}>Rezervisano</Text>
              <Text style={[styles.detailVal, { color: C.warning }]}>{fmt(account.reservedAmount, account.currency)}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 14 }]}>Transakcije</Text>
        {transactionsState.loading ? (
          <ActivityIndicator color={C.primary} />
        ) : transactions.length === 0 ? (
          <Text style={{ color: C.textMuted, textAlign: 'center', padding: 40 }}>Nema transakcija</Text>
        ) : transactions.map((transaction, index) => (
          <View key={`accounts-transaction-${transaction.id}-${transaction.accountId}-${transaction.date}-${transaction.amount}-${index}`} style={styles.txRow}>
            <View style={[styles.txIcon, { backgroundColor: transaction.amount > 0 ? C.accentGlow : C.dangerGlow }]}>
              <Ionicons name={transaction.amount > 0 ? 'arrow-down' : 'arrow-up'} size={18} color={transaction.amount > 0 ? C.accent : C.danger} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.txDesc} numberOfLines={1}>{transaction.description}</Text>
              <Text style={styles.txDate}>{transaction.date}</Text>
            </View>
            <Text style={[styles.txAmt, transaction.amount > 0 && { color: C.accent }]}>
              {transaction.amount > 0 ? '+' : ''}
              {fmt(transaction.amount, transaction.currency)}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Moji racuni</Text>
      <Text style={styles.subtitle}>{accounts.length} aktivna racuna</Text>
      {accounts.map((account, index) => (
        <TouchableOpacity key={`accounts-list-${account.id}-${account.accountNumber}-${account.currency}-${account.name}-${index}`} style={styles.accRow} onPress={() => onSelect(account.id)} activeOpacity={0.7}>
          <View style={styles.accIcon}><Ionicons name="wallet" size={22} color={C.primary} /></View>
          <View style={styles.flex1}>
            <Text style={styles.accName}>{account.name}</Text>
            <Text style={styles.accNum}>{account.accountNumber}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.accBal}>{fmt(account.balance, account.currency)}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.textMuted} style={{ marginTop: 2 }} />
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
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
