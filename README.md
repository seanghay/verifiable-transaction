# Verifiable Transaction via QR Code

A simple Offline and Decentralized solution for verifying payment transactions without relying on transaction screenshots.

### 1. Problem Statement

When making payments through mobile banking apps, salespeople/cashier often ask customers to take screenshots of successful transactions. This practice exists because salespeople, unlike the account holders, don't receive transaction notifications or have access to account information. They rely on these screenshots as proof of payment.

However, this creates a security risk: salespeople/cashier have no reliable way to verify whether a transaction screenshot is genuine or has been edited, as they're only seeing an image of the payment screen rather than accessing the actual transaction data.


### 2. Proposed Solution


We propose implementing a QR code system that contains a signed transaction within the mobile banking app's transaction screen, enabling offline verification.

A typical transaction would be structured as follows:

```js
{
  currency: 'USD',
  amount: 10.2,
  remark: 'Payment for service',
  created_at: '2024-11-18T07:13:42.582Z'
}
```


#### 2.1 Transaction Signing

The following code demonstrates how to create a digital signature for the transaction:


```js
import { readFile } from "node:fs/promises";
import { createSign, createVerify } from "node:crypto";

const ALGORITHM = "sha256";

export function createTransaction(privateKey) {
  const value = {
    currency: "USD",
    amount: 10.2,
    remark: "Payment for service",
    created_at: new Date().toISOString(),
  };

  const signer = createSign(ALGORITHM);
  signer.update(JSON.stringify(value));
  const signature = signer.sign(Buffer.from(privateKey), "base64");
  value.signature = signature;
  return value;
}


const privateKey = await readFile("private.pem", "utf8");
const transaction = createTransaction(privateKey);
```

This signing process must be executed server-side. Each account can have its own unique `privateKey` and `publicKey` pair.

The `createTransaction()` function, when executed with a `privateKey`, generates a signed transaction object:

```js
{
  currency: 'USD',
  amount: 10.2,
  remark: 'Payment for service',
  created_at: '2024-11-18T08:10:02.031Z',
  signature: 'WYdD268/BhNOsN+OcSa59bL1kILsCVbCDYeOqEiI+cTe/ksTfO5KCYV3nBFfJa7E26rEVkXEA8odSP0o6pJQQp5/DVuSmiT5M9vELTtoG9WitI2FROs+r/VltBO2Dm6ZSAYlUTrKxDfF6Qof5p9wnZhIMI53Jv2jCh0oZ6HKY/uSQrAjTP52bnxzt0b0+xJknGwxCphgzTOBWdeeHNU8XZ2OZEiKou7Dz4n4+tXunQH4RkZMzdP02fIyyfXgRDpcH7/grwE9f7ThLfTOFHYlVE3M/6mS5KoenGP6wJ3w1MSaqhdwJ3N3GGDoevy+sUi+xSspYwPGryyQbDxPiZmt/g=='
}
```

The `signature` field serves as the verification token for the transaction.

The QR Code will be

<img src="qrcode.png" width=300>


#### 2.1 Verification

The verification process requires the account owner's `publicKey`, which can be obtained through the mobile banking application:

```js
export function verifyTransaction(transaction, publicKey) {
  const verifier = createVerify(ALGORITHM);
  const { signature, ...value } = transaction;
  verifier.update(JSON.stringify(value));

  const currentDate = new Date();
  const created_at = new Date(value.created_at);

  const maximumWindowMs = 5 * 60 * 1000; // 5 mins

  // validate the transaction time, if it exceeds 5 minutes, it's considered invalid.
  if (currentDate - created_at >= maximumWindowMs) {
    return false;
  }

  return verifier.verify(
    Buffer.from(publicKey),
    Buffer.from(signature, "base64"),
  );
}

const publicKey = await readFile("public.pem", "utf8");
const isVerified = verifyTransaction(transaction, publicKey);

console.log({ isVerified });
// => { isVerified: true }
```


The `maximumWindowMs` parameter sets a time limit for transaction validity. In this implementation, transactions older than 5 minutes are automatically invalidated, adding an extra layer of security.
