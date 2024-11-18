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

const privateKey = await readFile("private.pem", "utf8");
const transaction = createTransaction(privateKey);

console.log(transaction);

const publicKey = await readFile("public.pem", "utf8");
const isVerified = verifyTransaction(transaction, publicKey);

console.log({ isVerified });
