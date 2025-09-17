require('dotenv').config();
const mongoose   = require('mongoose');
const bcrypt     = require('bcrypt');

async function main() {
  // 1) Connect
  const conn = await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser:    true,
    useUnifiedTopology: true,
    dbName: 'bankingchat',
  });
  console.log('✅ Connected to MongoDB');

  // 2) Wipe
  await conn.connection.db.dropDatabase();
  console.log('🗑 Dropped existing database');

  // 3) Schemas
  const userSchema = new mongoose.Schema({
    email:        String,
    passwordHash: String,
  });

  const accountSchema = new mongoose.Schema({
    userId:        String,
    type:          { type: String, enum: ['checking','savings','credit'] },
    balance:       Number,
    accountNumber: String,
  });

  const transactionSchema = new mongoose.Schema({
    userId:        String,
    accountType:   { type: String, enum: ['checking','savings','credit'] },
    accountNumber: String,
    amount:        Number,
    category:      String,
    date:          Date,
  });

  const User        = mongoose.model('User', userSchema);
  const Account     = mongoose.model('Account', accountSchema);
  const Transaction = mongoose.model('Transaction', transactionSchema);

  // 4) Create users
  const rawUsers = [
    { email: 'alice@example.com', password: 'password123' },
    { email: 'bob@example.com',   password: 'letmein456'  },
    { email: 'carol@example.com', password: 's3cur3p4ss!'  },
  ];
  const users = [];
  for (const u of rawUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    const user = await User.create({ email: u.email, passwordHash: hash });
    console.log(`👤 Created user ${u.email}`);
    users.push(user);
  }

  // 5) Parameters for how many accounts of each type
  const minAccounts = 1;
  const maxAccounts = 3;

  // helper gens
  const makeAcctNum = () => Array(12).fill(0).map(_=>Math.floor(Math.random()*10)).join('');
  const getRandom    = (min, max) => Math.floor(Math.random()*(max-min+1))+min;

  // 6) Seed Accounts: multiple checking & savings, one credit
  for (const user of users) {
    const toCreate = [];

    // multiple checking
    const nChk = getRandom(minAccounts, maxAccounts);
    for (let i=0; i<nChk; i++){
      toCreate.push({
        userId:        user._id.toString(),
        type:          'checking',
        balance:       getRandom(500, 5000),
        accountNumber: makeAcctNum(),
      });
    }

    // multiple savings
    const nSav = getRandom(minAccounts, maxAccounts);
    for (let i=0; i<nSav; i++){
      toCreate.push({
        userId:        user._id.toString(),
        type:          'savings',
        balance:       getRandom(1000, 20000),
        accountNumber: makeAcctNum(),
      });
    }

    // always at least one credit
    toCreate.push({
      userId:        user._id.toString(),
      type:          'credit',
      balance:       getRandom(-2000, -100),
      accountNumber: makeAcctNum(),
    });

    await Account.insertMany(toCreate);
    console.log(`💰 Created ${nChk} checking, ${nSav} savings & 1 credit for ${user.email}`);
  }

  // 7) Transactions
  const categories   = ['groceries','utilities','dining','entertainment','rent','salary','fuel','shopping','subscription','coffee'];
  const now          = Date.now();
  const allAccounts  = await Account.find();

  for (const user of users) {
    const yourAccts = allAccounts.filter(a => a.userId === user._id.toString());
    const txs       = [];

    for (let i=0; i<200; i++) {
      const daysAgo = getRandom(0, 59);
      const date    = new Date(now - daysAgo*24*60*60*1000);
      const category= randomFrom(categories);

      // pick one of this user's accounts
      let acct = randomFrom(yourAccts);
      let amount;
      if (category === 'salary') {
        acct   = yourAccts.find(a => a.type==='checking');
        amount = getRandom(2000, 5000);
      } else {
        amount = -getRandom(5, acct.type==='credit'?500:200);
      }

      txs.push({
        userId:        user._id.toString(),
        accountType:   acct.type,
        accountNumber: acct.accountNumber,
        amount,
        category,
        date,
      });
    }

    await Transaction.insertMany(txs);
    console.log(`📝 Created ${txs.length} transactions for ${user.email}`);
  }

  console.log('✅ Seeding complete');
  process.exit(0);
}

// helper
function randomFrom(arr) {
  return arr[Math.floor(Math.random()*arr.length)];
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
