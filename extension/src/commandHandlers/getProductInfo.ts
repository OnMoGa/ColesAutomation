import { ProductPageDetails, TrolleyItem } from "../../../shared/protocol";
import { COLES_ORIGIN, navigateTo } from "../colesDom";
import { CurrentOrderDetails, CurrentOrderItem, FullProduct } from "../colesTypes";
import { FetchInterceptedMessage } from "../injected/fetchHook";
import { NextRequestData } from "../nextData";
import { waitForFetchMessage } from "../waitForFetchMessage";

export interface ProductPageProps {
  product: FullProduct;
}

export const getProductInfo = async (productId: string): Promise<ProductPageDetails> => {
  var waitForMessageTask = waitForFetchMessage(isMessageForProductInfo(productId));
  await navigateTo(`${COLES_ORIGIN}/product/${productId}`);
  var nextData = (await waitForMessageTask) as NextRequestData<ProductPageProps>;

  var product = nextData.pageProps.product;
  return {
    productId: product.id.toString(),
    name: product.name,
    brand: product.brand,
    description: product.description,
    longDescription: product.longDescription,
    size: product.size,
    unitPrice: product.pricing?.now ?? undefined,
    productUrl: location.href,
    categoryIds: [
      ...new Set(product.onlineHeirs.flatMap((heir) => [heir.categoryId, heir.subCategoryId, heir.aisleId])),
    ],
  };
};

const isMessageForProductInfo = (productId: string): ((message: FetchInterceptedMessage) => boolean) => {
  return (message: FetchInterceptedMessage) =>
    message.url.match(`-${productId}.json`) !== null && message.method === "GET";
};
