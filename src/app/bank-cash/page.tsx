"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Account = {
  id: string;
  account_name: string;
  bank_name: string | null;
  account_number: string | null;
  opening_balance: number;
  current_balance: number;
  account_type: string;
};

type Transaction = {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  payment_mode: string | null;
  reference_number: string | null;
  description: string | null;
};

export default function BankCashPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  const [selectedAccount, setSelectedAccount] = useState("");
  const [transactionType, setTransactionType] = useState("MONEY_IN");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [loading, setLoading] = useState(false);

  async function loadData() {
    const { data: accountData } = await supabase
      .from("bank_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: transactionData } = await supabase
      .from("bank_transactions")
      .select("*")
      .order("transaction_date", { ascending: false });

    setAccounts(accountData || []);
    setTransactions(transactionData || []);

    if (!selectedAccount && accountData?.length) {
      setSelectedAccount(accountData[0].id);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addAccount() {
    if (!accountName.trim()) {
      alert("Account name required.");
      return;
    }

    const opening = Number(openingBalance || 0);

    const { error } = await supabase.from("bank_accounts").insert({
      account_name: accountName.trim(),
      bank_name: bankName.trim() || null,
      account_number: accountNumber.trim() || null,
      opening_balance: opening,
      current_balance: opening,
      account_type: bankName.trim() ? "BANK" : "CASH",
    });

    if (error) {
      alert("Account save error: " + error.message);
      return;
    }

    alert("Account added successfully ✅");

    setAccountName("");
    setBankName("");
    setAccountNumber("");
    setOpeningBalance("");

    loadData();
  }

  async function addTransaction() {
    if (!selectedAccount) {
      alert("Please select an account.");
      return;
    }

    const transactionAmount = Number(amount);

    if (!transactionAmount || transactionAmount <= 0) {
      alert("Valid amount enter karo.");
      return;
    }

    setLoading(true);

    const account = accounts.find((a) => a.id === selectedAccount);

    if (!account) {
      alert("Account not found.");
      setLoading(false);
      return;
    }

    const currentBalance = Number(account.current_balance || 0);

    const newBalance =
      transactionType === "MONEY_IN"
        ? currentBalance + transactionAmount
        : currentBalance - transactionAmount;

    if (newBalance < 0) {
      alert(
        `Insufficient balance. Available balance: ₹${currentBalance.toFixed(2)}`
      );
      setLoading(false);
      return;
    }

    const { data: transaction, error: transactionError } = await supabase
      .from("bank_transactions")
      .insert({
        bank_account_id: selectedAccount,
        transaction_date: transactionDate,
        transaction_type: transactionType,
        amount: transactionAmount,
        payment_mode: paymentMode,
        reference_number: referenceNumber.trim() || null,
        description: description.trim() || null,
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      alert("Transaction save error: " + (transactionError?.message || ""));
      setLoading(false);
      return;
    }

    const { error: balanceError } = await supabase
      .from("bank_accounts")
      .update({
        current_balance: newBalance,
      })
      .eq("id", selectedAccount);

    if (balanceError) {
      await supabase
        .from("bank_transactions")
        .delete()
        .eq("id", transaction.id);

      alert("Balance update error: " + balanceError.message);
      setLoading(false);
      return;
    }

    alert("Transaction saved successfully ✅");

    setAmount("");
    setReferenceNumber("");
    setDescription("");

    await loadData();
    setLoading(false);
  }

  const totalBankBalance = accounts
    .filter((a) => a.account_type === "BANK")
    .reduce((sum, a) => sum + Number(a.current_balance || 0), 0);

  const totalCashBalance = accounts
    .filter((a) => a.account_type === "CASH")
    .reduce((sum, a) => sum + Number(a.current_balance || 0), 0);

  function accountNameById(id: string) {
    return accounts.find((a) => a.id === id)?.account_name || "-";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Bank & Cash
          </h1>
          <p className="mt-1 text-slate-600">
            Manage bank accounts, cash and daily transactions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Total Bank Balance</p>
            <p className="mt-2 text-2xl font-bold text-green-700">
              ₹{totalBankBalance.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Total Cash Balance</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">
              ₹{totalCashBalance.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Total Available</p>
            <p className="mt-2 text-2xl font-bold text-purple-700">
              ₹{(totalBankBalance + totalCashBalance).toFixed(2)}
            </p>
          </div>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Add Bank / Cash Account</h2>

          <div className="grid gap-4 md:grid-cols-4">
            <input
              className="rounded-lg border p-3"
              placeholder="Account Name *"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />

            <input
              className="rounded-lg border p-3"
              placeholder="Bank Name (blank = Cash)"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />

            <input
              className="rounded-lg border p-3"
              placeholder="Account Number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />

            <input
              type="number"
              className="rounded-lg border p-3"
              placeholder="Opening Balance"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
          </div>

          <button
            onClick={addAccount}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            + Add Account
          </button>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Add Transaction</h2>

          <div className="grid gap-4 md:grid-cols-4">
            <select
              className="rounded-lg border p-3"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <option value="">Select Account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                </option>
              ))}
            </select>

            <select
              className="rounded-lg border p-3"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
            >
              <option value="MONEY_IN">Money In</option>
              <option value="MONEY_OUT">Money Out</option>
            </select>

            <input
              type="number"
              className="rounded-lg border p-3"
              placeholder="Amount *"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <input
              type="date"
              className="rounded-lg border p-3"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />

            <select
              className="rounded-lg border p-3"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
              <option>Other</option>
            </select>

            <input
              className="rounded-lg border p-3"
              placeholder="Reference Number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />

            <input
              className="rounded-lg border p-3 md:col-span-2"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button
            onClick={addTransaction}
            disabled={loading}
            className="mt-4 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Transaction"}
          </button>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Accounts</h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-3">Account</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Bank</th>
                  <th className="p-3">Account No.</th>
                  <th className="p-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b">
                    <td className="p-3 font-semibold">
                      {account.account_name}
                    </td>
                    <td className="p-3">{account.account_type}</td>
                    <td className="p-3">{account.bank_name || "-"}</td>
                    <td className="p-3">{account.account_number || "-"}</td>
                    <td className="p-3 font-semibold">
                      ₹{Number(account.current_balance || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {!accounts.length && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No accounts added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Transaction History</h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-3">Date</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b">
                    <td className="p-3">{transaction.transaction_date}</td>
                    <td className="p-3">
                      {accountNameById(transaction.bank_account_id)}
                    </td>
                    <td
                      className={`p-3 font-semibold ${
                        transaction.transaction_type === "MONEY_IN"
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {transaction.transaction_type === "MONEY_IN"
                        ? "Money In"
                        : "Money Out"}
                    </td>
                    <td className="p-3 font-semibold">
                      ₹{Number(transaction.amount || 0).toFixed(2)}
                    </td>
                    <td className="p-3">
                      {transaction.payment_mode || "-"}
                    </td>
                    <td className="p-3">
                      {transaction.reference_number || "-"}
                    </td>
                    <td className="p-3">
                      {transaction.description || "-"}
                    </td>
                  </tr>
                ))}

                {!transactions.length && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No transactions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
