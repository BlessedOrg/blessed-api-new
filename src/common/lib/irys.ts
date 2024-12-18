import { Uploader } from "@irys/upload";
import { BaseEth } from "@irys/upload-ethereum";
import { calculateBase64FileSize } from "@/utils/calculateBase64FileSize";
import { envVariables } from "@/common/env-variables";

const getIrysUploader = async () =>
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
    console.log(`Size of image in MB: ${size / 1024 / 1024}`);
  }
  irys.fund(price);
  try {
    const receipt = await irys.upload(
      Buffer.from(base64String, "base64"),
      {
        tags: [
          { name: "content-type", value: "image/png" }
        ]
      }
    );
    return {
      metadataImageUrl: `https://gateway.irys.xyz/${receipt.id}`,
      priceWei: price.toString()
    };
  } catch (error) {
    console.log("Whole error", error);
    console.log(`🚨 Error while uploading image via Irys: ${error.messsage}`);
    throw new Error(`🚨 Error while uploading image via Irys: ${error.messsage}`);
  }
};

const uploadFile = async ({ name, description, symbol, image }: Metadata) => {
  const irys = await getIrysUploader();
  const stringToBase64 = Buffer.from(JSON.stringify({
    name,
    description,
    symbol,
    image
  })).toString("base64");
  const size = calculateBase64FileSize(stringToBase64);
  const price = await irys.getPrice(size);

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
    return {
      metadataUrl: `https://gateway.irys.xyz/${receipt.id}`,
      priceWei: price.toString()
    };
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
  const { metadataImageUrl, priceWei } = await uploadImage(image);
  const { metadataUrl, priceWei: priceWei2 } = await uploadFile({ name, symbol, description, image: metadataImageUrl });

  const totalWeiPrice = BigInt(Number(priceWei) + Number(priceWei2)).toString();

  return {
    metadataImageUrl,
    metadataUrl,
    totalWeiPrice
  };
};
