import { Uploader } from "@irys/upload";
import { BaseEth } from "@irys/upload-ethereum";
import { calculateBase64FileSize } from "@/utils/calculateBase64FileSize";
import { envVariables } from "@/common/env-variables";

export const getIrysUploader = async () =>
  Uploader(BaseEth)
    .withWallet(process.env.ONCHAIN_STORAGE_OPERATOR_PRIVATE_KEY)
    .withRpc("https://sepolia.base.org")
    .devnet();

const uploadImage = async (base64String) => {
  const irys = await getIrysUploader();
  const size = calculateBase64FileSize(base64String);
  const price = await irys.getPrice(size);
  if (envVariables.isDevelopment) {
    console.log(`Price for uploading image in ETH: ${irys.utils.fromAtomic(price)}`);
    console.log(`Size of image in bytes: ${size}`);
    console.log(`Size of image in KB: ${size / 1024}`);
    console.log(`Size of image in MB: ${size / 1024 / 1024}`);
  }
  await irys.fund(price);
  try {
    const receipt = await irys.upload(
      Buffer.from(base64String, "base64"),
      {
        tags: [
          { name: "content-type", value: "image/png" }
        ]
      }
    );

    return `https://gateway.irys.xyz/${receipt.id}`;
  } catch (error) {
    console.log("Whole error", error);
    console.log(`🚨 Error while uploading image via Irys: ${error.messsage}`);
    throw new Error(`🚨 Error while uploading image via Irys: ${error.messsage}`);
  }
};

export const uploadFile = async ({ name, description, symbol, image }: Metadata) => {
  const irys = await getIrysUploader();
  try {
    const receipt = await irys.upload(
      JSON.stringify({
        name,
        description,
        symbol,
        image
      }),
      {
        tags: [
          { name: "content-type", value: "application/json" }
        ]
      }
    );
    return `https://gateway.irys.xyz/${receipt.id}`;
  } catch (error) {
    console.log(`🚨 Error while uploading JSON via Irys: ${error.messsage}`);
    throw new Error(`🚨 Error while uploading JSON via Irys: ${error.messsage}`);
  }
};

interface Metadata {
  name: string;
  symbol?: string;
  description?: string;
  image: string; // Base64 encoded image string
}

export const uploadMetadata = async ({ name, symbol, description, image }: Metadata) => {
  const metadataImageUrl = await uploadImage(image);
  const metadataUrl = await uploadFile({ name, symbol, description, image: metadataImageUrl });
  return {
    metadataImageUrl,
    metadataUrl
  };
};
