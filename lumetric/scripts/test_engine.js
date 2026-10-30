// Test realistic growth and OPEX scaling
const initialCash = 250000;
const monthlyRevenue = 12000;
const initialGrowth = 0.075; // 7.5%
const grossMargin = 0.75;
const baseOpex = 26000;
const loanPayment = 1566; // $50k loan @ 8% for 36m
const treasuryApy = 0.048;

let cash = initialCash;
let rev = monthlyRevenue;
let breakevenMonth = null;
let zeroCashMonth = null;

console.log('Month | Revenue   | Gross Prof| OPEX      | Debt Svc  | Net P&L   | Ending Cash');
console.log('-------------------------------------------------------------------------');

for (let m = 1; m <= 36; m++) {
  // Growth decay
  const growthRate = Math.max(0.02, initialGrowth * Math.pow(0.985, m - 1));
  if (m > 1) {
    rev = rev * (1 + growthRate);
  }
  const grossProfit = rev * grossMargin;
  const incrementalRev = Math.max(0, rev - monthlyRevenue);
  const opex = baseOpex * Math.pow(1.008, m - 1) + (incrementalRev * 0.18);
  const treasuryYield = (Math.max(0, cash) * 0.7 * treasuryApy) / 12;
  const netBurn = (opex + loanPayment) - (grossProfit + treasuryYield);
  const netEbitda = grossProfit - opex;

  cash -= netBurn;

  if (grossProfit >= (opex + loanPayment) && breakevenMonth === null) {
    breakevenMonth = m;
  }
  if (cash <= 0 && zeroCashMonth === null) {
    zeroCashMonth = m;
  }

  if (m <= 6 || m === 12 || m === 18 || m === 24 || m === 36) {
    const pad = (n) => String(Math.round(n)).padStart(9);
    console.log(`M${String(m).padStart(2)}  | ${pad(rev)} | ${pad(grossProfit)} | ${pad(opex)} | ${pad(loanPayment)} | ${pad(-netBurn)} | ${pad(cash)}`);
  }
}

console.log('-------------------------------------------------------------------------');
console.log(`Breakeven Month: ${breakevenMonth ? 'Month ' + breakevenMonth : 'Not within 36m'}`);
console.log(`Insolvency Month: ${zeroCashMonth ? 'Month ' + zeroCashMonth : 'Self-Sustaining / Survived!'}`);
const endingARR = rev * 12;
console.log(`Ending ARR (Month 36): $${Math.round(endingARR).toLocaleString()}`);
console.log(`Exit Valuation @ 8x ARR: $${Math.round(endingARR * 8).toLocaleString()}`);
