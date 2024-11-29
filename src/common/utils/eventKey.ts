import { ethers } from "ethers";
import { AES, enc } from "crypto-js";

function generateEventKey() {
  return ethers.Wallet.createRandom().privateKey;
}

function encryptQrCodePayload(data: ITicketQrCodePayload, eventKey: string) {
  const jsonString = JSON.stringify(data);
  return AES.encrypt(jsonString, eventKey).toString();
}

function decryptQrCodePayload(encryptedData: string, eventKey: string): ITicketQrCodePayload {
  const bytes = AES.decrypt(encryptedData, eventKey);
  const decryptedData = bytes.toString(enc.Utf8);
  return JSON.parse(decryptedData);
}

export { generateEventKey, encryptQrCodePayload, decryptQrCodePayload };
